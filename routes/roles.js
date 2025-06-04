
const express = require('express');
const router = express.Router();
const { initNear } = require('../config/near');

// Middleware to check admin role
const checkAdminRole = async (req, res, next) => {
  try {
    const { wallet_address } = req.headers;
    
    if (!wallet_address) {
      return res.status(401).json({ error: 'Wallet address required' });
    }

    // Initialize NEAR connection
    const { nearConnection } = await initNear();
    const account = await nearConnection.account(nearConnection.config.contractName);
    const contract = new nearConnection.Contract(
      account,
      nearConnection.config.contractName,
      {
        viewMethods: ['get_user_role']
      }
    );

    // Get user role from contract
    let userRole;
    try {
      userRole = await contract.get_user_role({ account_id: wallet_address });
    } catch (error) {
      userRole = 'user'; // Default role
    }

    if (userRole !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required' 
      });
    }

    next();
  } catch (error) {
    console.error('Admin role check error:', error);
    res.status(500).json({ error: 'Role verification failed' });
  }
};

// Assign role (admin only)
router.post('/assign', checkAdminRole, async (req, res) => {
  try {
    const { account_id, role } = req.body;
    const admin_wallet = req.headers.wallet_address;

    if (!account_id || !role) {
      return res.status(400).json({ 
        error: 'Required fields: account_id, role' 
      });
    }

    // Validate role
    const validRoles = ['admin', 'moderator', 'organization_verifier', 'user'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        error: `Invalid role. Valid roles: ${validRoles.join(', ')}` 
      });
    }

    // Initialize NEAR connection
    const { nearConnection } = await initNear();
    const account = await nearConnection.account(admin_wallet);
    const contract = new nearConnection.Contract(
      account,
      nearConnection.config.contractName,
      {
        changeMethods: ['assign_role'],
        viewMethods: ['get_user_role']
      }
    );

    // Call NEAR contract to assign role
    try {
      await contract.assign_role({
        account_id,
        role
      });
    } catch (contractError) {
      console.error('NEAR contract error:', contractError);
      return res.status(400).json({ error: 'Failed to assign role on blockchain' });
    }

    res.json({
      message: 'Role assigned successfully',
      account_id,
      role,
      assigned_by: admin_wallet
    });
  } catch (error) {
    console.error('Error assigning role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove role (admin only)
router.post('/remove', checkAdminRole, async (req, res) => {
  try {
    const { account_id } = req.body;
    const admin_wallet = req.headers.wallet_address;

    if (!account_id) {
      return res.status(400).json({ 
        error: 'account_id is required' 
      });
    }

    // Initialize NEAR connection
    const { nearConnection } = await initNear();
    const account = await nearConnection.account(admin_wallet);
    const contract = new nearConnection.Contract(
      account,
      nearConnection.config.contractName,
      {
        changeMethods: ['remove_role'],
        viewMethods: ['get_user_role']
      }
    );

    // Call NEAR contract to remove role
    try {
      await contract.remove_role({
        account_id
      });
    } catch (contractError) {
      console.error('NEAR contract error:', contractError);
      return res.status(400).json({ error: 'Failed to remove role on blockchain' });
    }

    res.json({
      message: 'Role removed successfully',
      account_id,
      removed_by: admin_wallet
    });
  } catch (error) {
    console.error('Error removing role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user role
router.get('/user/:account_id', async (req, res) => {
  try {
    const { account_id } = req.params;

    // Initialize NEAR connection
    const { nearConnection } = await initNear();
    const account = await nearConnection.account(nearConnection.config.contractName);
    const contract = new nearConnection.Contract(
      account,
      nearConnection.config.contractName,
      {
        viewMethods: ['get_user_role']
      }
    );

    // Get user role from contract
    let userRole;
    try {
      userRole = await contract.get_user_role({ account_id });
    } catch (error) {
      userRole = 'user'; // Default role
    }

    res.json({
      message: 'User role retrieved successfully',
      account_id,
      role: userRole
    });
  } catch (error) {
    console.error('Error getting user role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user's role
router.get('/me', async (req, res) => {
  try {
    const wallet_address = req.headers.wallet_address;

    if (!wallet_address) {
      return res.status(401).json({ error: 'Wallet address required' });
    }

    // Initialize NEAR connection
    const { nearConnection } = await initNear();
    const account = await nearConnection.account(nearConnection.config.contractName);
    const contract = new nearConnection.Contract(
      account,
      nearConnection.config.contractName,
      {
        viewMethods: ['get_user_role']
      }
    );

    // Get user role from contract
    let userRole;
    try {
      userRole = await contract.get_user_role({ account_id: wallet_address });
    } catch (error) {
      userRole = 'user'; // Default role
    }

    // Define permissions based on role
    const permissions = {
      user: ['view_certificates', 'receive_rewards'],
      organization_verifier: ['view_certificates', 'receive_rewards', 'verify_organizations'],
      moderator: ['view_certificates', 'receive_rewards', 'verify_organizations', 'grant_rewards', 'revoke_certificates'],
      admin: ['all_permissions']
    };

    res.json({
      message: 'Current user role retrieved successfully',
      account_id: wallet_address,
      role: userRole,
      permissions: permissions[userRole] || permissions.user
    });
  } catch (error) {
    console.error('Error getting current user role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
