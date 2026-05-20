const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a family administration assistant. Analyse incoming emails and extract structured information.

You must respond with valid JSON only, no other text.

Categories available: Thomas, Matthew, Household
(Multiple categories are allowed if the email concerns more than one)

For tags: generate short, descriptive tags (e.g. "scouts", "rugby", "gas bill", "school", "piano", "medical").
Use lowercase, concise. Multiple tags allowed.

If there is no clear action required, set is_fyi_only to true and leave action null.`;

const USER_TEMPLATE = (subject, from, body) => `
Analyse this email and return JSON with this exact structure:
{
  "summary": "1-2 sentence summary of what the email is about",
  "action": "specific thing that needs to be done, or null if FYI only",
  "due_date": "YYYY-MM-DD or null if no date mentioned",
  "is_fyi_only": true or false,
  "categories": ["Thomas", "Matthew", "Household"] (include all that apply),
  "tags": ["tag1", "tag2"] (short descriptive tags)
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

  let response;
  try {
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: USER_TEMPLATE(email.subject, `${email.from_name} <${email.from_address}>`, truncatedBody),
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

  // Determine assignee: use default from first tag that has one
  const assigneeId = tagIds.find(t => t.defaultAssigneeId)?.defaultAssigneeId || null;

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
