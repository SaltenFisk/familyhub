const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /tags
router.get('/', requireAuth, async (req, res) => {
  const [rows] = await db.query(
    `SELECT t.*, u.name AS default_assignee_name
     FROM tags t LEFT JOIN users u ON t.default_assignee_id = u.id
     ORDER BY t.name`
  );
  res.json(rows);
});

// PATCH /tags/:id — approve, rename, set default assignee (admin only)
router.patch('/:id', requireAdmin, async (req, res) => {
  const { name, approved, default_assignee_id } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (approved !== undefined) updates.approved = approved ? 1 : 0;
  if (default_assignee_id !== undefined) updates.default_assignee_id = default_assignee_id || null;

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' });

  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  await db.query(`UPDATE tags SET ${fields} WHERE id = ?`, [...Object.values(updates), req.params.id]);

  res.json({ ok: true });
});

module.exports = router;
