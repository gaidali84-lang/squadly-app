'use strict';

const router = require('express').Router();
const db = require('../db/schema');
const { requireAuth } = require('../utils/auth');
const { ok, created, fail, notFound, forbidden, serverError } = require('../utils/response');

const COMMISSION_RATE = 0.15;

// POST /api/v1/bookings/pay — pay for a room (escrow)
router.post('/pay', requireAuth, (req, res) => {
  const { room_id, payment_method = 'wallet' } = req.body;
  if (!room_id) return fail(res, 'room_id required');

  try {
    const room = db.get('SELECT * FROM rooms WHERE id = ?', [room_id]);
    if (!room) return notFound(res, 'Room not found');
    if (!['full', 'open'].includes(room.status)) return fail(res, 'Room not in payable state');

    const member = db.get(
      'SELECT * FROM room_members WHERE room_id = ? AND user_id = ? AND status IN (?, ?)',
      [room_id, req.user.id, 'joined', 'confirmed']
    );
    if (!member) return fail(res, 'You are not a member of this room');

    const existingBooking = db.get(
      'SELECT * FROM bookings WHERE room_id = ? AND user_id = ? AND status NOT IN (?)',
      [room_id, req.user.id, 'cancelled']
    );
    if (existingBooking) return fail(res, 'Already paid');

    const amount = room.per_player_cost;
    const serviceFee = Math.round(amount * COMMISSION_RATE * 100) / 100;
    const totalPaid = amount + serviceFee;

    // Check wallet balance
    const wallet = db.get('SELECT * FROM wallets WHERE user_id = ?', [req.user.id]);
    if (!wallet) return fail(res, 'No wallet found');
    if (payment_method === 'wallet' && wallet.balance < totalPaid) {
      return fail(res, `Insufficient balance. Need ${totalPaid}, have ${wallet.balance}`);
    }

    // Deduct from wallet
    if (payment_method === 'wallet') {
      const newBalance = Math.round((wallet.balance - totalPaid) * 100) / 100;
      db.run('UPDATE wallets SET balance = ?, updated_at = datetime(\'now\') WHERE id = ?', [newBalance, wallet.id]);
      db.run(
        `INSERT INTO transactions (wallet_id, type, amount, balance_after, description, reference_type, reference_id)
         VALUES (?, 'escrow_hold', ?, ?, 'Room booking escrow', 'room', ?)`,
        [wallet.id, -totalPaid, newBalance, room_id]
      );
    }

    // Create booking in escrow
    const { lastInsertRowid } = db.run(
      `INSERT INTO bookings (room_id, user_id, venue_id, amount, service_fee, total_paid, status, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, 'escrow', ?)`,
      [room_id, req.user.id, room.venue_id, amount, serviceFee, totalPaid, payment_method]
    );

    // Update member status
    db.run("UPDATE room_members SET status = 'paid' WHERE id = ?", [member.id]);

    // Check if all members paid
    const unpaid = db.get(
      `SELECT COUNT(*) as cnt FROM room_members rm
       WHERE rm.room_id = ? AND rm.status NOT IN ('paid','attended','cancelled')`,
      [room_id]
    );
    if (unpaid.cnt === 0) {
      db.run("UPDATE rooms SET status = 'paid' WHERE id = ?", [room_id]);

      // Notify venue owner
      if (room.venue_id) {
        const venue = db.get('SELECT owner_id FROM venues WHERE id = ?', [room.venue_id]);
        if (venue) {
          db.run(
            `INSERT INTO notifications (user_id, type, title, body, data) VALUES (?, 'booking', 'Team arriving!', ?, ?)`,
            [venue.owner_id, `A full team will arrive on ${room.date} at ${room.time}`,
             JSON.stringify({ room_id: room.id })]
          );
        }
      }
    }

    const booking = db.get('SELECT * FROM bookings WHERE id = ?', [lastInsertRowid]);
    return created(res, booking);
  } catch (err) {
    console.error('[BOOKINGS:PAY]', err.message);
    return serverError(res);
  }
});

// GET /api/v1/bookings/my
router.get('/my', requireAuth, (req, res) => {
  try {
    const bookings = db.all(
      `SELECT b.*, r.name as room_name, r.date, r.time, v.name as venue_name
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       LEFT JOIN venues v ON v.id = b.venue_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    return ok(res, bookings);
  } catch (err) {
    return serverError(res);
  }
});

// POST /api/v1/bookings/:id/refund — refund from wallet (15-day window)
router.post('/:id/refund', requireAuth, (req, res) => {
  try {
    const booking = db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (!booking) return notFound(res);
    if (booking.user_id !== req.user.id) return forbidden(res);
    if (!['escrow', 'confirmed'].includes(booking.status)) return fail(res, 'Cannot refund');

    // Refund to wallet
    const wallet = db.get('SELECT * FROM wallets WHERE user_id = ?', [req.user.id]);
    const newBalance = Math.round((wallet.balance + booking.total_paid) * 100) / 100;
    db.run('UPDATE wallets SET balance = ?, updated_at = datetime(\'now\') WHERE id = ?', [newBalance, wallet.id]);
    db.run(
      `INSERT INTO transactions (wallet_id, type, amount, balance_after, description, reference_type, reference_id)
       VALUES (?, 'refund', ?, ?, 'Booking refund', 'booking', ?)`,
      [wallet.id, booking.total_paid, newBalance, booking.id]
    );

    db.run("UPDATE bookings SET status = 'refunded' WHERE id = ?", [booking.id]);
    db.run("UPDATE room_members SET status = 'cancelled' WHERE room_id = ? AND user_id = ?",
      [booking.room_id, booking.user_id]);

    return ok(res, { message: 'Refunded', refund_amount: booking.total_paid });
  } catch (err) {
    return serverError(res);
  }
});

// GET /api/v1/bookings/owner — venue owner view
router.get('/owner', requireAuth, (req, res) => {
  try {
    if (!['owner', 'founder'].includes(req.user.role)) return forbidden(res);

    const bookings = db.all(
      `SELECT b.*, r.name as room_name, r.date, r.time, r.needed_players,
              u.full_name as captain_name
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       JOIN users u ON u.id = r.captain_id
       WHERE b.venue_id IN (SELECT id FROM venues WHERE owner_id = ?)
       ORDER BY r.date DESC, r.time DESC`,
      [req.user.id]
    );
    return ok(res, bookings);
  } catch (err) {
    return serverError(res);
  }
});

module.exports = router;
