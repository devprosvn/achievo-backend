
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// Validate certificate
router.get('/certificate/:certificate_id', async (req, res) => {
  try {
    const { certificate_id } = req.params;

    const certDoc = await db.collection('certificates').doc(certificate_id).get();

    if (!certDoc.exists) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const certData = certDoc.data();

    res.json({
      message: 'Certificate validation successful',
      certificate_id,
      valid: certData.status === 'active',
      data: certData
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

    // This would typically query a history collection or blockchain
    // For now, we'll return the current certificate data
    const certDoc = await db.collection('certificates').doc(certificate_id).get();

    if (!certDoc.exists) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.json({
      message: 'Certificate history retrieved',
      certificate_id,
      history: [certDoc.data()] // In a real implementation, this would be a full history
    });
  } catch (error) {
    console.error('Error getting certificate history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
