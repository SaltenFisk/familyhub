const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const db = require('../db');
const { analyseEmail } = require('./analyser');

function normaliseSubject(subject) {
  return (subject || '')
    .replace(/^(fwd?|re)\s*:\s*/gi, '')
    .trim()
    .toLowerCase();
}

function extractOriginalSender(parsed) {
  // Try structured headers first (some mail clients set these on forwards)
  const replyTo = parsed.replyTo?.value?.[0]?.address;
  if (replyTo) return replyTo.toLowerCase();

  // Scan plain-text body for forwarded message header block
  const text = parsed.text || '';
  // Match patterns like:
  //   From: Name <email@example.com>
  //   From: email@example.com
  // appearing after a "---------- Forwarded message ----------" or "-----Original Message-----" divider
  const forwardDivider = /(-{3,}\s*(forwarded\s+message|original\s+message)\s*-{3,}|begin\s+forwarded\s+message)/i;
  const dividerMatch = forwardDivider.exec(text);
  const searchText = dividerMatch ? text.slice(dividerMatch.index) : text;

  const fromLine = /^from:\s*.*?([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/im.exec(searchText);
  if (fromLine) return fromLine[1].toLowerCase();

  // Fall back to envelope sender
  return (parsed.from?.value?.[0]?.address || '').toLowerCase();
}

async function pollMailbox() {
  const client = new ImapFlow({
    host: process.env.IMAP_HOST,
    port: Number(process.env.IMAP_PORT) || 993,
    secure: true,
    auth: {
      user: process.env.IMAP_USER,
      pass: process.env.IMAP_PASSWORD,
    },
    logger: false,
  });

  const newEmailIds = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      for await (const msg of client.fetch('1:*', { envelope: true, source: true, flags: true })) {
        const parsed = await simpleParser(msg.source);
        const messageId = parsed.messageId || `${msg.uid}@familyhub`;

        // Skip if this exact message was already stored
        const [existingMsg] = await db.query('SELECT id FROM emails WHERE message_id = ?', [messageId]);
        if (existingMsg.length > 0) continue;

        const normSubject = normaliseSubject(parsed.subject);
        const originalFrom = extractOriginalSender(parsed);

        // Skip if we already have a task for the same original email (dedup forwarded copies)
        if (normSubject && originalFrom) {
          const [existingDedup] = await db.query(
            'SELECT id FROM emails WHERE norm_subject = ? AND original_from = ?',
            [normSubject, originalFrom]
          );
          if (existingDedup.length > 0) {
            console.log(`Skipping duplicate forward: "${normSubject}" from ${originalFrom}`);
            continue;
          }
        }

        const fromAddress = parsed.from?.value?.[0]?.address || '';
        const fromName = parsed.from?.value?.[0]?.name || '';

        const [result] = await db.query(
          `INSERT INTO emails (message_id, received_at, from_address, from_name, subject, body_text, body_html, norm_subject, original_from)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            messageId,
            parsed.date || new Date(),
            fromAddress,
            fromName,
            parsed.subject || '',
            parsed.text || '',
            parsed.html || '',
            normSubject,
            originalFrom,
          ]
        );

        newEmailIds.push(result.insertId);
        console.log(`Stored email ${result.insertId}: ${parsed.subject}`);
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    console.error('IMAP poll error:', err.message);
  }

  // Analyse after IMAP connection is closed
  for (const emailId of newEmailIds) {
    try {
      const taskId = await analyseEmail(emailId);
      console.log(`Email ${emailId} → task ${taskId}`);
    } catch (err) {
      console.error(`Analysis failed for email ${emailId}:`, err.message);
    }
  }
}

module.exports = { pollMailbox };
