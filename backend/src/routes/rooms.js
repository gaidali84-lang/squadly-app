'use strict';

const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../db/schema');
const { requireAuth } = require('../utils/auth');
const { ok, created, fail, notFound, forbidden, serverError } = require('../utils/response');

// GET /api/v1/rooms — trending/open rooms
router.get('/', requireAuth, (req, res) => {
  const { city, sport, date, limit = 20, offset = 0 } = req.query;
  let sql = `SELECT r.*, u.full_name as captain_name, v.name as venue_name,
             (SELECT COUNT(*) FROM room_members rm WHERE rm.room_id = r.id AND rm.status != 'cancelled') as member_count
             FROM rooms r
             JOIN users u ON u.id = r.captain_id
             LEFT JOIN venues v ON v.id = r.venue_id
             WHERE r.status IN ('open','full')`;
  const params = [];

  if (city)  { sql += ' AND v.city = ?'; params.push(city); }
  if (sport) { sql += ' AND r.sport_type = ?'; params.push(sport); }
  if (date)  { sql += ' AND r.date = ?'; params.push(date); }

  sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  try {
    const rooms = db.all(sql, params);
    return ok(res, rooms);
  } catch (err) {
    return serverError(res);
  }
});

// GET /api/v1/rooms/:id
router.get('/:id', requireAuth, (req, res) => {
  try {
    const room = db.get(
      `SELECT r.*, u.full_name as captain_name, v.name as venue_name, v.address as venue_address
       FROM rooms r
       JOIN users u ON u.id = r.captain_id
       LEFT JOIN venues v ON v.id = r.venue_id
       WHERE r.id = ?`,
      [req.params.id]
    );
    if (!room) return notFound(res);

    const members = db.all(
      `SELECT rm.*, u.full_name, u.avatar_url
       FROM room_members rm JOIN users u ON u.id = rm.user_id
       WHERE rm.room_id = ? ORDER BY rm.role DESC, rm.joined_at ASC`,
      [req.params.id]
    );

    return ok(res, { ...room, members });
  } catch (err) {
    return serverError(res);
  }
});

// POST /api/v1/rooms — create room (captain)
router.post('/', requireAuth, [
  body('name').trim().notEmpty(),
  body('date').isISO8601(),
  body('time').trim().notEmpty(),
  body('needed_players').isInt({ min: 2 }),
  body('per_player_cost').isFloat({ min: 0 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return fail(res, errors.array()[0].msg);

  const { name, venue_id, sport_type = 'multi', date, time,
          needed_players, per_player_cost, description = '' } = req.body;

  try {
    const { lastInsertRowid } = db.run(
      `INSERT INTO rooms (captain_id, venue_id, name, sport_type, date, time,
       needed_players, per_player_cost, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, venue_id || null, name, sport_type, date, time,
       needed_players, per_player_cost, description]
    );

    // Captain auto-joins as captain
    db.run(
      `INSERT INTO room_members (room_id, user_id, role, status) VALUES (?, ?, 'captain', 'confirmed')`,
      [lastInsertRowid, req.user.id]
    );

    const room = db.get('SELECT * FROM rooms WHERE id = ?', [lastInsertRowid]);
    return created(res, room);
  } catch (err) {
    console.error('[ROOMS:CREATE]', err.message);
    return serverError(res);
  }
});

// POST /api/v1/rooms/:id/join — player joins room
router.post('/:id/join', requireAuth, (req, res) => {
  try {
    const room = db.get('SELECT * FROM rooms WHERE id = ?', [req.params.id]);
    if (!room) return notFound(res, 'Room not found');
    if (room.status !== 'open') return fail(res, 'Room is not open');

    const existing = db.get('SELECT * FROM room_members WHERE room_id = ? AND user_id = ?',
      [room.id, req.user.id]);
    if (existing) return fail(res, 'Already in this room');

    db.run(
      `INSERT INTO room_members (room_id, user_id, role, status) VALUES (?, ?, 'player', 'joined')`,
      [room.id, req.user.id]
    );

    // Check if room is now full
    const count = db.get('SELECT COUNT(*) as cnt FROM room_members WHERE room_id = ? AND status != ?',
      [room.id, 'cancelled']);
    if (count.cnt >= room.needed_players) {
      db.run("UPDATE rooms SET status = 'full' WHERE id = ?", [room.id]);
    }

    const members = db.all(
      `SELECT rm.*, u.full_name FROM room_members rm JOIN users u ON u.id = rm.user_id WHERE rm.room_id = ?`,
      [room.id]
    );

    return ok(res, { message: 'Joined room', members });
  } catch (err) {
    return serverError(res);
  }
});

// POST /api/v1/rooms/:id/leave
router.post('/:id/leave', requireAuth, (req, res) => {
  try {
    const member = db.get('SELECT * FROM room_members WHERE room_id = ? AND user_id = ?',
      [req.params.id, req.user.id]);
    if (!member) return fail(res, 'Not in this room');
    if (member.role === 'captain') return fail(res, 'Captain cannot leave');

    db.run("UPDATE room_members SET status = 'cancelled' WHERE id = ?", [member.id]);
    db.run("UPDATE rooms SET status = 'open' WHERE id = ? AND status = 'full'", [req.params.id]);
    return ok(res, { message: 'Left room' });
  } catch (err) {
    return serverError(res);
  }
});

// POST /api/v1/rooms/:id/cancel — captain cancels
router.post('/:id/cancel', requireAuth, (req, res) => {
  try {
    const room = db.get('SELECT * FROM rooms WHERE id = ?', [req.params.id]);
    if (!room) return notFound(res);
    if (room.captain_id !== req.user.id) return forbidden(res);

    db.run("UPDATE rooms SET status = 'cancelled' WHERE id = ?", [room.id]);
    db.run("UPDATE room_members SET status = 'cancelled' WHERE room_id = ?", [room.id]);

    return ok(res, { message: 'Room cancelled' });
  } catch (err) {
    return serverError(res);
  }
});

module.exports = router;
