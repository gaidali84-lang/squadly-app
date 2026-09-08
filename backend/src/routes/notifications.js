'use strict';

const router = require('express').Router();
const db = require('../db/schema');
const { requireAuth } = require('../utils/auth');
const { ok, fail, serverError } = require('../utils/response');

// GET /api/v1/notifications
router.get('/', requireAuth, (req, res) => {
  try {
    const notifications = db.all(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    const unread = db.get(
      'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    return ok(res, { notifications, unread_count: unread.cnt });
  } catch (err) {
    return serverError(res);
  }
});

// PUT /api/v1/notifications/read — mark all as read
router.put('/read', requireAuth, (req, res) => {
  try {
    db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [req.user.id]);
    return ok(res, { message: 'All marked as read' });
  } catch (err) {
    return serverError(res);
  }
});

// PUT /api/v1/notifications/:id/read
router.put('/:id/read', requireAuth, (req, res) => {
  try {
    db.run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]);
    return ok(res, { message: 'Marked as read' });
  } catch (err) {
    return serverError(res);
  }
});

module.exports = router;
