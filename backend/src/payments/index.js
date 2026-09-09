'use strict';

/**
 * Payment provider adapter.
 *
 * The app never talks to a gateway directly — routes call the provider via
 * `charge()`. This keeps mock (dev) and real (Stripe/Mada) flows identical
 * at the call site and makes the integration point explicit.
 *
 * Provider interface:
 *   charge({ amount, currency, method, description, metadata }) ->
 *     Promise<{ success: boolean, providerRef?: string, error?: string }>
 */

const MOCK = require('./mock');
const STRIPE = require('./stripe');

function getPaymentProvider() {
  const provider = process.env.PAYMENT_PROVIDER || 'mock';
  switch (provider) {
    case 'stripe':
      return STRIPE;
    case 'mock':
      return MOCK;
    default:
      throw new Error(`Unknown PAYMENT_PROVIDER: ${provider}`);
  }
}

module.exports = { getPaymentProvider };
