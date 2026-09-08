'use strict';

const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../db/schema');
const { requireAuth, requireRole } = require('../utils/auth');
const { ok, created, fail, notFound, serverError } = require('../utils/response');

// GET /api/v1/venues — public, with search
router.get('/', (req, res) => {
  const { city, sport, q, min_price, max_price, limit = 20, offset = 0 } = req.query;
  let sql = 'SELECT v.*, u.full_name as owner_name FROM venues v JOIN users u ON u.id = v.owner_id WHERE v.is_active = 1';
  const params = [];

  if (city)   { sql += ' AND v.city = ?'; params.push(city); }
  if (sport)  { sql += ' AND v.sport_type = ?'; params.push(sport); }
  if (q)      { sql += ' AND v.name LIKE ?'; params.push(`%${q}%`); }
  if (min_price) { sql += ' AND v.price_per_hour >= ?'; params.push(Number(min_price)); }
  if (max_price) { sql += ' AND v.price_per_hour <= ?'; params.push(Number(max_price)); }

  sql += ' ORDER BY v.rating_avg DESC, v.total_reviews DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  try {
    const venues = db.all(sql, params);
    return ok(res, venues);
  } catch (err) {
    return serverError(res);
  }
});

// GET /api/v1/venues/:id
router.get('/:id', (req, res) => {
  try {
    const venue = db.get(
      `SELECT v.*, u.full_name as owner_name
       FROM venues v JOIN users u ON u.id = v.owner_id
       WHERE v.id = ?`,
      [req.params.id]
    );
    if (!venue) return notFound(res);
    return ok(res, venue);
  } catch (err) {
    return serverError(res);
  }
});

// POST /api/v1/venues — owner only
router.post('/', requireAuth, requireRole('owner', 'founder'), [
  body('name').trim().notEmpty(),
  body('sport_type').trim().notEmpty(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return fail(res, errors.array()[0].msg);

  const { name, sport_type, address = '', city = '', district = '', price_per_hour = 0,
          open_time = '06:00', close_time = '23:00', amenities = [], photos = [],
          latitude, longitude } = req.body;

  try {
    const { lastInsertRowid } = db.run(
      `INSERT INTO venues (owner_id, name, sport_type, address, city, district, price_per_hour,
       open_time, close_time, amenities, photos, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, name, sport_type, address, city, district, price_per_hour,
       open_time, close_time, JSON.stringify(amenities), JSON.stringify(photos),
       latitude || null, longitude || null]
    );

    const venue = db.get('SELECT * FROM venues WHERE id = ?', [lastInsertRowid]);
    return created(res, venue);
  } catch (err) {
    console.error('[VENUES:CREATE]', err.message);
    return serverError(res);
  }
});

// PUT /api/v1/venues/:id — owner only
router.put('/:id', requireAuth, requireRole('owner', 'founder'), (req, res) => {
  try {
    const venue = db.get('SELECT * FROM venues WHERE id = ?', [req.params.id]);
    if (!venue) return notFound(res);
    if (venue.owner_id !== req.user.id && req.user.role !== 'founder') {
      return fail(res, 'Not your venue', 403);
    }

    const fields = ['name', 'sport_type', 'address', 'city', 'district', 'price_per_hour',
                    'open_time', 'close_time', 'amenities', 'photos', 'is_active'];
    const sets = [];
    const params = [];

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        const val = ['amenities', 'photos'].includes(f) ? JSON.stringify(req.body[f]) : req.body[f];
        sets.push(`${f} = ?`);
        params.push(val);
      }
    }
    if (sets.length === 0) return fail(res, 'Nothing to update');

    sets.push("updated_at = datetime('now')");
    params.push(req.params.id);

    db.run(`UPDATE venues SET ${sets.join(', ')} WHERE id = ?`, params);
    const updated = db.get('SELECT * FROM venues WHERE id = ?', [req.params.id]);
    return ok(res, updated);
  } catch (err) {
    return serverError(res);
  }
});

module.exports = router;
