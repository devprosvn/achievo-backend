
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// Grant reward
router.post('/grant', async (req, res) => {
  try {
    const { learner_wallet, reward_type, milestone, points } = req.body;

    if (!learner_wallet || !reward_type || !milestone) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const rewardData = {
      learner_wallet,
      reward_type,
      milestone,
      points: points || 0,
      granted_at: new Date(),
      status: 'active'
    };

    const rewardRef = await db.collection('rewards').add(rewardData);

    res.status(201).json({
      message: 'Reward granted successfully',
      reward_id: rewardRef.id,
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
