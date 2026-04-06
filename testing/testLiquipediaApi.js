const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.LIQUIPEDIA_API_KEY;
const USER_AGENT =
  process.env.LIQUIPEDIA_USER_AGENT ||
  'OWCSTipping/1.0 (https://owcstipping.com; contact: your-email@example.com)';

// ⚠️ This URL may need slight adjustment depending on exactly what Liquipedia gave you
const API_URL = 'https://api.liquipedia.net/api/v3/match';

async function testLiquipediaApi() {
  try {
    if (!API_KEY) {
      throw new Error('Missing LIQUIPEDIA_API_KEY in .env');
    }

    console.log('[Liquipedia API] Testing connection...');
    console.log('[Liquipedia API] URL:', API_URL);
    console.log('[Liquipedia API] Key loaded:', API_KEY ? 'YES' : 'NO');

    const response = await axios.get(API_URL, {
      headers: {
        Authorization: `Apikey ${API_KEY}`,
        'User-Agent': USER_AGENT
      },
      params: {
        wiki: 'overwatch',
        limit: 5
      },
      timeout: 20000
    });

    console.log('\n=== STATUS ===');
    console.log(response.status);

    console.log('\n=== RESPONSE KEYS ===');
    console.log(Object.keys(response.data));

    console.log('\n=== FULL RESPONSE PREVIEW ===');
    console.log(JSON.stringify(response.data, null, 2).slice(0, 5000));

  } catch (err) {
    console.error('\n=== API TEST FAILED ===');

    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Headers:', err.response.headers);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }

    process.exit(1);
  }
}

testLiquipediaApi();