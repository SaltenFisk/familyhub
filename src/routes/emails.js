const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /emails — paginated list of raw emails, optional ?search=
router.get('/', requireAuth, async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const offset = (page - 1) * Number(limit);
  const like = `%${search}%`;

  const whereClause = search
    ? 'WHERE subject LIKE ? OR from_name LIKE ? OR from_address LIKE ? OR sender LIKE ?'
    : '';
  const params = search ? [like, like, like, like] : [];

  const [rows] = await db.query(
    `SELECT id, received_at, from_address, from_name, sender, subject, processed
     FROM emails ${whereClause} ORDER BY received_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM emails ${whereClause}`,
    params
  );

  res.json({ emails: rows, total, page: Number(page), limit: Number(limit) });
});

// GET /emails/:id — full email with body
router.get('/:id', requireAuth, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM emails WHERE id = ?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

module.exports = router;
