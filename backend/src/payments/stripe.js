'use strict';

/**
 * Real Stripe payment provider.
 *
 * Activated when PAYMENT_PROVIDER=stripe and STRIPE_SECRET_KEY is set.
 * Charges the customer via a PaymentIntent (card / Apple Pay / Mada are
 * all PaymentMethod types accepted by Stripe on the same Intent).
 *
 * Requires the `stripe` npm package — a dev dependency here so the mock path
 * works without it. Install in production: npm i stripe
 */

let client = null;

function getClient() {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('PAYMENT_PROVIDER=stripe but STRIPE_SECRET_KEY is not set');
  // Lazy require so the mock path never loads the SDK.
  const Stripe = require('stripe');
  client = new Stripe(key, { apiVersion: '2024-06-20' });
  return client;
}

async function charge({ amount, currency = 'sar', method = 'card', description = '', metadata = {} }) {
  const stripe = getClient();
  // amount is in whole units (SAR); Stripe expects the smallest unit (halalas).
  const result = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    description,
    metadata,
    // 'card' accepts card, Apple Pay, and Mada tokens/PMs.
    payment_method_types: ['card'],
    automatic_payment_methods: method === 'card' ? { enabled: true } : undefined,
  });
  return { success: true, providerRef: result.id, amount, currency, method };
}

module.exports = { charge };
