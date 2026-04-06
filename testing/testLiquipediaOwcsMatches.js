const axios = require('axios');
require('dotenv').config();

async function run() {
  const response = await axios.get('https://api.liquipedia.net/api/v3/match', {
    headers: {
      Authorization: `Apikey ${process.env.LIQUIPEDIA_API_KEY}`,
      'User-Agent': process.env.LIQUIPEDIA_USER_AGENT
    },
    params: {
      wiki: 'overwatch',
      limit: 5
    },
    timeout: 30000
  });

  console.log('status:', response.status);
  console.log('top-level keys:', Object.keys(response.data));
  console.log('first object keys:', Object.keys(response.data.result?.[0] || {}));
}
run().catch(err => {
  console.error(err.response?.status, err.response?.data || err.message);
});