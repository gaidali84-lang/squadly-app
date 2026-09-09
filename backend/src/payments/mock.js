'use strict';

/**
 * Mock payment provider — default in development.
 * Always "succeeds" and returns a fake reference. Never takes real money.
 * Replace by setting PAYMENT_PROVIDER=stripe (see ./stripe.js).
 */

async function charge({ amount, currency = 'SAR', method = 'card', description = '', metadata = {} }) {
  return {
    success: true,
    providerRef: `mock_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
    amount,
    currency,
    method,
  };
}

module.exports = { charge };
