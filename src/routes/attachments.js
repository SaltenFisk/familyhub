const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /attachments?email_id=X — list attachments for an email (no binary data)
router.get('/', requireAuth, async (req, res) => {
  const { email_id } = req.query;
  if (!email_id) return res.status(400).json({ error: 'email_id required' });
  const [rows] = await db.query(
    'SELECT id, filename, content_type, LENGTH(data) AS size FROM attachments WHERE email_id = ?',
    [email_id]
  );
  res.json(rows);
});

// GET /attachments/:id — stream the file
router.get('/:id', requireAuth, async (req, res) => {
  const [rows] = await db.query(
    'SELECT filename, content_type, data FROM attachments WHERE id = ?',
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  const { filename, content_type, data } = rows[0];
  res.setHeader('Content-Type', content_type || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.send(data);
});

module.exports = router;
