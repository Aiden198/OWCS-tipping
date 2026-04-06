const axios = require('axios');
require('dotenv').config();

const API_URL = 'https://api.liquipedia.net/api/v3/match';

async function tryParams(label, params) {
  try {
    console.log(`\n=== ${label} ===`);
    console.log('params:', params);

    const response = await axios.get(API_URL, {
      headers: {
        Authorization: `Apikey ${process.env.LIQUIPEDIA_API_KEY}`,
        'User-Agent': process.env.LIQUIPEDIA_USER_AGENT
      },
      params,
      timeout: 30000
    });

    console.log('status:', response.status);
    console.log('count:', response.data.result?.length ?? 0);

    const first = response.data.result?.[0];
    if (first) {
      console.log('first tournament:', first.tournament);
      console.log('first parent:', first.parent);
      console.log('first date:', first.date);
    }
  } catch (err) {
    console.log('FAILED');
    console.log('status:', err.response?.status || 'no response');
    console.log('data:', err.response?.data || err.message);
  }
}

async function run() {
  await tryParams('base', {
    wiki: 'overwatch',
    limit: 5
  });

  await tryParams('with game', {
    wiki: 'overwatch',
    game: 'overwatch',
    limit: 5
  });

  await tryParams('with tournament', {
    wiki: 'overwatch',
    tournament: 'Overwatch Champions Series',
    limit: 5
  });

  await tryParams('with parent', {
    wiki: 'overwatch',
    parent: 'Overwatch_Champions_Series/2026/NA/Stage_1/Regular_Season',
    limit: 5
  });

  await tryParams('with series', {
    wiki: 'overwatch',
    series: 'Overwatch Champions Series',
    limit: 5
  });
}

run();