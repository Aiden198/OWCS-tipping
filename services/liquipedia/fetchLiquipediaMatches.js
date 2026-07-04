const axios = require('axios');

const API_URL = 'https://api.liquipedia.net/api/v3/match';
const API_KEY = process.env.LIQUIPEDIA_API_KEY;
const USER_AGENT =
  process.env.LIQUIPEDIA_USER_AGENT ||
  'OWCSTipping/1.0 (https://owcstipping.com; contact: support@owcstipping.com)';

// Liquipedia throttles the v3 API. Stay well under the limit and back off on 429.
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchLiquipediaMatches(pageName, offset = 0, limit = 50) {
  if (!API_KEY) {
    throw new Error('Missing LIQUIPEDIA_API_KEY in environment variables');
  }

  console.log('[Liquipedia API] fetch pageName:', pageName);
  console.log('[Liquipedia API] fetch offset:', offset);
  console.log('[Liquipedia API] fetch limit:', limit);

  for (let attempt = 1; ; attempt += 1) {
    try {
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
      const status = err.response?.status;

      // Retry on rate limit (429) and transient server errors (5xx).
      const retryable = status === 429 || (status >= 500 && status <= 599);

      if (retryable && attempt <= MAX_RETRIES) {
        const retryAfterHeader = Number(err.response?.headers?.['retry-after']);
        const wait =
          retryAfterHeader > 0
            ? retryAfterHeader * 1000
            : BASE_BACKOFF_MS * 2 ** (attempt - 1); // 2s, 4s, 8s, 16s, 32s

        console.log(
          `[Liquipedia API] ${status} on "${pageName}" — retry ${attempt}/${MAX_RETRIES} in ${wait}ms`
        );
        await sleep(wait);
        continue;
      }

      if (err.response) {
        console.log('[Liquipedia API] status:', status);
        console.log('[Liquipedia API] data:', JSON.stringify(err.response.data, null, 2));
      }
      throw err;
    }
  }
}

module.exports = fetchLiquipediaMatches;