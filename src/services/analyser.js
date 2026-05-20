const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a family administration assistant. Analyse incoming emails and extract structured information.

You must respond with valid JSON only, no other text.

Categories available: Thomas, Matthew, Household (use whichever apply — multiple allowed)

For tags: generate short, descriptive tags (e.g. "scouts", "rugby", "gas bill", "school", "piano", "medical").
Use lowercase, concise. Multiple tags allowed.

## Deciding is_fyi_only vs actionable

Set is_fyi_only = true (no action needed) for:
- Newsletters, updates, and general information emails
- Receipts and payment confirmations (payment already made)
- Booking or order confirmations (already booked)
- Delivery notifications and shipping updates
- Automated statements where no response is needed
- Notifications that something has been processed or completed
- Marketing and promotional emails
- School/club newsletters and term updates
- Any email where reading it is the only thing required

Set is_fyi_only = false (action required) only when the family must DO something specific:
- A payment is due or overdue
- A form must be signed and returned
- A decision or booking must be made
- A reply or response is explicitly requested
- Consent is required
- Attendance must be confirmed or declined
- Something must be collected, dropped off, or arranged
- A deadline is approaching and inaction has a consequence

When in doubt, default to is_fyi_only = true. It is better to under-flag than to treat everything as urgent.

If is_fyi_only is true, action must be null.`;

const USER_TEMPLATE = (subject, from, body, userNames) => `
Analyse this email and return JSON with this exact structure:
{
  "sender": "the organisation or person who sent this email (e.g. 'Thames Water', '3rd Hitchin Scouts', 'Mrs Clarke - Geography'). Use the real name, not the email address. If it is a person at an organisation, prefer the organisation name.",
  "summary": "1-2 sentence summary of what the email is about",
  "action": "specific thing that needs to be done, or null if FYI only",
  "due_date": "YYYY-MM-DD or null if no date mentioned",
  "is_fyi_only": true or false,
  "categories": ["Thomas", "Matthew", "Household"] (use only these values, include all that apply),
  "tags": ["tag1", "tag2"] (short descriptive tags),
  "assignee": "name of the person who should action this, or null if unclear. Choose from: ${userNames}. Prefer a parent (adult) unless the action is clearly something only a child would do themselves. If the email is just informational or a child-related task that a parent must handle, assign to a parent."
}

From: ${from}
Subject: ${subject}

${body}
`.trim();

async function analyseEmail(emailId) {
  const [rows] = await db.query('SELECT * FROM emails WHERE id = ?', [emailId]);
  const email = rows[0];
  if (!email) throw new Error(`Email ${emailId} not found`);

  const body = email.body_text || email.body_html?.replace(/<[^>]+>/g, ' ') || '';
  const truncatedBody = body.slice(0, 4000); // Stay well within token limits

  const [userRows] = await db.query('SELECT id, name FROM users ORDER BY id');
  const userNames = userRows.map(u => u.name).join(', ');

  let response;
  try {
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: USER_TEMPLATE(email.subject, `${email.from_name} <${email.from_address}>`, truncatedBody, userNames),
        },
      ],
    });
    // Clear any previous API error flag on success
    await db.query(
      'INSERT INTO settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?, updated_at = NOW()',
      ['claude_api_error', '', '']
    ).catch(() => {});
  } catch (err) {
    const status = err?.status || err?.statusCode;
    const isQuotaError = status === 429 || status === 529 || status === 503 ||
      (err?.message || '').toLowerCase().includes('credit') ||
      (err?.message || '').toLowerCase().includes('quota') ||
      (err?.message || '').toLowerCase().includes('overloaded');
    if (isQuotaError) {
      const msg = `Claude API error (${status || 'unknown'}): ${err.message}`;
      await db.query(
        'INSERT INTO settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?, updated_at = NOW()',
        ['claude_api_error', msg, msg]
      ).catch(() => {});
    }
    throw err;
  }

  let analysis;
  try {
    const raw = response.content[0].text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    analysis = JSON.parse(raw);
  } catch {
    throw new Error(`Claude returned invalid JSON: ${response.content[0].text}`);
  }

  // Store extracted sender name on the email
  if (analysis.sender) {
    await db.query('UPDATE emails SET sender = ? WHERE id = ?', [analysis.sender, emailId]);
  }

  // Resolve/create tags
  const tagIds = [];
  for (const tagName of (analysis.tags || [])) {
    const normalised = tagName.toLowerCase().trim();
    const [existing] = await db.query('SELECT id, default_assignee_id FROM tags WHERE name = ?', [normalised]);
    let tagId, defaultAssigneeId;

    if (existing.length > 0) {
      tagId = existing[0].id;
      defaultAssigneeId = existing[0].default_assignee_id;
    } else {
      const [ins] = await db.query('INSERT INTO tags (name, approved) VALUES (?, ?)', [normalised, false]);
      tagId = ins.insertId;
      defaultAssigneeId = null;
    }
    tagIds.push({ tagId, defaultAssigneeId });
  }

  // Resolve categories
  const categoryIds = [];
  for (const catName of (analysis.categories || [])) {
    const [rows] = await db.query('SELECT id FROM categories WHERE name = ?', [catName]);
    if (rows.length > 0) categoryIds.push(rows[0].id);
  }

  // Determine assignee: prefer Claude's suggestion, fall back to tag defaults
  let assigneeId = null;
  if (analysis.assignee) {
    const suggested = userRows.find(u => u.name.toLowerCase() === analysis.assignee.toLowerCase());
    if (suggested) assigneeId = suggested.id;
  }
  if (!assigneeId) {
    assigneeId = tagIds.find(t => t.defaultAssigneeId)?.defaultAssigneeId || null;
  }

  // Insert task
  const [taskResult] = await db.query(
    `INSERT INTO tasks (email_id, summary, action, due_date, is_fyi_only, assignee_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      emailId,
      analysis.summary,
      analysis.action || null,
      analysis.due_date || null,
      analysis.is_fyi_only ? 1 : 0,
      assigneeId,
    ]
  );
  const taskId = taskResult.insertId;

  // Link categories
  for (const catId of categoryIds) {
    await db.query('INSERT IGNORE INTO task_categories (task_id, category_id) VALUES (?, ?)', [taskId, catId]);
  }

  // Link tags
  for (const { tagId } of tagIds) {
    await db.query('INSERT IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)', [taskId, tagId]);
  }

  // Mark email processed
  await db.query('UPDATE emails SET processed = 1 WHERE id = ?', [emailId]);

  console.log(`Email ${emailId} processed → task ${taskId}`);
  return taskId;
}

module.exports = { analyseEmail };
