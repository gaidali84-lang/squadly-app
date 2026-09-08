'use strict';

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// DB_PATH override lets tests run against an isolated database (e.g. a temp file).
const DB_DIR = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : path.join(__dirname, '..', '..', 'data');
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'squadly.db');

let _db = null;

const SCHEMA_SQL = `
-- ============================================
-- SQUADLY Database Schema (SQLite via sql.js)
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  phone         TEXT    UNIQUE NOT NULL,
  password_hash TEXT    NOT NULL,
  full_name     TEXT    NOT NULL DEFAULT '',
  email         TEXT    DEFAULT '',
  role          TEXT    NOT NULL DEFAULT 'player' CHECK(role IN ('player','captain','owner','trainer','founder')),
  avatar_url    TEXT    DEFAULT '',
  city          TEXT    DEFAULT '',
  district      TEXT    DEFAULT '',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS player_profiles (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio             TEXT    DEFAULT '',
  sports          TEXT    DEFAULT '[]',
  availability    TEXT    DEFAULT '',
  visibility      TEXT    DEFAULT 'city' CHECK(visibility IN ('city','district','country','friends')),
  evaluation_avg  REAL    DEFAULT 0,
  total_evals     INTEGER DEFAULT 0,
  loyalty_points  INTEGER DEFAULT 0,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS venues (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT    NOT NULL,
  sport_type    TEXT    NOT NULL DEFAULT 'multi',
  address       TEXT    DEFAULT '',
  city          TEXT    DEFAULT '',
  district      TEXT    DEFAULT '',
  latitude      REAL,
  longitude     REAL,
  photos        TEXT    DEFAULT '[]',
  price_per_hour REAL  DEFAULT 0,
  open_time     TEXT    DEFAULT '06:00',
  close_time    TEXT    DEFAULT '23:00',
  amenities     TEXT    DEFAULT '[]',
  rating_avg    REAL    DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rooms (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  captain_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  venue_id        INTEGER REFERENCES venues(id),
  name            TEXT    NOT NULL,
  sport_type      TEXT    NOT NULL DEFAULT 'multi',
  date            TEXT    NOT NULL,
  time            TEXT    NOT NULL,
  needed_players  INTEGER NOT NULL DEFAULT 10,
  per_player_cost REAL    NOT NULL DEFAULT 0,
  status          TEXT    NOT NULL DEFAULT 'open' CHECK(status IN ('open','full','paid','completed','cancelled')),
  is_missing      INTEGER NOT NULL DEFAULT 0,
  description     TEXT    DEFAULT '',
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS room_members (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id   INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      TEXT    NOT NULL DEFAULT 'player' CHECK(role IN ('captain','player')),
  status    TEXT    NOT NULL DEFAULT 'joined' CHECK(status IN ('joined','confirmed','paid','attended','cancelled')),
  joined_at TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id       INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  venue_id      INTEGER REFERENCES venues(id),
  amount        REAL    NOT NULL DEFAULT 0,
  service_fee   REAL    NOT NULL DEFAULT 0,
  total_paid    REAL    NOT NULL DEFAULT 0,
  status        TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','escrow','confirmed','settled','refunded','cancelled')),
  payment_method TEXT   DEFAULT 'wallet',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wallets (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id   INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance   REAL    NOT NULL DEFAULT 0,
  frozen    REAL    NOT NULL DEFAULT 0,
  updated_at TEXT   NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_id     INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type          TEXT    NOT NULL CHECK(type IN ('topup','payment','refund','escrow_hold','escrow_release','commission','loyalty_earn','loyalty_spend','transfer')),
  amount        REAL    NOT NULL,
  balance_after REAL    NOT NULL DEFAULT 0,
  description   TEXT    DEFAULT '',
  reference_id  INTEGER,
  reference_type TEXT   DEFAULT '',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS evaluations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id  INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  evaluator_id INTEGER NOT NULL REFERENCES users(id),
  target_id   INTEGER NOT NULL REFERENCES users(id),
  target_type TEXT    NOT NULL CHECK(target_type IN ('player','captain','owner','trainer')),
  rating      INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment     TEXT    DEFAULT '',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type      TEXT    NOT NULL,
  title     TEXT    NOT NULL,
  body      TEXT    DEFAULT '',
  data      TEXT    DEFAULT '{}',
  is_read   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT   NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS missing_player_alerts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id     INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  city        TEXT    NOT NULL DEFAULT '',
  spots_needed INTEGER NOT NULL DEFAULT 1,
  message     TEXT    DEFAULT '',
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_conversations (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  type      TEXT    NOT NULL DEFAULT 'direct' CHECK(type IN ('direct','group','room')),
  name      TEXT    DEFAULT '',
  created_at TEXT   NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_members (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id       INTEGER NOT NULL REFERENCES users(id),
  content         TEXT    NOT NULL,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rooms_date       ON rooms(date);
CREATE INDEX IF NOT EXISTS idx_rooms_captain    ON rooms(captain_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status     ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room    ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user     ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_missing_alerts_city ON missing_player_alerts(city, is_active);
CREATE INDEX IF NOT EXISTS idx_messages_conv    ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_venues_city      ON venues(city, is_active);
`;

async function getDb() {
  if (_db) return _db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(buf);
  } else {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
    _db = new SQL.Database();
  }

  _db.run('PRAGMA journal_mode = WAL');
  _db.run('PRAGMA foreign_keys = ON');
  _db.exec(SCHEMA_SQL);
  saveDb();
  return _db;
}

function saveDb() {
  if (!_db) return;
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

/** Run SQL, auto-save. Returns { changes, lastInsertRowid } */
function run(sql, params = []) {
  const db = _db || _db; // ensure loaded
  db.run(sql, params);
  const info = db.exec('SELECT changes() as changes, last_insert_rowid() as lastInsertRowid');
  const row = info[0]?.values[0] || [0, 0];
  saveDb();
  return { changes: row[0], lastInsertRowid: Number(row[1]) };
}

/** Query rows */
function all(sql, params = []) {
  const stmt = _db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

/** Query single row */
function get(sql, params = []) {
  const stmt = _db.prepare(sql);
  if (params.length) stmt.bind(params);
  let row = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();
  return row;
}

module.exports = { getDb, saveDb, run, all, get };
