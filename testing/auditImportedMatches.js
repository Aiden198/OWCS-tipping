const db = require('../db');

async function run() {
  try {
    const [matchCounts] = await db.query(`
      SELECT
        c.title AS competition,
        COUNT(*) AS total_matches,
        SUM(CASE WHEN m.completed = 1 THEN 1 ELSE 0 END) AS completed_matches,
        SUM(CASE WHEN m.completed = 0 THEN 1 ELSE 0 END) AS upcoming_matches
      FROM matches m
      JOIN competitions c ON m.competition_id = c.competition_id
      GROUP BY c.competition_id, c.title
      ORDER BY c.title
    `);

    const [statusCounts] = await db.query(`
      SELECT status, COUNT(*) AS count
      FROM matches
      GROUP BY status
      ORDER BY status
    `);

    const [missingTeams] = await db.query(`
      SELECT match_id, source_match_key, source_team_1_name, source_team_2_name
      FROM matches
      WHERE team_1_id IS NULL OR team_2_id IS NULL
      ORDER BY match_id
    `);

    const [missingWinners] = await db.query(`
      SELECT match_id, source_match_key, source_team_1_name, source_team_2_name,
             team_1_score, team_2_score, winning_team_id
      FROM matches
      WHERE completed = 1 AND winning_team_id IS NULL
      ORDER BY match_id
    `);

    const [futureCompleted] = await db.query(`
      SELECT match_id, source_match_key, match_datetime, status, completed
      FROM matches
      WHERE completed = 1 AND match_datetime > NOW()
      ORDER BY match_datetime
    `);

    const [duplicateKeys] = await db.query(`
      SELECT source_match_key, COUNT(*) AS count
      FROM matches
      GROUP BY source_match_key
      HAVING COUNT(*) > 1
    `);

    console.log('\n=== Matches by Competition ===');
    console.table(matchCounts);

    console.log('\n=== Match Status Counts ===');
    console.table(statusCounts);

    console.log('\n=== Matches Missing Team Links ===');
    console.table(missingTeams);

    console.log('\n=== Completed Matches Missing Winner ===');
    console.table(missingWinners);

    console.log('\n=== Completed Matches in the Future ===');
    console.table(futureCompleted);

    console.log('\n=== Duplicate Source Keys ===');
    console.table(duplicateKeys);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();