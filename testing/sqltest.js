const db = require('../db');

async function testMatches() {
  try {
    console.log('\n--- ALL MATCHES ---');

    const [matches] = await db.query(`
      SELECT
        match_id,
        source_id,
        source_team_1_name,
        source_team_2_name,
        team_1_id,
        team_2_id,
        status,
        team_1_score,
        team_2_score,
        winning_team_id
      FROM matches
      ORDER BY match_datetime ASC
    `);

    console.table(matches);

    console.log('\n--- DUPLICATE SOURCE_ID CHECK ---');

    const [duplicates] = await db.query(`
      SELECT
        source_id,
        COUNT(*) AS count
      FROM matches
      GROUP BY source_id
      HAVING COUNT(*) > 1
    `);

    if (duplicates.length === 0) {
      console.log('No duplicate source_id values found ✅');
    } else {
      console.table(duplicates);
    }

    console.log('\n--- TEAM MAPPING CHECK ---');

    const [mappingCheck] = await db.query(`
      SELECT
        match_id,
        source_team_1_name,
        team_1_id,
        source_team_2_name,
        team_2_id
      FROM matches
      ORDER BY match_datetime ASC
    `);

    console.table(mappingCheck);

  } catch (err) {
    console.error('Error testing matches table:', err);
  } finally {
    await db.end();
  }
}

testMatches();