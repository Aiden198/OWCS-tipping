const axios = require('axios');

const API_URL = 'https://api.liquipedia.net/api/v3/match';
const API_KEY = process.env.LIQUIPEDIA_API_KEY;
const USER_AGENT =
  process.env.LIQUIPEDIA_USER_AGENT ||
  'OWCSTipping/1.0 (https://owcstipping.com; contact: support@owcstipping.com)';

async function fetchLiquipediaMatches(pageName, offset = 0, limit = 50) {
  if (!API_KEY) {
    throw new Error('Missing LIQUIPEDIA_API_KEY in environment variables');
  }

  try {
    console.log('[Liquipedia API] fetch pageName:', pageName);
    console.log('[Liquipedia API] fetch offset:', offset);
    console.log('[Liquipedia API] fetch limit:', limit);

    const response = await axios.get(API_URL, {
      headers: {
        Authorization: `Apikey ${API_KEY}`,
        'User-Agent': USER_AGENT
      },
      params: {
        wiki: 'overwatch',
        conditions: `[[pagename::${pageName}]]`,
        query: 'match2id,pagename,parent,tournament,date,bestof,finished,winner,match2opponents',
        limit,
        offset,
        order: 'date ASC'
      },
      timeout: 30000
    });

    return response.data.result || [];
  } catch (err) {
    if (err.response) {
      console.log('[Liquipedia API] status:', err.response.status);
      console.log('[Liquipedia API] data:', JSON.stringify(err.response.data, null, 2));
    }
    throw err;
  }
}

module.exports = fetchLiquipediaMatches;