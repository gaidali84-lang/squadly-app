'use strict';

const router = require('express').Router();
const db = require('../db/schema');
const { requireAuth } = require('../utils/auth');
const { ok, fail, notFound, serverError } = require('../utils/response');

// GET /api/v1/users/:id
router.get('/:id', requireAuth, (req, res) => {
  try {
    const user = db.get(
      'SELECT id, full_name, role, avatar_url, city, district, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (!user) return notFound(res, 'User not found');

    const profile = db.get('SELECT bio, sports, availability, visibility, evaluation_avg, total_evals, loyalty_points FROM player_profiles WHERE user_id = ?', [req.params.id]);
    return ok(res, { ...user, profile: profile || null });
  } catch (err) {
    return serverError(res);
  }
});

// GET /api/v1/users/:id/evaluations
router.get('/:id/evaluations', requireAuth, (req, res) => {
  try {
    const evals = db.all(
      `SELECT e.rating, e.comment, e.target_type, e.created_at,
              u.full_name as evaluator_name
       FROM evaluations e
       JOIN users u ON u.id = e.evaluator_id
       WHERE e.target_id = ?
       ORDER BY e.created_at DESC LIMIT 50`,
      [req.params.id]
    );
    return ok(res, evals);
  } catch (err) {
    return serverError(res);
  }
});

// POST /api/v1/users/:id/evaluate
router.post('/:id/evaluate', requireAuth, (req, res) => {
  const { rating, comment = '', target_type = 'player', booking_id } = req.body;
  if (!rating || rating < 1 || rating > 5) return fail(res, 'Rating must be 1-5');
  if (req.user.id === Number(req.params.id)) return fail(res, 'Cannot evaluate yourself');

  try {
    db.run(
      `INSERT INTO evaluations (evaluator_id, target_id, target_type, rating, comment, booking_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, req.params.id, target_type, rating, comment, booking_id || null]
    );

    // Update evaluation average
    const stats = db.get('SELECT AVG(rating) as avg, COUNT(*) as cnt FROM evaluations WHERE target_id = ?', [req.params.id]);
    db.run('UPDATE player_profiles SET evaluation_avg = ?, total_evals = ? WHERE user_id = ?',
      [Math.round(stats.avg * 10) / 10, stats.cnt, req.params.id]);

    return ok(res, { rating, comment });
  } catch (err) {
    return serverError(res);
  }
});

module.exports = router;
