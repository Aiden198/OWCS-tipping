const upsertLiquipediaMatches = require('../services/liquipedia/upsertLiquipediaMatches');

async function run() {
  try {
    const result = await upsertLiquipediaMatches();
    console.log('\n=== Liquipedia Sync Result ===');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('\n=== Liquipedia Sync Failed ===');
    console.error(err);
    process.exit(1);
  }
}

run();