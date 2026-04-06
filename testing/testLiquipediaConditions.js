const axios = require('axios');
require('dotenv').config();

const API_URL = 'https://api.liquipedia.net/api/v3/match';

async function run() {
  try {
    const response = await axios.get(API_URL, {
      headers: {
        Authorization: `Apikey ${process.env.LIQUIPEDIA_API_KEY}`,
        'User-Agent': process.env.LIQUIPEDIA_USER_AGENT
      },
      params: {
        wiki: 'overwatch',
        conditions: '[[pagename::Overwatch_Champions_Series/2026/NA/Stage_1/Regular_Season]]',
        query: 'match2id,pagename,parent,tournament,date,bestof,finished,winner,match2opponents',
        limit: 20,
        order: 'date ASC'
      },
      timeout: 30000
    });

    console.log('status:', response.status);
    console.log('count:', response.data.result?.length ?? 0);
    console.log(JSON.stringify(response.data.result?.slice(0, 3), null, 2));
  } catch (err) {
    console.error('FAILED');
    console.error('status:', err.response?.status || 'no response');
    console.error('data:', err.response?.data || err.message);
  }
}

run();