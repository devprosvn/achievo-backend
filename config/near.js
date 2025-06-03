
const { connect, keyStores, WalletConnection } = require('near-api-js');

const nearConfig = {
  networkId: process.env.NEAR_NETWORK_ID || 'testnet',
  nodeUrl: process.env.NEAR_NODE_URL || 'https://rpc.testnet.near.org',
  walletUrl: process.env.NEAR_WALLET_URL || 'https://wallet.testnet.near.org',
  helperUrl: process.env.NEAR_HELPER_URL || 'https://helper.testnet.near.org',
  explorerUrl: process.env.NEAR_EXPLORER_URL || 'https://explorer.testnet.near.org',
  contractName: process.env.NEAR_CONTRACT_NAME || 'bernieio.testnet',
  keyStore: new keyStores.InMemoryKeyStore()
};

let nearConnection;
let wallet;

async function initNear() {
  try {
    nearConnection = await connect(nearConfig);
    wallet = new WalletConnection(nearConnection, 'achievo-app');
    console.log('NEAR connection initialized successfully');
    return { nearConnection, wallet };
  } catch (error) {
    console.error('Failed to initialize NEAR connection:', error);
    throw error;
  }
}

module.exports = { nearConfig, initNear };
