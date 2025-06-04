
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { sampleData, seedDatabase } = require('../sample-data');

// Middleware to check admin permissions
const checkAdminAuth = async (req, res, next) => {
  try {
    const { wallet_address } = req.headers;
    
    if (!wallet_address) {
      return res.status(401).json({ error: 'Wallet address required' });
    }

    // Check if wallet belongs to admin or superuser
    const allowedAdmins = ['achievo.testnet', 'achievo-admin.testnet'];
    
    if (!allowedAdmins.includes(wallet_address)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Initialize sample data
router.post('/init-sample-data', checkAdminAuth, async (req, res) => {
  try {
    await seedDatabase();
    res.json({
      message: 'Sample data initialized successfully',
      data: {
        admin: 'achievo.testnet',
        superuser: 'achievo-admin.testnet', 
        student: 'achievo-student.testnet',
        organization: 'achievo-org.testnet'
      }
    });
  } catch (error) {
    console.error('Error initializing sample data:', error);
    res.status(500).json({ error: 'Failed to initialize sample data' });
  }
});

// Get sample data info
router.get('/sample-data-info', async (req, res) => {
  try {
    res.json({
      message: 'Sample data information',
      accounts: sampleData.meteorWalletConfig.accounts,
      testScenarios: sampleData.testScenarios,
      instructions: {
        authentication: 'Use Meteor Wallet to connect with the provided test accounts',
        adminAccess: 'Use achievo.testnet or achievo-admin.testnet for admin operations',
        studentTesting: 'Use achievo-student.testnet for student operations',
        organizationTesting: 'Use achievo-org.testnet for organization operations'
      }
    });
  } catch (error) {
    console.error('Error getting sample data info:', error);
    res.status(500).json({ error: 'Failed to get sample data info' });
  }
});

// Verify organization (admin only)
router.post('/verify-organization/:org_id', checkAdminAuth, async (req, res) => {
  try {
    const { org_id } = req.params;
    
    await db.collection('organizations').doc(org_id).update({
      verified: true,
      status: 'verified',
      verified_at: new Date()
    });

    res.json({
      message: 'Organization verified successfully',
      organization_id: org_id
    });
  } catch (error) {
    console.error('Error verifying organization:', error);
    res.status(500).json({ error: 'Failed to verify organization' });
  }
});

// List all users (admin only)
router.get('/users', checkAdminAuth, async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const orgsSnapshot = await db.collection('organizations').get();
    
    const users = [];
    const organizations = [];

    usersSnapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });

    orgsSnapshot.forEach(doc => {
      organizations.push({ id: doc.id, ...doc.data() });
    });

    res.json({
      message: 'Users and organizations retrieved successfully',
      users,
      organizations,
      counts: {
        total_users: users.length,
        total_organizations: organizations.length
      }
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

module.exports = router;
