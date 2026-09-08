'use strict';

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../db/schema');
const { signToken, requireAuth } = require('../utils/auth');
const { ok, created, fail, unauthorized, conflict, serverError } = require('../utils/response');

// POST /api/v1/auth/register
router.post('/register', [
  body('phone').isMobilePhone('any').withMessage('Valid phone required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  body('full_name').optional().trim().isLength({ min: 1 }),
  body('role').optional().isIn(['player', 'captain', 'owner', 'trainer']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return fail(res, errors.array()[0].msg);

  const { phone, password, full_name = '', role = 'player', city = '', district = '' } = req.body;

  try {
    const existing = db.get('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existing) return conflict(res, 'Phone already registered');

    const hash = await bcrypt.hash(password, 10);
    const { lastInsertRowid } = db.run(
      `INSERT INTO users (phone, password_hash, full_name, role, city, district) VALUES (?, ?, ?, ?, ?, ?)`,
      [phone, hash, full_name, role, city, district]
    );

    // Create player profile for player/captain roles
    if (['player', 'captain'].includes(role)) {
      db.run(`INSERT INTO player_profiles (user_id) VALUES (?)`, [lastInsertRowid]);
    }

    // Create wallet
    db.run(`INSERT INTO wallets (user_id) VALUES (?)`, [lastInsertRowid]);

    const token = signToken({ id: lastInsertRowid, role, phone });
    const user = db.get('SELECT id, phone, full_name, role, city, district, avatar_url, created_at FROM users WHERE id = ?', [lastInsertRowid]);

    return created(res, { token, user });
  } catch (err) {
    console.error('[AUTH:REGISTER]', err.message);
    return serverError(res);
  }
});

// POST /api/v1/auth/login
router.post('/login', [
  body('phone').isMobilePhone('any'),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return fail(res, 'Invalid credentials');

  const { phone, password } = req.body;

  try {
    const user = db.get('SELECT * FROM users WHERE phone = ?', [phone]);
    if (!user) return unauthorized(res, 'Invalid phone or password');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return unauthorized(res, 'Invalid phone or password');

    const token = signToken({ id: user.id, role: user.role, phone: user.phone });
    const { password_hash, ...safe } = user;
    return ok(res, { token, user: safe });
  } catch (err) {
    console.error('[AUTH:LOGIN]', err.message);
    return serverError(res);
  }
});

// GET /api/v1/auth/me
router.get('/me', requireAuth, (req, res) => {
  try {
    const user = db.get(
      'SELECT id, phone, full_name, email, role, avatar_url, city, district, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return fail(res, 'User not found', 404);

    const profile = db.get('SELECT * FROM player_profiles WHERE user_id = ?', [req.user.id]);
    const wallet = db.get('SELECT balance, frozen FROM wallets WHERE user_id = ?', [req.user.id]);

    return ok(res, { ...user, profile: profile || null, wallet: wallet || null });
  } catch (err) {
    console.error('[AUTH:ME]', err.message);
    return serverError(res);
  }
});

// PUT /api/v1/auth/me
router.put('/me', requireAuth, (req, res) => {
  const { full_name, email, avatar_url, city, district } = req.body;
  try {
    const sets = [];
    const params = [];
    if (full_name !== undefined) { sets.push('full_name = ?'); params.push(full_name); }
    if (email !== undefined)     { sets.push('email = ?'); params.push(email); }
    if (avatar_url !== undefined) { sets.push('avatar_url = ?'); params.push(avatar_url); }
    if (city !== undefined)     { sets.push('city = ?'); params.push(city); }
    if (district !== undefined) { sets.push('district = ?'); params.push(district); }

    if (sets.length === 0) return fail(res, 'Nothing to update');

    sets.push("updated_at = datetime('now')");
    params.push(req.user.id);

    db.run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
    const user = db.get('SELECT id, phone, full_name, email, role, avatar_url, city, district FROM users WHERE id = ?', [req.user.id]);
    return ok(res, user);
  } catch (err) {
    console.error('[AUTH:UPDATE]', err.message);
    return serverError(res);
  }
});

module.exports = router;
