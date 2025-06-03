
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// Process payment
router.post('/process', async (req, res) => {
  try {
    const { amount, sender_wallet, recipient_id, purpose } = req.body;

    if (!amount || !sender_wallet || !recipient_id) {
      return res.status(400).json({ error: 'Required fields: amount, sender_wallet, recipient_id' });
    }

    // Initialize NEAR connection
    const { nearConnection } = await initNear();
    const account = await nearConnection.account(sender_wallet);
    const contract = new nearConnection.Contract(
      account,
      nearConnection.config.contractName,
      {
        changeMethods: ['process_payment'],
        viewMethods: []
      }
    );

    // Process payment on NEAR blockchain
    try {
      await contract.process_payment({
        recipient_id,
        amount
      }, {
        attachedDeposit: amount, // Attach the NEAR tokens
        gas: '300000000000000' // 300 TGas
      });
    } catch (contractError) {
      console.error('NEAR payment error:', contractError);
      return res.status(400).json({ error: 'Failed to process payment on blockchain' });
    }

    // Save transaction log to Firestore
    const transactionData = {
      amount,
      sender: sender_wallet,
      receiver: recipient_id,
      purpose: purpose || 'Payment',
      status: 'completed',
      processed_at: new Date(),
      blockchain_processed: true
    };

    const txRef = await db.collection('transactions').add(transactionData);

    res.status(201).json({
      message: 'Payment processed successfully on blockchain',
      transaction_id: txRef.id,
      data: transactionData
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
