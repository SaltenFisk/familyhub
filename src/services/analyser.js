const Anthropic = require('@anthropic-ai/sdk');
const mammoth = require('mammoth');
const db = require('../db');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a family administration assistant. Analyse incoming emails and extract structured information.

You must respond with valid JSON only, no other text.

Categories available: Darren, Lorraine, Thomas, Matthew (use whichever apply — multiple allowed)

## Assigning categories ("who")

Categories represent who the email is relevant to — not who must action it.

IMPORTANT: Base categories on who is explicitly named or addressed in the email, not on the activity or club mentioned.

- If the email is addressed to "Darren", include "Darren". If addressed to "Lorraine", include "Lorraine".
- Use "Thomas" only if Thomas is explicitly named or referenced in the email content.
- Use "Matthew" only if Matthew is explicitly named or referenced in the email content.
- Activities like taekwondo, scouts, swimming, or rugby may involve multiple family members. Do not assume an activity belongs to a specific child — only include a child if they are named.
- A booking or order in a parent's name belongs to that parent, even if it relates to a child's activity.
- If an email is relevant to the whole family (e.g. a holiday, a broadband bill), include all relevant members.
- Multiple categories are fine and encouraged when genuinely relevant to more than one person.

For tags: generate short, descriptive tags (e.g. "scouts", "rugby", "gas bill", "school", "piano", "medical").
Use lowercase, concise. Multiple tags allowed.

## Classifying emails: action, upcoming, or FYI

Every email is exactly one of three types. Set the flags accordingly:

### is_upcoming = true (event to be aware of)
Use when the email confirms or announces a specific future event with a date — something the family needs to show up for or remember:
- A confirmed booking (camp, trip, appointment, match, concert, event)
- A school trip or activity on a specific date
- A reminder of an upcoming event already arranged
- A calendar invite or meeting request (BEGIN:VCALENDAR / .ics) — ALWAYS classify these as is_upcoming
- Set event_date to the date of the event (YYYY-MM-DD)
- Set is_fyi_only = false, action = null when is_upcoming = true

### is_fyi_only = true (information only, no event)
Use when the email is purely informational with no specific future event date:
- Newsletters, updates, general information
- Receipts and payment confirmations (payment already made, no event)
- Delivery notifications and shipping updates
- Automated statements
- Marketing and promotional emails
- Notifications that something has been processed

### is_fyi_only = false, is_upcoming = false (action required)
Use only when the family must DO something specific:
- A payment is due or overdue
- A form must be signed and returned
- A decision or booking must be made
- A reply or response is explicitly requested
- Consent is required
- Attendance must be confirmed or declined
- A deadline is approaching and inaction has a consequence

When in doubt between action and FYI, default to is_fyi_only = true.
If is_upcoming is true, set is_fyi_only = false and action = null.`;

const USER_TEMPLATE = (subject, from, body, userNames) => `
Analyse this email and return JSON with this exact structure:
{
  "sender": "the organisation or person who sent this email (e.g. 'Thames Water', '3rd Hitchin Scouts', 'Mrs Clarke - Geography'). Use the real name, not the email address. If it is a person at an organisation, prefer the organisation name.",
  "summary": "1-2 sentence summary of what the email is about",
  "action": "specific thing that needs to be done, or null if FYI or upcoming",
  "due_date": "YYYY-MM-DD or null — deadline by which an action must be completed",
  "is_upcoming": true or false,
  "event_date": "YYYY-MM-DD or null — the date of the event itself, only set when is_upcoming is true",
  "is_fyi_only": true or false,
  "categories": ["Darren", "Lorraine", "Thomas", "Matthew"] (use only these values, include all that apply),
  "tags": ["tag1", "tag2"] (short descriptive tags),
  "assignee": "name of the person who should action this, or null if unclear. Choose from: ${userNames}. Base this primarily on who the email is addressed to by name. If it is addressed to a specific person, assign to them. If addressed generically (e.g. 'Dear Parent') and action is needed, prefer a parent. Only assign to a child if the child is explicitly the one who needs to act."
}

From: ${from}
Subject: ${subject}

