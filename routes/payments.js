
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// Process payment
router.post('/process', async (req, res) => {
  try {
    const { transaction_hash, amount, sender, receiver, purpose } = req.body;

    if (!transaction_hash || !amount || !sender || !receiver) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const transactionData = {
      transaction_hash,
      amount,
      sender,
      receiver,
      purpose: purpose || 'Payment',
      status: 'completed',
      processed_at: new Date()
    };

    const txRef = await db.collection('transactions').add(transactionData);

    res.status(201).json({
      message: 'Payment processed successfully',
      transaction_id: txRef.id,
      data: transactionData
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
