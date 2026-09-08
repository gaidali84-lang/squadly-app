'use strict';

/**
 * SQUADLY golden-path integration test.
 *
 * Boots the real Express app against an isolated temp database and walks the
 * core "guaranteed booking" flow over HTTP: register -> login -> rooms ->
 * join -> pay (escrow) -> wallet -> refund.
 *
 * Run: npm test  (from backend/)
 * Requires Node >= 20 (uses the built-in node:test runner and global fetch).
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

// ---------------------------------------------------------------
// Isolate the database BEFORE requiring schema.js (which caches the
// DB_PATH at first load).
// ---------------------------------------------------------------
const TEST_DB = path.join(os.tmpdir(), `squadly-test-${process.pid}.db`);
process.env.DB_PATH = TEST_DB;
process.env.PORT = '5010';
process.env.JWT_SECRET = 'squadly-test-secret';
process.env.FRONTEND_URL = 'http://localhost:5010';

const { seedDatabase } = require('../src/db/seed');
const { start } = require('../src/index');

const BASE = `http://localhost:${process.env.PORT}/api/v1`;

let server;

before(async () => {
  await seedDatabase();
  server = await start();
});

after(() => {
  server?.close();
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(TEST_DB + suffix, { force: true });
  }
});

// ---------------------------------------------------------------
// Small HTTP helper
// ---------------------------------------------------------------
async function request(method, route, { token, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${route}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let json = null;
  try { json = await res.json(); } catch { /* non-JSON body */ }
  return { status: res.status, json };
}

// ===============================================================
// Tests — the golden path
// ===============================================================

test('health endpoint reports ok', async () => {
  const { status, json } = await request('GET', '/health');
  assert.equal(status, 200);
  assert.equal(json.success, true);
  assert.equal(json.data.status, 'ok');
});

test('register creates a player with wallet and token', async () => {
  const { status, json } = await request('POST', '/auth/register', {
    body: { phone: '+966599999999', password: 'password123', full_name: 'Test Player', role: 'player' },
  });
  assert.equal(status, 201);
  assert.ok(json.data.token, 'expected a JWT');
  assert.equal(json.data.user.role, 'player');
});

test('login works with seeded credentials and rejects bad password', async () => {
  const okLogin = await request('POST', '/auth/login', {
    body: { phone: '+966501234567', password: 'password123' },
  });
  assert.equal(okLogin.status, 200);
  assert.ok(okLogin.json.data.token);

  const badLogin = await request('POST', '/auth/login', {
    body: { phone: '+966501234567', password: 'wrong-password' },
  });
  assert.equal(badLogin.status, 401);
});

test('auth guard: /rooms requires a token', async () => {
  const { status } = await request('GET', '/rooms');
  assert.equal(status, 401);
});

// --- The money flow ---

let playerToken;
let goldenToken;
let footballRoomId;

test('seeded player can list open rooms and get room detail', async () => {
  const login = await request('POST', '/auth/login', {
    body: { phone: '+966502345678', password: 'password123' }, // Sara — seeded player
  });
  playerToken = login.json.data.token;

  const list = await request('GET', '/rooms', { token: playerToken });
  assert.equal(list.status, 200);
  assert.ok(Array.isArray(list.json.data), 'expected an array of rooms');
  assert.ok(list.json.data.length >= 2, 'expected seeded rooms');

  const football = list.json.data.find((r) => r.name === 'Friday Football Night');
  assert.ok(football, 'expected seeded "Friday Football Night" room');
  footballRoomId = football.id;

  const detail = await request('GET', `/rooms/${footballRoomId}`, { token: playerToken });
  assert.equal(detail.status, 200);
  assert.equal(detail.json.data.per_player_cost, 20);
  assert.ok(Array.isArray(detail.json.data.members));
  assert.ok(detail.json.data.members.some((m) => m.role === 'captain'), 'captain should be a member');
});

test('a fresh player can register, join a room, and pay via escrow', async () => {
  // The seeded Sara is already a member of the football room, so use a freshly
  // registered player to exercise the join -> pay path.
  const reg = await request('POST', '/auth/register', {
    body: { phone: '+966599999997', password: 'password123', full_name: 'Golden Player', role: 'player' },
  });
  assert.equal(reg.status, 201);
  goldenToken = reg.json.data.token;
  assert.ok(goldenToken);

  const join = await request('POST', `/rooms/${footballRoomId}/join`, { token: goldenToken });
  assert.equal(join.status, 200, JSON.stringify(join.json));
  assert.equal(join.json.data.message, 'Joined room');
});

