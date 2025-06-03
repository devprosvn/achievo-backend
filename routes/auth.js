
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

    // Initialize NEAR connection
    const { nearConnection } = await initNear();
    const account = await nearConnection.account(wallet_address);
    const contract = new nearConnection.Contract(
      account,
      nearConnection.config.contractName,
      {
        changeMethods: ['register_individual'],
        viewMethods: ['get_individual']
      }
    );

    // Call NEAR contract to register individual
    try {
      await contract.register_individual({
        name,
        dob,
        email
      });
    } catch (contractError) {
      console.error('NEAR contract error:', contractError);
      return res.status(400).json({ error: 'Failed to register on blockchain' });
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

    // Check if organization already exists
    const orgExists = await db.collection('organizations').where('wallet_address', '==', wallet_address).get();
    if (!orgExists.empty) {
      return res.status(409).json({ error: 'Organization already exists' });
    }

    // Initialize NEAR connection
    const { nearConnection } = await initNear();
    const account = await nearConnection.account(wallet_address);
    const contract = new nearConnection.Contract(
      account,
      nearConnection.config.contractName,
      {
        changeMethods: ['register_organization'],
        viewMethods: ['get_organization']
      }
    );

    // Call NEAR contract to register organization
    try {
      await contract.register_organization({
        name,
        contact_info
      });
    } catch (contractError) {
      console.error('NEAR contract error:', contractError);
      return res.status(400).json({ error: 'Failed to register on blockchain' });
    }

    // Save to Firestore with pending status
    const orgData = {
      name,
      contact_info,
      wallet_address,
      type: 'organization',
      verified: false,
      created_at: new Date(),
      status: 'pending'
    };

    const orgRef = await db.collection('organizations').add(orgData);

    res.status(201).json({
      message: 'Organization registered successfully (pending verification)',
      organization_id: orgRef.id,
      data: orgData
    });
  } catch (error) {
    console.error('Error registering organization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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



// Verify organization (admin only)
router.post('/verify-organization', async (req, res) => {
  try {
    const { organization_id, admin_wallet } = req.body;

    if (!organization_id || !admin_wallet) {
      return res.status(400).json({ error: 'Organization ID and admin wallet are required' });
    }

    // Get organization from Firestore
    const orgDoc = await db.collection('organizations').doc(organization_id).get();
    if (!orgDoc.exists) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const orgData = orgDoc.data();

    // Initialize NEAR connection
    const { nearConnection } = await initNear();
    const account = await nearConnection.account(admin_wallet);
    const contract = new nearConnection.Contract(
      account,
      nearConnection.config.contractName,
      {
        changeMethods: ['verify_organization'],
        viewMethods: ['get_organization']
      }
    );

    // Call NEAR contract to verify organization
    try {
      await contract.verify_organization({
        organization_id: orgData.wallet_address
      });
    } catch (contractError) {
      console.error('NEAR contract error:', contractError);
      return res.status(400).json({ error: 'Failed to verify on blockchain' });
    }

    // Update Firestore
    await db.collection('organizations').doc(organization_id).update({
      verified: true,
      status: 'verified',
      verified_at: new Date()
    });

    res.json({
      message: 'Organization verified successfully',
      organization_id
    });
  } catch (error) {
    console.error('Error verifying organization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
