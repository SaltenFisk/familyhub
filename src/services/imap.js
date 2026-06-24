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

  const fromLine = /(?:^|\s)from:\s*.*?([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/im.exec(searchText);
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
  const emailAttachments = new Map(); // emailId → attachment array

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const uids = await client.search({ or: [{ unseen: true }, { since: since }] }, { uid: true });
      for await (const msg of client.fetch(uids, { envelope: true, source: true }, { uid: true })) {
        const parsed = await simpleParser(msg.source);
        const messageId = parsed.messageId || `${msg.uid}@familyhub`;

        // Log attachment content types to help diagnose ICS issues
        if (parsed.attachments?.length) {
          console.log(`Email "${parsed.subject}" attachments: ${parsed.attachments.map(a => `${a.filename || 'unnamed'}(${a.contentType})`).join(', ')}`);
        }
        const hasInlineCalendar = (parsed.text || '').includes('BEGIN:VCALENDAR');
        if (hasInlineCalendar) console.log(`Email "${parsed.subject}" has inline VCALENDAR in body`);

        // Skip if this exact message was already stored
        const [existingMsg] = await db.query('SELECT id FROM emails WHERE message_id = ?', [messageId]);
        if (existingMsg.length > 0) continue;

        const normSubject = normaliseSubject(parsed.subject);
        const originalFrom = extractOriginalSender(parsed);


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

        const emailId = result.insertId;
        newEmailIds.push(emailId);

        // Collect PDF, Word, and ICS attachments for analysis and storage
        const relevant = (parsed.attachments || []).filter(att => {
          const ct = (att.contentType || '').toLowerCase();
          const fn = (att.filename || '').toLowerCase();
          return ct === 'application/pdf' || fn.endsWith('.pdf') ||
            ct === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            ct === 'application/msword' || fn.endsWith('.docx') || fn.endsWith('.doc') ||
            ct === 'text/calendar' || ct === 'application/ics' || ct === 'application/octet-stream' && fn.endsWith('.ics') || fn.endsWith('.ics');
        });
        if (relevant.length > 0) {
          emailAttachments.set(emailId, relevant);
          for (const att of relevant) {
            await db.query(
              'INSERT INTO attachments (email_id, filename, content_type, data) VALUES (?, ?, ?, ?)',
              [emailId, att.filename || 'attachment', att.contentType || 'application/octet-stream', att.content]
            );
          }
          console.log(`Email ${emailId} has ${relevant.length} attachment(s): ${relevant.map(a => a.filename || a.contentType).join(', ')}`);
        }

        console.log(`Stored email ${emailId}: ${parsed.subject}`);
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    console.error('IMAP poll error:', err.message);
  }

  // Analyse new emails (pass attachments in memory)
  for (const emailId of newEmailIds) {
    try {
      const taskId = await analyseEmail(emailId, emailAttachments.get(emailId) || []);
      console.log(`Email ${emailId} → task ${taskId}`);
    } catch (err) {
      console.error(`Analysis failed for email ${emailId}:`, err.message);
    }
  }

  // Retry any previously stored emails that failed analysis
  const [unprocessed] = await db.query(
    'SELECT id FROM emails WHERE processed = 0 AND id NOT IN (SELECT email_id FROM tasks)'
  ).catch(() => [[]]);
  for (const { id } of unprocessed) {
    try {
      const taskId = await analyseEmail(id);
      console.log(`Retried email ${id} → task ${taskId}`);
    } catch (err) {
      console.error(`Retry failed for email ${id}:`, err.message);
    }
  }
}

async function debugSearch() {
  const client = new ImapFlow({
    host: process.env.IMAP_HOST,
    port: Number(process.env.IMAP_PORT) || 993,
    secure: true,
    auth: { user: process.env.IMAP_USER, pass: process.env.IMAP_PASSWORD },
    logger: false,
  });
  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  try {
    const since3d = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const since10d = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const unseen = await client.search({ unseen: true }, { uid: true });
    const since3dUids = await client.search({ since: since3d }, { uid: true });
    const since10dUids = await client.search({ since: since10d }, { uid: true });
    const orUids = await client.search({ or: [{ unseen: true }, { since: since3d }] }, { uid: true });
    return { unseen: unseen.length, since3d: since3dUids.length, since10d: since10dUids.length, or3d: orUids.length };
  } finally {
    lock.release();
    await client.logout();
  }
}

module.exports = { pollMailbox, debugSearch };
