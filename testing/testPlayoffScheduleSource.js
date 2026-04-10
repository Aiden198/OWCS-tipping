// testing/testStage1ApiRows.js
require('dotenv').config();
const fetchLiquipediaMatches = require('../services/liquipedia/fetchLiquipediaMatches');

async function testPage(pageUrl) {
  try {
    const pageName = new URL(pageUrl).pathname.replace(/^\/overwatch\//, '');

    console.log('\n==================================================');
    console.log('PAGE URL: ', pageUrl);
    console.log('PAGE NAME:', pageName);

    let allMatches = [];
    let offset = 0;
    const limit = 50;

    while (true) {
      const batch = await fetchLiquipediaMatches(pageName, offset, limit);
      console.log(`offset=${offset} batch=${batch.length}`);
      allMatches.push(...batch);

      if (batch.length < limit) break;
      offset += limit;
    }

    console.log(`\nTOTAL MATCHES RETURNED: ${allMatches.length}\n`);

    for (const match of allMatches) {
      const opponents = match.match2opponents || [];
      const team1 = opponents[0]?.name || null;
      const team2 = opponents[1]?.name || null;

      console.log({
        match2id: match.match2id,
        date: match.date,
        finished: match.finished,
        winner: match.winner,
        bestof: match.bestof,
        pagename: match.pagename,
        team1,
        team2
      });
    }
  } catch (err) {
    console.error('FAILED:', err.response?.data || err.message);
  }
}

async function main() {
  await testPage('https://liquipedia.net/overwatch/Overwatch_Champions_Series/2026/NA/Stage_1');
  await testPage('https://liquipedia.net/overwatch/Overwatch_Champions_Series/2026/EMEA/Stage_1');
}

main();