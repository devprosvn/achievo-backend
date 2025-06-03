
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { uploadJSONToIPFS } = require('../config/pinata');

// Issue certificate
router.post('/issue', async (req, res) => {
  try {
    const { learner_wallet, course_id, course_name, organization_wallet, skills, grade } = req.body;

    if (!learner_wallet || !course_id || !course_name || !organization_wallet) {
      return res.status(400).json({ error: 'Required fields: learner_wallet, course_id, course_name, organization_wallet' });
    }

    // Initialize NEAR connection
    const { nearConnection } = await initNear();
    const account = await nearConnection.account(organization_wallet);
    const contract = new nearConnection.Contract(
      account,
      nearConnection.config.contractName,
      {
        changeMethods: ['issue_certificate'],
        viewMethods: ['get_certificate']
      }
    );

    // Prepare certificate metadata
    const metadata = {
      learner_id: learner_wallet,
      course_id,
      course_name,
      completion_date: new Date().toISOString().split('T')[0],
      issuer_org_id: organization_wallet,
      skills: skills || [],
      grade: grade || undefined
    };

    // Upload metadata to IPFS via Pinata
    const ipfsResult = await uploadJSONToIPFS(metadata);
    const cid = ipfsResult.IpfsHash;

    // Call NEAR contract to issue certificate
    let certificateId;
    try {
      certificateId = await contract.issue_certificate({
        learner_id: learner_wallet,
        course_id,
        metadata
      });
    } catch (contractError) {
      console.error('NEAR contract error:', contractError);
      return res.status(400).json({ error: 'Failed to issue certificate on blockchain' });
    }

    // Save certificate to Firestore
    const certificateData = {
      blockchain_id: certificateId,
      learner_wallet,
      course_id,
      course_name,
      organization_wallet,
      metadata_cid: cid,
      status: 'pending',
      created_at: new Date(),
      ipfs_url: `https://gateway.pinata.cloud/ipfs/${cid}`,
      metadata
    };

    const certRef = await db.collection('certificates').add(certificateData);

    res.status(201).json({
      message: 'Certificate issued successfully',
      certificate_id: certRef.id,
      blockchain_id: certificateId,
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



// Update certificate status
router.put('/update-status', async (req, res) => {
  try {
    const { certificate_id, new_status, organization_wallet } = req.body;

    if (!certificate_id || !new_status || !organization_wallet) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Get certificate from Firestore
    const certDoc = await db.collection('certificates').doc(certificate_id).get();
    if (!certDoc.exists) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const certData = certDoc.data();

    // Initialize NEAR connection
    const { nearConnection } = await initNear();
    const account = await nearConnection.account(organization_wallet);
    const contract = new nearConnection.Contract(
      account,
      nearConnection.config.contractName,
      {
        changeMethods: ['update_certificate_status'],
        viewMethods: ['get_certificate']
      }
    );

    // Call NEAR contract to update status
    try {
      await contract.update_certificate_status({
        certificate_id: certData.blockchain_id,
        new_status
      });
    } catch (contractError) {
      console.error('NEAR contract error:', contractError);
      return res.status(400).json({ error: 'Failed to update status on blockchain' });
    }

    // Update Firestore
    await db.collection('certificates').doc(certificate_id).update({
      status: new_status,
      updated_at: new Date()
    });

    res.json({
      message: 'Certificate status updated successfully',
      certificate_id,
      new_status
    });
  } catch (error) {
    console.error('Error updating certificate status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revoke certificate
router.post('/revoke', async (req, res) => {
  try {
    const { certificate_id, reason, organization_wallet } = req.body;

    if (!certificate_id || !reason || !organization_wallet) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Get certificate from Firestore
    const certDoc = await db.collection('certificates').doc(certificate_id).get();
    if (!certDoc.exists) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const certData = certDoc.data();

    // Initialize NEAR connection
    const { nearConnection } = await initNear();
    const account = await nearConnection.account(organization_wallet);
    const contract = new nearConnection.Contract(
      account,
      nearConnection.config.contractName,
      {
        changeMethods: ['revoke_certificate'],
        viewMethods: ['get_certificate']
      }
    );

    // Call NEAR contract to revoke certificate
    try {
      await contract.revoke_certificate({
        certificate_id: certData.blockchain_id,
        reason
      });
    } catch (contractError) {
      console.error('NEAR contract error:', contractError);
      return res.status(400).json({ error: 'Failed to revoke certificate on blockchain' });
    }

    // Update Firestore
    await db.collection('certificates').doc(certificate_id).update({
      status: 'revoked',
      revoked_at: new Date(),
      revocation_reason: reason
    });

    res.json({
      message: 'Certificate revoked successfully',
      certificate_id,
      reason
    });
  } catch (error) {
    console.error('Error revoking certificate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
