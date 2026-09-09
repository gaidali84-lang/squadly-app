'use strict';

const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../db/schema');
const { requireAuth } = require('../utils/auth');
const { ok, fail, serverError } = require('../utils/response');
const { getPaymentProvider } = require('../payments');

// GET /api/v1/wallet — balance + recent transactions
router.get('/', requireAuth, (req, res) => {
  try {
    const wallet = db.get('SELECT * FROM wallets WHERE user_id = ?', [req.user.id]);
    if (!wallet) return fail(res, 'No wallet', 404);

    const transactions = db.all(
      'SELECT * FROM transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT 50',
      [wallet.id]
    );

    return ok(res, { balance: wallet.balance, frozen: wallet.frozen, transactions });
  } catch (err) {
    return serverError(res);
  }
});

// POST /api/v1/wallet/topup — add funds via a payment provider (mock by default)
router.post('/topup', requireAuth, [
  body('amount').isFloat({ min: 1 }),
  body('method').optional().isIn(['card', 'apple_pay', 'mada', 'paypal']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return fail(res, errors.array()[0].msg);

  const { amount, method = 'card' } = req.body;

  try {
    const wallet = db.get('SELECT * FROM wallets WHERE user_id = ?', [req.user.id]);
    if (!wallet) return fail(res, 'No wallet', 404);

    // Authorize & capture with the configured payment provider. Only credits
    // the wallet after the gateway confirms the charge.
    const payment = await getPaymentProvider().charge({
      amount,
      currency: 'sar',
      method,
      description: 'SQUADLY wallet top-up',
      metadata: { user_id: req.user.id },
    });
    if (!payment.success) return fail(res, payment.error || 'Payment declined', 400);

    const newBalance = Math.round((wallet.balance + amount) * 100) / 100;
    db.run('UPDATE wallets SET balance = ?, updated_at = datetime(\'now\') WHERE id = ?', [newBalance, wallet.id]);
    db.run(
      `INSERT INTO transactions (wallet_id, type, amount, balance_after, description, reference_type, reference_id)
       VALUES (?, 'topup', ?, ?, ?, 'payment', ?)`,
      [wallet.id, amount, newBalance, `Top up via ${method}`, payment.providerRef]
    );

    return ok(res, { balance: newBalance, amount, provider_ref: payment.providerRef });
  } catch (err) {
    console.error('[WALLET:TOPUP]', err.message);
    return serverError(res);
  }
});

// POST /api/v1/wallet/transfer — send to another user
router.post('/transfer', requireAuth, [
  body('to_user_id').isInt(),
  body('amount').isFloat({ min: 1 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return fail(res, errors.array()[0].msg);

  const { to_user_id, amount } = req.body;
  if (to_user_id === req.user.id) return fail(res, 'Cannot transfer to yourself');

  try {
    const senderWallet = db.get('SELECT * FROM wallets WHERE user_id = ?', [req.user.id]);
    const recipientWallet = db.get('SELECT * FROM wallets WHERE user_id = ?', [to_user_id]);
    if (!senderWallet) return fail(res, 'No wallet', 404);
    if (!recipientWallet) return fail(res, 'Recipient not found', 404);
    if (senderWallet.balance < amount) return fail(res, 'Insufficient balance');

    const senderNew = Math.round((senderWallet.balance - amount) * 100) / 100;
    const recipientNew = Math.round((recipientWallet.balance + amount) * 100) / 100;

    db.run('UPDATE wallets SET balance = ? WHERE id = ?', [senderNew, senderWallet.id]);
    db.run('UPDATE wallets SET balance = ? WHERE id = ?', [recipientNew, recipientWallet.id]);

    db.run(
      `INSERT INTO transactions (wallet_id, type, amount, balance_after, description, reference_type, reference_id)
       VALUES (?, 'transfer', ?, ?, ?, 'user', ?)`,
      [senderWallet.id, -amount, senderNew, `Transfer to user ${to_user_id}`, to_user_id]
    );
    db.run(
      `INSERT INTO transactions (wallet_id, type, amount, balance_after, description, reference_type, reference_id)
       VALUES (?, 'transfer', ?, ?, ?, 'user', ?)`,
      [recipientWallet.id, amount, recipientNew, `Transfer from user ${req.user.id}`, req.user.id]
    );

    return ok(res, { message: 'Transferred', sender_balance: senderNew });
  } catch (err) {
    return serverError(res);
  }
});

module.exports = router;