${body}
`.trim();

function parseIcs(icsText) {
  const get = (key) => {
    // Handles both plain VALUE and VALUE;TZID=... variants
    const m = icsText.match(new RegExp(`^${key}(?:;[^:]*)?:(.+)$`, 'm'));
    return m ? m[1].trim() : null;
  };

  const parseIcsDate = (raw) => {
    if (!raw) return null;
    // TZID form: 20260714T090000 or date-only: 20260714
    const digits = raw.replace(/[TZ]/g, '');
    const d = digits.replace(/^(\d{4})(\d{2})(\d{2}).*/, '$1-$2-$3');
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  };

  const unfold = (s) => s.replace(/\r?\n[ \t]/g, '');
  const unescapeIcs = (s) => s.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');

  const text = unfold(icsText);
  const summary = get('SUMMARY');
  const description = get('DESCRIPTION');
  // Apple uses X-APPLE-STRUCTURED-LOCATION as well as LOCATION
  const location = get('LOCATION') || get('X-APPLE-STRUCTURED-LOCATION');
  const organizer = get('ORGANIZER');
  const dtstart = parseIcsDate(get('DTSTART'));
  const dtend = parseIcsDate(get('DTEND'));

  const parts = [];
  if (summary) parts.push(`Event: ${unescapeIcs(summary)}`);
  if (dtstart) parts.push(`Date: ${dtstart}${dtend && dtend !== dtstart ? ` to ${dtend}` : ''}`);
  if (location) parts.push(`Location: ${unescapeIcs(location)}`);
  if (organizer) parts.push(`Organiser: ${organizer.replace(/^mailto:/i, '')}`);
  if (description) parts.push(`Details: ${unescapeIcs(description).slice(0, 1000)}`);

  return { text: parts.join('\n'), eventDate: dtstart };
}

async function buildAttachmentContent(attachments) {
  const blocks = [];
  for (const att of attachments) {
    const ct = (att.contentType || '').toLowerCase();
    const filename = att.filename || '';
    const buf = att.content; // Buffer
    if (!buf || buf.length === 0) continue;

    if (ct === 'text/calendar' || ct === 'application/ics' || filename.toLowerCase().endsWith('.ics')) {
      try {
        const icsText = buf.toString('utf8');
        const { text } = parseIcs(icsText);
        if (text) {
          blocks.push({ type: 'text', text: `\n\n[Calendar Invite]\n${text}` });
        }
      } catch (err) {
        console.warn(`Failed to parse ICS attachment ${filename}:`, err.message);
      }
      continue;
    }

    if (ct === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
      // Claude natively understands PDFs as document blocks (limit ~10MB but stay conservative)
      if (buf.length > 8 * 1024 * 1024) {
        console.log(`Skipping large PDF attachment: ${filename} (${buf.length} bytes)`);
        continue;
      }
      blocks.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') },
        title: filename || 'attachment.pdf',
      });
    } else if (
      ct === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ct === 'application/msword' ||
      filename.toLowerCase().endsWith('.docx') ||
      filename.toLowerCase().endsWith('.doc')
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer: buf });
        const text = result.value?.trim();
        if (text) {
          blocks.push({
            type: 'text',
            text: `\n\n[Attachment: ${filename || 'document'}]\n${text.slice(0, 6000)}`,
          });
        }
      } catch (err) {
        console.warn(`Failed to extract text from ${filename}:`, err.message);
      }
    }
  }
  return blocks;
}

async function analyseEmail(emailId, attachments = []) {
  const [rows] = await db.query('SELECT * FROM emails WHERE id = ?', [emailId]);
  const email = rows[0];
  if (!email) throw new Error(`Email ${emailId} not found`);

  let body = email.body_text || email.body_html?.replace(/<[^>]+>/g, ' ') || '';

  // If the body is (or contains) an inline calendar invite, extract and prepend structured data
  if (body.includes('BEGIN:VCALENDAR')) {
    const vcStart = body.indexOf('BEGIN:VCALENDAR');
    const vcEnd = body.indexOf('END:VCALENDAR');
    const icsRaw = vcEnd > -1 ? body.slice(vcStart, vcEnd + 'END:VCALENDAR'.length) : body.slice(vcStart);
    const { text: icsFormatted } = parseIcs(icsRaw);
    if (icsFormatted) {
      body = `[Calendar Invite]\n${icsFormatted}\n\n${body.slice(0, 2000)}`;
    }
  }

  const truncatedBody = body.slice(0, 4000); // Stay well within token limits

  const [userRows] = await db.query('SELECT id, name FROM users ORDER BY id');
  const userNames = userRows.map(u => u.name).join(', ');

  // Build content: main text prompt + any attachment blocks
  const attachmentBlocks = await buildAttachmentContent(attachments);
  const userContent = attachmentBlocks.length > 0
    ? [{ type: 'text', text: USER_TEMPLATE(email.subject, `${email.from_name} <${email.from_address}>`, truncatedBody, userNames) }, ...attachmentBlocks]
    : USER_TEMPLATE(email.subject, `${email.from_name} <${email.from_address}>`, truncatedBody, userNames);

  if (attachmentBlocks.length > 0) {
    console.log(`Email ${emailId}: including ${attachmentBlocks.length} attachment(s) in analysis`);
  }

  let response;
  try {
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userContent,
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

  const isUpcoming = analysis.is_upcoming ? 1 : 0;
  const isFyi = isUpcoming ? 0 : (analysis.is_fyi_only ? 1 : 0);

  // Insert task
  const [taskResult] = await db.query(
    `INSERT INTO tasks (email_id, summary, action, due_date, is_fyi_only, is_upcoming, event_date, assignee_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      emailId,
      analysis.summary,
      analysis.action || null,
      analysis.due_date || null,
      isFyi,
      isUpcoming,
      analysis.event_date || null,
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
