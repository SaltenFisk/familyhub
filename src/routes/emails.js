const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /emails — paginated list of raw emails
router.get('/', requireAuth, async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  const [rows] = await db.query(
    `SELECT id, received_at, from_address, from_name, subject, processed
     FROM emails ORDER BY received_at DESC LIMIT ? OFFSET ?`,
    [Number(limit), Number(offset)]
  );

  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM emails');

  res.json({ emails: rows, total, page: Number(page), limit: Number(limit) });
});

// GET /emails/:id — full email with body
router.get('/:id', requireAuth, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM emails WHERE id = ?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

module.exports = router;
