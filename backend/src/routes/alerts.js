'use strict';

const router = require('express').Router();
const db = require('../db/schema');
const { requireAuth } = require('../utils/auth');
const { ok, created, fail, notFound, serverError } = require('../utils/response');

// GET /api/v1/alerts — active missing-player alerts (by city)
router.get('/', requireAuth, (req, res) => {
  const { city } = req.query;
  const user = db.get('SELECT city FROM users WHERE id = ?', [req.user.id]);
  const targetCity = city || (user ? user.city : '');

  try {
    let sql = `SELECT mpa.*, r.name as room_name, r.date, r.time, r.needed_players,
               r.per_player_cost, r.sport_type, v.name as venue_name,
               u.full_name as captain_name
               FROM missing_player_alerts mpa
               JOIN rooms r ON r.id = mpa.room_id
               JOIN users u ON u.id = r.captain_id
               LEFT JOIN venues v ON v.id = r.venue_id
               WHERE mpa.is_active = 1 AND r.status = 'open'`;
    const params = [];

    if (targetCity) { sql += ' AND mpa.city = ?'; params.push(targetCity); }
    sql += ' ORDER BY mpa.created_at DESC LIMIT 20';

    const alerts = db.all(sql, params);
    return ok(res, alerts);
  } catch (err) {
    return serverError(res);
  }
});

// POST /api/v1/alerts — captain posts missing-player alert
router.post('/', requireAuth, (req, res) => {
  const { room_id, message = '', spots_needed } = req.body;
  if (!room_id) return fail(res, 'room_id required');

  try {
    const room = db.get('SELECT * FROM rooms WHERE id = ?', [room_id]);
    if (!room) return notFound(res, 'Room not found');
    if (room.captain_id !== req.user.id) return fail(res, 'Only the captain can post alerts');

    const memberCount = db.get(
      'SELECT COUNT(*) as cnt FROM room_members WHERE room_id = ? AND status != ?',
      [room_id, 'cancelled']
    );
    const spots = spots_needed || (room.needed_players - memberCount.cnt);
    if (spots <= 0) return fail(res, 'Room is already full');

    const user = db.get('SELECT city FROM users WHERE id = ?', [req.user.id]);

    const { lastInsertRowid } = db.run(
      `INSERT INTO missing_player_alerts (room_id, user_id, city, spots_needed, message)
       VALUES (?, ?, ?, ?, ?)`,
      [room_id, req.user.id, user ? user.city : '', spots, message]
    );

    db.run('UPDATE rooms SET is_missing = 1 WHERE id = ?', [room_id]);
    return created(res, { id: lastInsertRowid, spots_needed: spots });
  } catch (err) {
    return serverError(res);
  }
});

// POST /api/v1/alerts/:id/apply — player applies to fill a spot
router.post('/:id/apply', requireAuth, (req, res) => {
  try {
    const alert = db.get('SELECT * FROM missing_player_alerts WHERE id = ? AND is_active = 1',
      [req.params.id]);
    if (!alert) return notFound(res, 'Alert not found or closed');

    const member = db.get(
      'SELECT * FROM room_members WHERE room_id = ? AND user_id = ?',
      [alert.room_id, req.user.id]
    );
    if (member) return fail(res, 'Already in this room');

    // Auto-join the room
    db.run(
      `INSERT INTO room_members (room_id, user_id, role, status) VALUES (?, ?, 'player', 'joined')`,
      [alert.room_id, req.user.id]
    );

    // Check if alert is fulfilled
    const room = db.get('SELECT * FROM rooms WHERE id = ?', [alert.room_id]);
    const count = db.get('SELECT COUNT(*) as cnt FROM room_members WHERE room_id = ? AND status != ?',
      [alert.room_id, 'cancelled']);

    if (count.cnt >= room.needed_players) {
      db.run('UPDATE missing_player_alerts SET is_active = 0 WHERE id = ?', [alert.id]);
      db.run("UPDATE rooms SET status = 'full', is_missing = 0 WHERE id = ?", [alert.room_id]);
    }

    return ok(res, { message: 'Applied! Ask captain to confirm.' });
  } catch (err) {
    return serverError(res);
  }
});

module.exports = router;
