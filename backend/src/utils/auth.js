'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'squadly-dev-secret';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/** Express middleware: attaches req.user = { id, role, phone } */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  try {
    const decoded = verifyToken(header.split(' ')[1]);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

/** Optional auth: attaches req.user if token present, otherwise continues */
function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try { req.user = verifyToken(header.split(' ')[1]); } catch { /* ignore */ }
  }
  next();
}

/** Factory: require specific roles */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { signToken, verifyToken, requireAuth, optionalAuth, requireRole, JWT_SECRET };
