
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// Validate certificate
router.get('/certificate/:certificate_id', async (req, res) => {
  try {
    const { certificate_id } = req.params;

    // Get certificate from Firestore
    const certDoc = await db.collection('certificates').doc(certificate_id).get();
    if (!certDoc.exists) {
      return res.status(404).json({ error: 'Certificate not found in database' });
    }

    const certData = certDoc.data();

    // Initialize NEAR connection for validation
    const { nearConnection } = await initNear();
    const account = await nearConnection.account(nearConnection.config.contractName);
    const contract = new nearConnection.Contract(
      account,
      nearConnection.config.contractName,
      {
        viewMethods: ['validate_certificate']
      }
    );

    // Validate certificate on blockchain
    let blockchainData;
    try {
      blockchainData = await contract.validate_certificate({
        certificate_id: certData.blockchain_id
      });
    } catch (contractError) {
      console.error('NEAR contract validation error:', contractError);
      return res.status(400).json({ 
        error: 'Certificate validation failed on blockchain',
        details: contractError.message
      });
    }

    res.json({
      message: 'Certificate validation successful',
      certificate_id,
      valid: blockchainData !== null && certData.status !== 'revoked',
      blockchain_data: blockchainData,
      local_data: certData
    });
  } catch (error) {
    console.error('Error validating certificate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get certificate history
router.get('/certificate/:certificate_id/history', async (req, res) => {
  try {
    const { certificate_id } = req.params;

    // Get certificate from Firestore
    const certDoc = await db.collection('certificates').doc(certificate_id).get();
    if (!certDoc.exists) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const certData = certDoc.data();

    // Initialize NEAR connection
    const { nearConnection } = await initNear();
    const account = await nearConnection.account(nearConnection.config.contractName);
    const contract = new nearConnection.Contract(
      account,
      nearConnection.config.contractName,
      {
        viewMethods: ['get_certificate_history']
      }
    );

    // Get history from blockchain
    let blockchainHistory;
    try {
      blockchainHistory = await contract.get_certificate_history({
        certificate_id: certData.blockchain_id
      });
    } catch (contractError) {
      console.error('NEAR contract history error:', contractError);
      blockchainHistory = [];
    }

    res.json({
      message: 'Certificate history retrieved',
      certificate_id,
      blockchain_history: blockchainHistory,
      local_data: certData
    });
  } catch (error) {
    console.error('Error getting certificate history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
