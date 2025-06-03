
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { initNear } = require('../config/near');

// Register individual
router.post('/register-individual', async (req, res) => {
  try {
    const { name, dob, email, wallet_address } = req.body;

    // Validate input
    if (!name || !dob || !email || !wallet_address) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const userExists = await db.collection('users').where('email', '==', email).get();
    if (!userExists.empty) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Save to Firestore
    const userData = {
      name,
      dob,
      email,
      wallet_address,
      type: 'individual',
      created_at: new Date(),
      status: 'active'
    };

    const userRef = await db.collection('users').add(userData);

    res.status(201).json({
      message: 'Individual registered successfully',
      user_id: userRef.id,
      data: userData
    });
  } catch (error) {
    console.error('Error registering individual:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register organization
router.post('/register-organization', async (req, res) => {
  try {
    const { name, contact_info, wallet_address } = req.body;

    if (!name || !contact_info || !wallet_address) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const orgData = {
      name,
      contact_info,
      wallet_address,
      type: 'organization',
      status: 'pending',
      created_at: new Date()
    };

    const orgRef = await db.collection('organizations').add(orgData);

    res.status(201).json({
      message: 'Organization registered successfully, awaiting verification',
      organization_id: orgRef.id,
      data: orgData
    });
  } catch (error) {
    console.error('Error registering organization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify organization
router.post('/verify-organization', async (req, res) => {
  try {
    const { organization_id, status } = req.body;

    if (!organization_id || !status) {
      return res.status(400).json({ error: 'Organization ID and status are required' });
    }

    await db.collection('organizations').doc(organization_id).update({
      status: status,
      verified_at: new Date()
    });

    res.json({
      message: `Organization ${status} successfully`,
      organization_id
    });
  } catch (error) {
    console.error('Error verifying organization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
