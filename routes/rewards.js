
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { initNear } = require('../config/near');

// Middleware to check if user has moderator or admin role
const checkModeratorOrAdmin = async (req, res, next) => {
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

    if (userRole !== 'moderator' && userRole !== 'admin') {
      return res.status(403).json({ 
        error: 'Moderator or admin access required' 
      });
    }

    req.userRole = userRole;
    next();
  } catch (error) {
    console.error('Role check error:', error);
    res.status(500).json({ error: 'Role verification failed' });
  }
};

// Grant reward (moderator/admin only)
router.post('/grant', checkModeratorOrAdmin, async (req, res) => {
  try {
    const { learner_wallet, milestone, granter_wallet } = req.body;

    if (!learner_wallet || !milestone || !granter_wallet) {
      return res.status(400).json({ error: 'Required fields: learner_wallet, milestone, granter_wallet' });
    }

    // Initialize NEAR connection
    const { nearConnection } = await initNear();
    const account = await nearConnection.account(granter_wallet);
    const contract = new nearConnection.Contract(
      account,
      nearConnection.config.contractName,
      {
        changeMethods: ['grant_reward'],
        viewMethods: ['list_rewards']
      }
    );

    // Call NEAR contract to grant reward
    let rewardId;
    try {
      rewardId = await contract.grant_reward({
        learner_id: learner_wallet,
        milestone
      });
    } catch (contractError) {
      console.error('NEAR contract error:', contractError);
      return res.status(400).json({ error: 'Failed to grant reward on blockchain' });
    }

    // Save to Firestore
    const rewardData = {
      blockchain_id: rewardId,
      learner_wallet,
      milestone,
      amount: "100", // Default amount from contract
      granted_at: new Date(),
      granter_wallet,
      status: 'active'
    };

    const rewardRef = await db.collection('rewards').add(rewardData);

    res.status(201).json({
      message: 'Reward granted successfully',
      reward_id: rewardRef.id,
      blockchain_id: rewardId,
      data: rewardData
    });
  } catch (error) {
    console.error('Error granting reward:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List rewards for learner
router.get('/list/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;

    const rewardsSnapshot = await db.collection('rewards')
      .where('learner_wallet', '==', wallet_address)
      .orderBy('granted_at', 'desc')
      .get();

    const rewards = [];
    rewardsSnapshot.forEach(doc => {
      rewards.push({ id: doc.id, ...doc.data() });
    });

    res.json({
      message: 'Rewards retrieved successfully',
      count: rewards.length,
      rewards
    });
  } catch (error) {
    console.error('Error listing rewards:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
