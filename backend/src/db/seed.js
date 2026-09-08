'use strict';

/**
 * Seed script: populates the SQUADLY database with test data.
 * CLI: npm run seed
 * Also exported so tests can seed an isolated database.
 */

const bcrypt = require('bcryptjs');
const { getDb, run, all } = require('./schema');

async function seedDatabase() {
  await getDb();
  console.log('[SEED] Database ready, seeding...');

  // Check if already seeded
  const existing = all('SELECT COUNT(*) as cnt FROM users');
  if (existing[0].cnt > 0) {
    console.log('[SEED] Database already has data. Skipping.');
    return;
  }

  const hash = await bcrypt.hash('password123', 10);
  const adminHash = await bcrypt.hash('admin123', 10);

  // --- Users ---
  const users = [
    { phone: '+966501234567', name: 'Ahmed Al-Farsi',    role: 'player',  city: 'Riyadh', district: 'Al-Nakheel' },
    { phone: '+966501234568', name: 'Khalid Al-Otaibi',  role: 'captain', city: 'Riyadh', district: 'Al-Olaya' },
    { phone: '+966503456789', name: 'Omar Sports Arena',  role: 'owner',   city: 'Riyadh', district: 'Al-Malqa' },
    { phone: '+966505678901', name: 'SQUADLY Admin',     role: 'founder', city: 'Riyadh', district: 'Al-Nakheel' },
    { phone: '+966502345678', name: 'Sara Al-Harbi',     role: 'player',  city: 'Riyadh', district: 'Al-Sahafa' },
    { phone: '+966503456780', name: 'Youssef Nasser',    role: 'player',  city: 'Riyadh', district: 'Al-Olaya' },
    { phone: '+966504567890', name: 'Fitness Pro Gym',   role: 'owner',   city: 'Riyadh', district: 'Al-Rabwa' },
    { phone: '+966505678902', name: 'Coach Mohammed',    role: 'trainer', city: 'Riyadh', district: 'Al-Nakheel' },
  ];

  const userIds = {};
  for (const u of users) {
    const h = u.role === 'founder' ? adminHash : hash;
    const { lastInsertRowid } = run(
      `INSERT INTO users (phone, password_hash, full_name, role, city, district) VALUES (?, ?, ?, ?, ?, ?)`,
      [u.phone, h, u.name, u.role, u.city, u.district]
    );
    userIds[u.phone] = lastInsertRowid;
    console.log(`  [USER] ${u.name} (${u.role}) → ID ${lastInsertRowid}`);
  }

  // --- Player Profiles ---
  for (const phone of ['+966501234567', '+966502345678', '+966503456780']) {
    run(`INSERT INTO player_profiles (user_id, bio, sports, visibility) VALUES (?, ?, ?, ?)`,
      [userIds[phone], 'Love playing football and padel', JSON.stringify(['football', 'padel']), 'city']);
  }

  // --- Wallets + top up ---
  for (const phone of Object.keys(userIds)) {
    const uid = userIds[phone];
    run('INSERT INTO wallets (user_id, balance) VALUES (?, ?)', [uid, 500]);
    console.log(`  [WALLET] User ${uid} → 500 SAR`);
  }

  // --- Venues ---
  const venues = [
    { ownerPhone: '+966503456789', name: 'Omar Arena - Football',  sport: 'football', price: 200, city: 'Riyadh' },
    { ownerPhone: '+966503456789', name: 'Omar Arena - Padel',     sport: 'padel',    price: 150, city: 'Riyadh' },
    { ownerPhone: '+966504567890', name: 'Fitness Pro Gym',        sport: 'gym',      price: 50,  city: 'Riyadh' },
  ];

  const venueIds = {};
  for (const v of venues) {
    const { lastInsertRowid } = run(
      `INSERT INTO venues (owner_id, name, sport_type, city, price_per_hour, open_time, close_time)
       VALUES (?, ?, ?, ?, ?, '06:00', '23:00')`,
      [userIds[v.ownerPhone], v.name, v.sport, v.city, v.price]
    );
    venueIds[v.name] = lastInsertRowid;
    console.log(`  [VENUE] ${v.name} → ID ${lastInsertRowid}`);
  }

  // --- Rooms ---
  const rooms = [
    { captain: '+966501234568', venue: 'Omar Arena - Football', name: 'Friday Football Night', sport: 'football',
      date: '2026-09-12', time: '20:00', needed: 10, cost: 20 },
    { captain: '+966501234568', venue: 'Omar Arena - Padel',    name: 'Saturday Padel',        sport: 'padel',
      date: '2026-09-13', time: '18:00', needed: 4,  cost: 37.5 },
  ];

  for (const r of rooms) {
    const { lastInsertRowid: roomId } = run(
      `INSERT INTO rooms (captain_id, venue_id, name, sport_type, date, time, needed_players, per_player_cost)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userIds[r.captain], venueIds[r.venue], r.name, r.sport, r.date, r.time, r.needed, r.cost]
    );
    // Captain auto-joins
    run(`INSERT INTO room_members (room_id, user_id, role, status) VALUES (?, ?, 'captain', 'confirmed')`,
      [roomId, userIds[r.captain]]);
    console.log(`  [ROOM] ${r.name} → ID ${roomId}`);
  }

  // Add players to football room
  const footballRoom = all('SELECT id FROM rooms WHERE name = ?', ['Friday Football Night'])[0];
  if (footballRoom) {
    for (const phone of ['+966501234567', '+966502345678', '+966503456780']) {
      run(`INSERT INTO room_members (room_id, user_id, role, status) VALUES (?, ?, 'player', 'joined')`,
        [footballRoom.id, userIds[phone]]);
    }

    // --- Missing Player Alert ---
    run(
      `INSERT INTO missing_player_alerts (room_id, user_id, city, spots_needed, message)
       VALUES (?, ?, 'Riyadh', 6, 'Need 6 more for Friday football! All levels welcome.')`,
      [footballRoom.id, userIds['+966501234568']]
    );
  }

  // --- Notifications ---
  run(
    `INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'welcome', 'Welcome to SQUADLY!', 'Your account is ready. Join a room or create one!')`,
    [userIds['+966501234567']]
  );

  console.log('[SEED] Done! Test credentials:');
  console.log('  Player: +966501234567 / password123');
  console.log('  Owner:  +966503456789 / password123');
  console.log('  Admin:  +966505678901 / admin123');

  return { userIds, venueIds };
}

module.exports = { seedDatabase };

// CLI entry — only auto-runs when invoked directly (npm run seed).
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[SEED ERROR]', err);
      process.exit(1);
    });
}
