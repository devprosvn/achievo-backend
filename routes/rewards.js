
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// Grant reward
router.post('/grant', async (req, res) => {
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
