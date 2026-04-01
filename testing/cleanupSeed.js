const db = require('../db');

async function cleanupSeedMatches() {
  try {
    console.log('Deleting old seed matches...');

    const [result] = await db.query(`
      DELETE FROM matches
      WHERE source_id LIKE 'seed-%'
    `);

    console.log(`Deleted ${result.affectedRows} seed match(es) ✅`);
  } catch (err) {
    console.error('Error deleting seed matches:', err);
  } finally {
    await db.end();
  }
}

cleanupSeedMatches();