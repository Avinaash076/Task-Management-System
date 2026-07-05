const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getDb, getMemoryStore } = require('../config/db');
const { checkDueSoonNotifications } = require('../utils/notifications');

const router = express.Router();
router.use(authenticate);

function normalizeNotification(row) {
  return {
    id: row.id,
    userId: row.user_id || row.userId,
    message: row.message,
    createdAt: row.created_at || row.createdAt,
  };
}

router.get('/', async (req, res, next) => {
  try {
    await checkDueSoonNotifications();

    const pool = await getDb();
    if (pool) {
      const [rows] = await pool.query(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
        [req.user.id]
      );
      return res.json(rows.map(normalizeNotification));
    }

    const store = getMemoryStore();
    return res.json(
      store.notifications
        .filter((item) => item.userId === req.user.id)
        .slice(0, 50)
        .map(normalizeNotification)
    );
  } catch (error) {
    next(error);
  }
});

module.exports = router;
