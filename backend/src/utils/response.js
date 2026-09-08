'use strict';

function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function created(res, data) {
  return ok(res, data, 201);
}

function fail(res, message, status = 400) {
  return res.status(status).json({ success: false, message });
}

function notFound(res, message = 'Not found') {
  return fail(res, message, 404);
}

function unauthorized(res, message = 'Unauthorized') {
  return fail(res, message, 401);
}

function forbidden(res, message = 'Forbidden') {
  return fail(res, message, 403);
}

function conflict(res, message = 'Already exists') {
  return fail(res, message, 409);
}

function serverError(res, message = 'Internal server error') {
  return fail(res, message, 500);
}

module.exports = { ok, created, fail, notFound, unauthorized, forbidden, conflict, serverError };
