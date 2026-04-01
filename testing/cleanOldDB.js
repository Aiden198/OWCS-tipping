const db = require('../db');

async function cleanupOldPlaceholderMatches() {
  try {
    const [result] = await db.query(`
      DELETE FROM matches
      WHERE source_id IN (
        'owcs-na-2026-04-04-dallas-vs-disguised',
        'owcs-na-2026-04-05-ssg-vs-liquid',
        'owcs-emea-2026-04-05-tm-vs-vp'
      )
    `);

    console.log(`Deleted ${result.affectedRows} old placeholder match(es)`);
  } catch (err) {
    console.error('Cleanup failed:', err);
  } finally {
    await db.end();
  }
}

cleanupOldPlaceholderMatches();