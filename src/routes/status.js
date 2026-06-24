const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { analyseEmail } = require('../services/analyser');

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT value FROM settings WHERE key_name = 'claude_api_error'");
    res.json({ claude_api_error: rows[0]?.value || '' });
  } catch {
    res.json({ claude_api_error: '' });
  }
});

router.delete('/claude-error', requireAuth, requireAdmin, async (req, res) => {
  await db.query(
    "INSERT INTO settings (key_name, value) VALUES ('claude_api_error', '') ON DUPLICATE KEY UPDATE value = '', updated_at = NOW()"
  );
  res.json({ ok: true });
});

// POST /status/poll — force an immediate IMAP poll and return any error
router.post('/poll', requireAuth, requireAdmin, async (req, res) => {
  const { pollMailbox, debugSearch } = require('../services/imap');
  try {
    const info = await debugSearch();
    res.json({ ok: true, ...info });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// GET /status/emails — recent emails with task status (debug)
router.get('/emails', requireAuth, requireAdmin, async (req, res) => {
  const [rows] = await db.query(`
    SELECT e.id, e.received_at, e.subject, e.from_address, e.processed,
           e.body_text LIKE '%BEGIN:VCALENDAR%' AS has_inline_ics,
           GROUP_CONCAT(DISTINCT at2.content_type) AS attachment_types,
           COUNT(DISTINCT t.id) AS task_count,
           MAX(t.is_upcoming) AS is_upcoming,
           MAX(t.event_date) AS event_date
    FROM emails e
    LEFT JOIN attachments at2 ON at2.email_id = e.id
    LEFT JOIN tasks t ON t.email_id = e.id
    GROUP BY e.id
    ORDER BY e.received_at DESC
    LIMIT 20
  `);
  res.json(rows);
});

// POST /status/reanalyse/:id — delete existing task and re-run analysis
router.post('/reanalyse/:id', requireAuth, requireAdmin, async (req, res) => {
  const emailId = Number(req.params.id);
  try {
    // Delete existing task(s) for this email so analyseEmail can insert fresh
    await db.query('DELETE FROM tasks WHERE email_id = ?', [emailId]);
    await db.query('UPDATE emails SET processed = 0 WHERE id = ?', [emailId]);
    const taskId = await analyseEmail(emailId);
    res.json({ ok: true, taskId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
