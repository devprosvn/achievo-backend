
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { uploadJSONToIPFS } = require('../config/pinata');

// Issue certificate
router.post('/issue', async (req, res) => {
  try {
    const { learner_name, course_name, organization_id, learner_wallet } = req.body;

    if (!learner_name || !course_name || !organization_id || !learner_wallet) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Create metadata for IPFS
    const metadata = {
      learner_name,
      course_name,
      issue_date: new Date().toISOString().split('T')[0],
      organization_id,
      status: 'Completed'
    };

    // Upload to IPFS via Pinata
    const ipfsResult = await uploadJSONToIPFS(metadata);
    const cid = ipfsResult.IpfsHash;

    // Save certificate to Firestore
    const certificateData = {
      learner_name,
      course_name,
      organization_id,
      learner_wallet,
      metadata_cid: cid,
      status: 'active',
      created_at: new Date(),
      ipfs_url: `https://gateway.pinata.cloud/ipfs/${cid}`
    };

    const certRef = await db.collection('certificates').add(certificateData);

    res.status(201).json({
      message: 'Certificate issued successfully',
      certificate_id: certRef.id,
      ipfs_cid: cid,
      data: certificateData
    });
  } catch (error) {
    console.error('Error issuing certificate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update certificate status
router.put('/status/:certificate_id', async (req, res) => {
  try {
    const { certificate_id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    await db.collection('certificates').doc(certificate_id).update({
      status,
      updated_at: new Date()
    });

    res.json({
      message: 'Certificate status updated successfully',
      certificate_id,
      new_status: status
    });
  } catch (error) {
    console.error('Error updating certificate status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revoke certificate
router.post('/revoke/:certificate_id', async (req, res) => {
  try {
    const { certificate_id } = req.params;
    const { reason } = req.body;

    await db.collection('certificates').doc(certificate_id).update({
      status: 'revoked',
      revoked_at: new Date(),
      revocation_reason: reason || 'No reason provided'
    });

    res.json({
      message: 'Certificate revoked successfully',
      certificate_id
    });
  } catch (error) {
    console.error('Error revoking certificate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
