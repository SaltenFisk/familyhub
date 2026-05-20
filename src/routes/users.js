const router = require('express').Router();
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

// GET /users — admin only
router.get('/', requireAdmin, async (req, res) => {
  const [rows] = await db.query('SELECT id, name, email, role, created_at FROM users ORDER BY name');
  res.json(rows);
});

module.exports = router;
