
const axios = require('axios');

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;
const PINATA_BASE_URL = 'https://api.pinata.cloud';

const pinataHeaders = {
  'pinata_api_key': PINATA_API_KEY,
  'pinata_secret_api_key': PINATA_SECRET_API_KEY,
  'Content-Type': 'application/json'
};

async function uploadJSONToIPFS(jsonData) {
  try {
    const response = await axios.post(
      `${PINATA_BASE_URL}/pinning/pinJSONToIPFS`,
      jsonData,
      { headers: pinataHeaders }
    );
    return response.data;
  } catch (error) {
    console.error('Error uploading to Pinata:', error);
    throw error;
  }
}

module.exports = { uploadJSONToIPFS };