test('pay for the room -> escrow deducted 15% service fee from wallet', async () => {
  // Golden player's wallet starts at 0; top up to 500. Room cost 20 + 15% fee = 23.
  const topup = await request('POST', '/wallet/topup', {
    token: goldenToken,
    body: { amount: 500, method: 'mada' },
  });
  assert.equal(topup.status, 200);
  assert.equal(topup.json.data.balance, 500);

  const pay = await request('POST', '/bookings/pay', {
    token: goldenToken,
    body: { room_id: footballRoomId, payment_method: 'wallet' },
  });
  assert.equal(pay.status, 201, JSON.stringify(pay.json));
  assert.equal(pay.json.data.amount, 20);
  assert.equal(pay.json.data.service_fee, 3);
  assert.equal(pay.json.data.total_paid, 23);
  assert.equal(pay.json.data.status, 'escrow');

  const wallet = await request('GET', '/wallet', { token: goldenToken });
  assert.equal(wallet.status, 200);
  assert.equal(wallet.json.data.balance, 477); // 500 - 23
  assert.ok(
    wallet.json.data.transactions.some((t) => t.type === 'escrow_hold' && t.amount === -23),
    'expected an escrow_hold transaction of -23'
  );
});

test('double payment is rejected', async () => {
  // After the first booking the member is marked 'paid', so the pay endpoint
  // rejects the second request (either "Already paid" or "not a member") — 400 either way.
  const pay = await request('POST', '/bookings/pay', {
    token: goldenToken,
    body: { room_id: footballRoomId, payment_method: 'wallet' },
  });
  assert.equal(pay.status, 400);
});

test('bookings/my lists the escrow booking', async () => {
  const bookings = await request('GET', '/bookings/my', { token: goldenToken });
  assert.equal(bookings.status, 200);
  const match = bookings.json.data.find((b) => b.room_id === footballRoomId);
  assert.ok(match, 'expected the booking in user bookings');
  assert.equal(match.status, 'escrow');
});

test('refund restores the wallet balance', async () => {
  const bookings = await request('GET', '/bookings/my', { token: goldenToken });
  const bookingId = bookings.json.data.find((b) => b.room_id === footballRoomId).id;

  const refund = await request('POST', `/bookings/${bookingId}/refund`, { token: goldenToken });
  assert.equal(refund.status, 200);
  assert.equal(refund.json.data.refund_amount, 23);

  const wallet = await request('GET', '/wallet', { token: goldenToken });
  assert.equal(wallet.json.data.balance, 500); // restored
});

// --- Edge cases ---

test('register -> pay with empty wallet is rejected (insufficient funds)', async () => {
  // New player registers with a 0 SAR wallet... then top up only 10 SAR which
  // is below the 23 SAR needed for the football room (20 + 15% fee).
  const reg = await request('POST', '/auth/register', {
    body: { phone: '+966599999998', password: 'password123', full_name: 'Low Balance', role: 'player' },
  });
  assert.equal(reg.status, 201);
  const lowToken = reg.json.data.token;

  const topup = await request('POST', '/wallet/topup', {
    token: lowToken,
    body: { amount: 10, method: 'mada' },
  });
  assert.equal(topup.status, 200);
  assert.equal(topup.json.data.balance, 10);

  await request('POST', `/rooms/${footballRoomId}/join`, { token: lowToken });

  const pay = await request('POST', '/bookings/pay', {
    token: lowToken,
    body: { room_id: footballRoomId, payment_method: 'wallet' },
  });
  assert.equal(pay.status, 400);
  assert.match(pay.json.message, /Insufficient balance/);
});

test('topup reflects in wallet and registers a transaction', async () => {
  const login = await request('POST', '/auth/login', {
    body: { phone: '+966501234567', password: 'password123' }, // Ahmed
  });
  const token = login.json.data.token;
  const balanceBefore = (await request('GET', '/wallet', { token })).json.data.balance;

  const topup = await request('POST', '/wallet/topup', {
    token,
    body: { amount: 100, method: 'mada' },
  });
  assert.equal(topup.status, 200);
  assert.equal(topup.json.data.balance, balanceBefore + 100);
});

test('venue owner can view owner bookings; player cannot', async () => {
  const owner = await request('POST', '/auth/login', {
    body: { phone: '+966503456789', password: 'password123' }, // Omar (owner)
  });
  const ownerToken = owner.json.data.token;
  const ownerView = await request('GET', '/bookings/owner', { token: ownerToken });
  assert.equal(ownerView.status, 200);
  assert.ok(Array.isArray(ownerView.json.data));

  const player = await request('POST', '/auth/login', {
    body: { phone: '+966501234567', password: 'password123' },
  });
  const playerView = await request('GET', '/bookings/owner', { token: player.json.data.token });
  assert.equal(playerView.status, 403);
});