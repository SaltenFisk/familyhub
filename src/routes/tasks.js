const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /tasks — list with filters
router.get('/', requireAuth, async (req, res) => {
  const { category, is_fyi_only, status, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT t.*, e.from_address, e.from_name, e.sender, e.subject, e.received_at,
           u.name AS assignee_name,
           GROUP_CONCAT(DISTINCT c.name ORDER BY c.name) AS categories,
           GROUP_CONCAT(DISTINCT tg.name ORDER BY tg.name) AS tags,
           COUNT(DISTINCT cm.id) AS comment_count,
           (SELECT cm2.body FROM comments cm2 WHERE cm2.task_id = t.id ORDER BY cm2.created_at DESC LIMIT 1) AS latest_comment,
           (SELECT cu.name FROM comments cm2 JOIN users cu ON cm2.user_id = cu.id WHERE cm2.task_id = t.id ORDER BY cm2.created_at DESC LIMIT 1) AS latest_comment_by
    FROM tasks t
    JOIN emails e ON t.email_id = e.id
    LEFT JOIN users u ON t.assignee_id = u.id
    LEFT JOIN task_categories tc ON t.id = tc.task_id
    LEFT JOIN categories c ON tc.category_id = c.id
    LEFT JOIN task_tags tt ON t.id = tt.task_id
    LEFT JOIN tags tg ON tt.tag_id = tg.id
    LEFT JOIN comments cm ON t.id = cm.task_id
    WHERE 1=1
  `;
  const params = [];

  if (category) {
    sql += ' AND c.name = ?';
    params.push(category);
  }
  if (is_fyi_only !== undefined) {
    sql += ' AND t.is_fyi_only = ?';
    params.push(is_fyi_only === 'true' ? 1 : 0);
  }
  if (status) {
    sql += ' AND t.status = ?';
    params.push(status);
  }

  sql += ' GROUP BY t.id ORDER BY e.received_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const [rows] = await db.query(sql, params);
  res.json(rows);
});

// GET /tasks/:id — single task with email body
router.get('/:id', requireAuth, async (req, res) => {
  const [rows] = await db.query(`
    SELECT t.*, e.from_address, e.from_name, e.sender, e.subject, e.received_at,
           e.body_text, e.body_html,
           u.name AS assignee_name,
           GROUP_CONCAT(DISTINCT c.name ORDER BY c.name) AS categories,
           GROUP_CONCAT(DISTINCT tg.name ORDER BY tg.name) AS tags
    FROM tasks t
    JOIN emails e ON t.email_id = e.id
    LEFT JOIN users u ON t.assignee_id = u.id
    LEFT JOIN task_categories tc ON t.id = tc.task_id
    LEFT JOIN categories c ON tc.category_id = c.id
    LEFT JOIN task_tags tt ON t.id = tt.task_id
    LEFT JOIN tags tg ON tt.tag_id = tg.id
    WHERE t.id = ?
    GROUP BY t.id
  `, [req.params.id]);

  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// PATCH /tasks/:id — update status, assignee, outcome, categories
router.patch('/:id', requireAuth, async (req, res) => {
  const { status, assignee_id, outcome, is_fyi_only, categories } = req.body;
  const task = (await db.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]))[0][0];
  if (!task) return res.status(404).json({ error: 'Not found' });

  // Children can only update their own tasks
  if (req.user.role === 'child' && task.assignee_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only update your own tasks' });
  }

  const updates = {};
  if (status) updates.status = status;
  if (outcome !== undefined) updates.outcome = outcome;
  if (assignee_id !== undefined && req.user.role === 'admin') updates.assignee_id = assignee_id;
  if (is_fyi_only !== undefined && req.user.role === 'admin') updates.is_fyi_only = is_fyi_only ? 1 : 0;

  if (Object.keys(updates).length > 0) {
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await db.query(`UPDATE tasks SET ${fields} WHERE id = ?`, [...Object.values(updates), req.params.id]);
  }

  // Update categories (who) if provided — admin only
  if (Array.isArray(categories) && req.user.role === 'admin') {
    await db.query('DELETE FROM task_categories WHERE task_id = ?', [req.params.id]);
    for (const name of categories) {
      const [rows] = await db.query('SELECT id FROM categories WHERE name = ?', [name]);
      if (rows[0]) {
        await db.query('INSERT IGNORE INTO task_categories (task_id, category_id) VALUES (?, ?)', [req.params.id, rows[0].id]);
      }
    }
  }

  if (Object.keys(updates).length === 0 && !Array.isArray(categories)) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  res.json({ ok: true });
});

// POST /tasks/:id/comments
router.post('/:id/comments', requireAuth, async (req, res) => {
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'Comment body required' });

  const [result] = await db.query(
    'INSERT INTO comments (task_id, user_id, body) VALUES (?, ?, ?)',
    [req.params.id, req.user.id, body.trim()]
  );
  res.status(201).json({ id: result.insertId });
});

// GET /tasks/:id/comments
router.get('/:id/comments', requireAuth, async (req, res) => {
  const [rows] = await db.query(
    `SELECT c.*, u.name AS user_name FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.task_id = ? ORDER BY c.created_at ASC`,
    [req.params.id]
  );
  res.json(rows);
});

module.exports = router;
