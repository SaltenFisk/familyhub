const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const db = require('../db');
const { analyseEmail } = require('./analyser');


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
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const uids = await client.search({ or: [{ unseen: true }, { since: since }] }, { uid: true });
      for await (const msg of client.fetch(uids, { envelope: true, source: true }, { uid: true })) {
        const parsed = await simpleParser(msg.source);
        const messageId = parsed.messageId || `${msg.uid}@familyhub`;

        // Skip if this exact message was already stored
        const [existingMsg] = await db.query('SELECT id FROM emails WHERE message_id = ?', [messageId]);
        if (existingMsg.length > 0) continue;

        const fromAddress = parsed.from?.value?.[0]?.address || '';
        const fromName = parsed.from?.value?.[0]?.name || '';

        const [result] = await db.query(
          `INSERT INTO emails (message_id, received_at, from_address, from_name, subject, body_text, body_html)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            messageId,
            parsed.date || new Date(),
            fromAddress,
            fromName,
            parsed.subject || '',
            parsed.text || '',
            parsed.html || '',
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

module.exports = { pollMailbox };
