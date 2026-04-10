require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const db = require('../db');

async function main() {
  try {
    console.log('[Scaling Ratings] Starting...\n');

    // Define your scaling factors
    const regionScales = {
      China: 0.9,
    };

    // Show current ratings (before)
    const [before] = await db.query(`
      SELECT team_id, name, region, rating
      FROM teams
      ORDER BY region, rating DESC
    `);

    console.log('=== BEFORE ===');
    console.table(before);

    // Apply scaling
    for (const [region, scale] of Object.entries(regionScales)) {
      console.log(`\n[Scaling] Region: ${region}, Multiplier: ${scale}`);

      const [result] = await db.query(
        `
        UPDATE teams
        SET rating = ROUND(rating * ?, 0)
        WHERE region = ?
        `,
        [scale, region]
      );

      console.log(`[Scaling] Updated rows: ${result.affectedRows}`);
    }

    // Show updated ratings (after)
    const [after] = await db.query(`
      SELECT team_id, name, region, rating
      FROM teams
      ORDER BY region, rating DESC
    `);

    console.log('\n=== AFTER ===');
    console.table(after);

    console.log('\n[Scaling Ratings] Complete ✅');
    process.exit(0);

  } catch (err) {
    console.error('[Scaling Ratings] ERROR:', err);
    process.exit(1);
  }
}

main();