const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

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

module.exports = router;
