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

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Fetch all messages — deduplicate via message_id in DB, not \Seen flag
      for await (const msg of client.fetch('1:*', { envelope: true, source: true, flags: true })) {
        const parsed = await simpleParser(msg.source);
        const messageId = parsed.messageId || `${msg.uid}@familyhub`;

        // Skip if already stored
        const [existing] = await db.query('SELECT id FROM emails WHERE message_id = ?', [messageId]);
        if (existing.length > 0) {
          await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen'], { uid: true });
          continue;
        }

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
        await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen'], { uid: true });

        // Fire-and-forget analysis
        analyseEmail(emailId).catch(err => console.error(`Analysis failed for email ${emailId}:`, err));
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    console.error('IMAP poll error:', err.message);
  }
}

module.exports = { pollMailbox };
