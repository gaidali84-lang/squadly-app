'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { WebSocketServer } = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { getDb } = require('./db/schema');

const app = express();
const PORT = process.env.PORT || 5000;

// Serve the built frontend (frontend/dist) when present — production single-image
// deploy. Skipped in dev/tests when the dist folder doesn't exist.
const DIST_DIR = process.env.DIST_DIR || path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  // SPA fallback: non-API routes return the app shell.
  app.get(/^(?!\/api\/|\/ws).*/, (_req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));
}

// --- Middleware ---
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

// --- Health ---
app.get('/api/v1/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', time: new Date().toISOString(), version: '1.0.0' } });
});

// --- Routes ---
app.use('/api/v1/auth',      require('./routes/auth'));
app.use('/api/v1/users',     require('./routes/users'));
app.use('/api/v1/venues',    require('./routes/venues'));
app.use('/api/v1/rooms',     require('./routes/rooms'));
app.use('/api/v1/bookings',  require('./routes/bookings'));
app.use('/api/v1/wallet',    require('./routes/wallet'));
app.use('/api/v1/alerts',    require('./routes/alerts'));
app.use('/api/v1/notifications', require('./routes/notifications'));

// --- 404 ---
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// --- Error handler ---
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// --- Start ---
async function start() {
  await getDb();
  console.log('[DB] SQLite database ready');

  const server = http.createServer(app);

  // WebSocket for real-time features
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Map();

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const token = url.searchParams.get('token');
    if (token) {
      try {
        const { verifyToken } = require('./utils/auth');
        const user = verifyToken(token);
        clients.set(user.id, ws);
        ws.userId = user.id;
      } catch { ws.close(); return; }
    }

    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg);
        if (data.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
      } catch { /* ignore bad json */ }
    });

    ws.on('close', () => {
      if (ws.userId) clients.delete(ws.userId);
    });
  });

  server.listen(PORT, () => {
    console.log(`[SERVER] SQUADLY API running on http://localhost:${PORT}`);
    console.log(`[SERVER] WebSocket on ws://localhost:${PORT}/ws`);
  });

  return server;
}

module.exports = { app, start };

// CLI entry — only auto-runs when invoked directly (node src/index.js).
if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
}
