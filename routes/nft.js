
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { initNear } = require('../config/near');

// Middleware to check user role
const checkRole = (requiredRole) => {
  return async (req, res, next) => {
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

      // Role hierarchy
      const roleHierarchy = {
        'user': 0,
        'organization_verifier': 1, 
        'moderator': 2,
        'admin': 3
      };

      const requiredLevel = roleHierarchy[requiredRole];
      const userLevel = roleHierarchy[userRole];

      if (userLevel < requiredLevel) {
        return res.status(403).json({ 
          error: `Access denied. Required role: ${requiredRole}, your role: ${userRole}` 
        });
      }

      req.userRole = userRole;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ error: 'Role verification failed' });
    }
  };
};

// Mint NFT Certificate (verified organizations only)
router.post('/mint', async (req, res) => {
  try {
    const { receiver_id, metadata, certificate_id } = req.body;
    const wallet_address = req.headers.wallet_address;

    if (!receiver_id || !metadata || !wallet_address) {
      return res.status(400).json({ 
        error: 'Required fields: receiver_id, metadata, wallet_address header' 
      });
    }

    // Check if organization is verified
    const orgDoc = await db.collection('organizations')
      .where('wallet_address', '==', wallet_address)
      .where('verified', '==', true)
      .get();

    if (orgDoc.empty) {
      return res.status(403).json({ 
        error: 'Only verified organizations can mint NFT certificates' 
      });
    }

    // Initialize NEAR connection
    const { nearConnection } = await initNear();
    const account = await nearConnection.account(wallet_address);
    const contract = new nearConnection.Contract(
      account,
      nearConnection.config.contractName,
      {
        changeMethods: ['mint_nft_certificate'],
        viewMethods: ['nft_token']
      }
    );

    // Prepare NFT metadata
    const nftMetadata = {
      title: metadata.title || 'Achievement Certificate',
      description: metadata.description || 'Digital certificate of achievement',
      media: metadata.media,
      media_hash: metadata.media_hash,
      copies: metadata.copies || 1,
      extra: certificate_id ? `certificate_id:${certificate_id}` : undefined,
      reference: metadata.reference,
      reference_hash: metadata.reference_hash
    };

    // Call NEAR contract to mint NFT
    let tokenId;
    try {
      tokenId = await contract.mint_nft_certificate({
        receiver_id,
        metadata: nftMetadata,
        certificate_id
      });
    } catch (contractError) {
      console.error('NEAR contract error:', contractError);
      return res.status(400).json({ error: 'Failed to mint NFT certificate on blockchain' });
    }

    // Save NFT data to Firestore
    const nftData = {
      token_id: tokenId,
      owner_id: receiver_id,
      minter_org: wallet_address,
      metadata: nftMetadata,
      certificate_id: certificate_id || null,
      minted_at: new Date(),
      status: 'active'
    };

    const nftRef = await db.collection('nft_certificates').add(nftData);

    res.status(201).json({
      message: 'NFT Certificate minted successfully',
      token_id: tokenId,
      nft_id: nftRef.id,
      data: nftData
    });
  } catch (error) {
    console.error('Error minting NFT certificate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Transfer NFT Certificate
router.post('/transfer', async (req, res) => {
  try {
    const { receiver_id, token_id, memo } = req.body;
    const wallet_address = req.headers.wallet_address;

    if (!receiver_id || !token_id || !wallet_address) {
      return res.status(400).json({ 
        error: 'Required fields: receiver_id, token_id, wallet_address header' 
      });
    }

    // Initialize NEAR connection
    const { nearConnection } = await initNear();
    const account = await nearConnection.account(wallet_address);
    const contract = new nearConnection.Contract(
      account,
      nearConnection.config.contractName,
      {
        changeMethods: ['nft_transfer'],
        viewMethods: ['nft_token']
      }
    );

    // Call NEAR contract to transfer NFT
    try {
      await contract.nft_transfer({
        receiver_id,
        token_id,
        memo: memo || undefined
      });
    } catch (contractError) {
      console.error('NEAR contract error:', contractError);
      return res.status(400).json({ error: 'Failed to transfer NFT on blockchain' });
    }

    // Update Firestore
    const nftQuery = await db.collection('nft_certificates')
      .where('token_id', '==', token_id)
      .get();

    if (!nftQuery.empty) {
      const nftDoc = nftQuery.docs[0];
      await nftDoc.ref.update({
        owner_id: receiver_id,
        transferred_at: new Date(),
        transfer_memo: memo || null
      });
    }

    res.json({
      message: 'NFT Certificate transferred successfully',
      token_id,
      new_owner: receiver_id
    });
  } catch (error) {
    console.error('Error transferring NFT certificate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get NFT certificates for owner
router.get('/owner/:owner_id', async (req, res) => {
  try {
    const { owner_id } = req.params;
    const { from_index = 0, limit = 50 } = req.query;

    // Initialize NEAR connection
    const { nearConnection } = await initNear();
    const account = await nearConnection.account(nearConnection.config.contractName);
    const contract = new nearConnection.Contract(
      account,
      nearConnection.config.contractName,
      {
        viewMethods: ['nft_tokens_for_owner', 'nft_supply_for_owner']
      }
    );

    // Get NFTs from blockchain
    let nfts = [];
    let totalSupply = 0;
    
    try {
      nfts = await contract.nft_tokens_for_owner({
        account_id: owner_id,
        from_index: parseInt(from_index),
        limit: parseInt(limit)
      });
      
      totalSupply = await contract.nft_supply_for_owner({
        account_id: owner_id
      });
    } catch (contractError) {
      console.error('NEAR contract error:', contractError);
    }

    res.json({
      message: 'NFT certificates retrieved successfully',
      owner_id,
      nfts,
      total_supply: totalSupply,
      pagination: {
        from_index: parseInt(from_index),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error getting NFT certificates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific NFT token
router.get('/token/:token_id', async (req, res) => {
  try {
    const { token_id } = req.params;

    // Initialize NEAR connection
    const { nearConnection } = await initNear();
    const account = await nearConnection.account(nearConnection.config.contractName);
    const contract = new nearConnection.Contract(
      account,
      nearConnection.config.contractName,
      {
        viewMethods: ['nft_token']
      }
    );

    // Get NFT from blockchain
    let nft = null;
    try {
      nft = await contract.nft_token({ token_id });
    } catch (contractError) {
      console.error('NEAR contract error:', contractError);
      return res.status(404).json({ error: 'NFT token not found' });
    }

    if (!nft) {
      return res.status(404).json({ error: 'NFT token not found' });
    }

    res.json({
      message: 'NFT token retrieved successfully',
      nft
    });
  } catch (error) {
    console.error('Error getting NFT token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get NFT metadata
router.get('/metadata', async (req, res) => {
  try {
    // Initialize NEAR connection
    const { nearConnection } = await initNear();
    const account = await nearConnection.account(nearConnection.config.contractName);
    const contract = new nearConnection.Contract(
      account,
      nearConnection.config.contractName,
      {
        viewMethods: ['nft_metadata', 'nft_total_supply']
      }
    );

    // Get metadata from blockchain
    let metadata = {};
    let totalSupply = 0;
    
    try {
      metadata = await contract.nft_metadata();
      totalSupply = await contract.nft_total_supply();
    } catch (contractError) {
      console.error('NEAR contract error:', contractError);
    }

    res.json({
      message: 'NFT metadata retrieved successfully',
      metadata,
      total_supply: totalSupply
    });
  } catch (error) {
    console.error('Error getting NFT metadata:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
