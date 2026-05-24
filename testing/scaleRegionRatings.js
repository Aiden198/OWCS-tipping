require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const db = require('../db');

async function main() {
  try {
    console.log('[Undo Regional Scaling + Selective 7% Adjustment] Starting...\n');

    // Undo the previous regional scaling
    const regionUndoScales = {
      Korea: 1 / 1.1,
      Japan: 1 / 1.1,
      China: 1 / 1.1,

      EMEA: 1 / 0.9,
      NA: 1 / 0.9,
      Pacific: 1 / 0.9,
    };

    // Then apply specific 7% team adjustments
    const teamAdjustments = {
      'Twisted Minds': 0.93,
      'Virtus.pro': 0.93,

      'Crazy Raccoon': 1.07,
      'ZETA DIVISION': 1.07,
      'Weibo Gaming': 1.07,
    };

    const [before] = await db.query(`
      SELECT team_id, name, region, rating
      FROM teams
      ORDER BY region, rating DESC
    `);

    console.log('=== BEFORE ===');
    console.table(before);

    for (const [region, multiplier] of Object.entries(regionUndoScales)) {
      console.log(`\n[Undoing region scale] ${region} × ${multiplier}`);

      const [result] = await db.query(
        `
        UPDATE teams
        SET rating = ROUND(rating * ?, 0)
        WHERE region = ?
        `,
        [multiplier, region]
      );

      console.log(`[Undoing region scale] Updated rows: ${result.affectedRows}`);
    }

    for (const [teamName, multiplier] of Object.entries(teamAdjustments)) {
      console.log(`\n[Applying team adjustment] ${teamName} × ${multiplier}`);

      const [result] = await db.query(
        `
        UPDATE teams
        SET rating = ROUND(rating * ?, 0)
        WHERE name = ?
        `,
        [multiplier, teamName]
      );

      console.log(`[Applying team adjustment] Updated rows: ${result.affectedRows}`);
    }

    const [after] = await db.query(`
      SELECT team_id, name, region, rating
      FROM teams
      ORDER BY region, rating DESC
    `);

    console.log('\n=== AFTER ===');
    console.table(after);

    console.log('\n[Undo Regional Scaling + Selective 7% Adjustment] Complete ✅');
    process.exit(0);

  } catch (err) {
    console.error('[Undo Regional Scaling + Selective 7% Adjustment] ERROR:', err);
    process.exit(1);
  }
}

main();