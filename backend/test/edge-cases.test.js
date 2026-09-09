'use strict';

/**
 * SQUADLY edge-case integration tests.
 *
 * Exercises routes the golden path doesn't touch: venues CRUD, missing-player
 * alerts, and notifications. Uses the same isolated-temp-DB + real-HTTP setup
 * as golden-path.test.js.
 *
 * Run: npm test  (from backend/)
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Isolate the DB BEFORE requiring schema.js (which caches DB_PATH at load).
const TEST_DB = path.join(os.tmpdir(), `squadly-edge-${process.pid}.db`);
process.env.DB_PATH = TEST_DB;
process.env.PORT = '5011';
process.env.JWT_SECRET = 'squadly-test-secret';
process.env.FRONTEND_URL = 'http://localhost:5011';

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

async function login(phone, password = 'password123') {
  const res = await request('POST', '/auth/login', { body: { phone, password } });
  assert.equal(res.status, 200, `login failed for ${phone}`);
  return res.json.data.token;
}

// ===============================================================
// Venues
// ===============================================================

test('venues are publicly listable and filterable by sport', async () => {
  const list = await request('GET', '/venues');
  assert.equal(list.status, 200);
  assert.ok(list.json.data.length >= 3, 'expected seeded venues');

  const padel = await request('GET', '/venues?sport=padel');
  assert.equal(padel.status, 200);
  assert.ok(padel.json.data.every((v) => v.sport_type === 'padel'));
});

test('creating a venue requires the owner role (player gets 403)', async () => {
  const playerToken = await login('+966501234567');
  const forbidden = await request('POST', '/venues', {
    token: playerToken,
    body: { name: 'Sneaky Court', sport_type: 'padel' },
  });
  assert.equal(forbidden.status, 403);

  const ownerToken = await login('+966503456789');
  const created = await request('POST', '/venues', {
    token: ownerToken,
    body: { name: 'Riyadh Indoor Padel', sport_type: 'padel', city: 'Riyadh', price_per_hour: 120 },
  });
  assert.equal(created.status, 201);
  assert.equal(created.json.data.name, 'Riyadh Indoor Padel');
  assert.equal(created.json.data.owner_id, 3);
});

test('only the owning owner can update a venue', async () => {
  const ownerToken = await login('+966503456789');
  const venueId = (await request('GET', '/venues?name=Omar Arena - Football')).json.data[0].id;

  const ok = await request('PUT', `/venues/${venueId}`, {
    token: ownerToken,
    body: { price_per_hour: 220 },
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.data.price_per_hour, 220);

  // Second owner (Fitness Pro Gym) cannot touch Omar's venue.
  const otherOwnerToken = await login('+966504567890');
  const denied = await request('PUT', `/venues/${venueId}`, {
    token: otherOwnerToken,
    body: { price_per_hour: 1 },
  });
  assert.equal(denied.status, 403);
});

// ===============================================================
// Missing-player alerts
// ===============================================================

test('only the captain can post an alert for a room', async () => {
  const captainToken = await login('+966501234568');
  const roomId = (await request('GET', '/rooms', { token: captainToken }))
    .json.data.find((r) => r.name === 'Friday Football Night').id;

  const created = await request('POST', '/alerts', {
    token: captainToken,
    body: { room_id: roomId, spots_needed: 2, message: 'Need 2 more!' },
  });
  assert.equal(created.status, 201);
  assert.equal(created.json.data.spots_needed, 2);

  const playerToken = await login('+966501234567');
  const denied = await request('POST', '/alerts', {
    token: playerToken,
    body: { room_id: roomId, spots_needed: 2 },
  });
  assert.equal(denied.status, 400);
});

test('a fresh player can apply to a missing-player alert', async () => {
  const reg = await request('POST', '/auth/register', {
    body: { phone: '+966599999996', password: 'password123', full_name: 'Alert Filler', role: 'player' },
  });
  const token = reg.json.data.token;

  const alerts = await request('GET', '/alerts', { token });
  assert.equal(alerts.status, 200);
  assert.ok(alerts.json.data.length >= 1, 'expected a seeded missing-player alert');

  const alertId = alerts.json.data[0].id;
  const applied = await request('POST', `/alerts/${alertId}/apply`, { token });
  assert.equal(applied.status, 200, JSON.stringify(applied.json));
});

// ===============================================================
// Notifications
// ===============================================================

test('notifications require auth and list + mark-read flow works', async () => {
  const anon = await request('GET', '/notifications');
  assert.equal(anon.status, 401);

  const token = await login('+966501234567'); // Ahmed has a seeded welcome notification
  const list = await request('GET', '/notifications', { token });
  assert.equal(list.status, 200);
  assert.ok(list.json.data.notifications.length >= 1);
  assert.ok(list.json.data.unread_count >= 1);

  const markAll = await request('PUT', '/notifications/read', { token });
  assert.equal(markAll.status, 200);

  const after = await request('GET', '/notifications', { token });
  assert.equal(after.json.data.unread_count, 0);
});

test('a cancelled booking cannot be refunded twice', async () => {
  // Fresh player: top up -> join -> pay -> refund -> refund again should fail.
  const reg = await request('POST', '/auth/register', {
    body: { phone: '+966599999995', password: 'password123', full_name: 'Refund Tester', role: 'player' },
  });
  const token = reg.json.data.token;
  await request('POST', '/wallet/topup', { token, body: { amount: 100, method: 'mada' } });

  const roomId = (await request('GET', '/rooms', { token }))
    .json.data.find((r) => r.name === 'Saturday Padel').id;
  await request('POST', `/rooms/${roomId}/join`, { token });

  const pay = await request('POST', '/bookings/pay', {
    token, body: { room_id: roomId, payment_method: 'wallet' },
  });
  assert.equal(pay.status, 201);

  const bookingId = pay.json.data.id;
  const first = await request('POST', `/bookings/${bookingId}/refund`, { token });
  assert.equal(first.status, 200);

  const second = await request('POST', `/bookings/${bookingId}/refund`, { token });
  assert.equal(second.status, 400, 'double refund must be rejected');
});
