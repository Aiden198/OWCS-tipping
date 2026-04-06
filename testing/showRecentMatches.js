const db = require('../db');

async function run() {
  try {
    const [rows] = await db.query(`
      SELECT
        m.match_id,
        c.title AS competition,
        t1.name AS team_1,
        t2.name AS team_2,
        m.match_datetime,
        m.status,
        m.completed,
        m.team_1_score,
        m.team_2_score,
        tw.name AS winner
      FROM matches m
      JOIN competitions c ON m.competition_id = c.competition_id
      LEFT JOIN teams t1 ON m.team_1_id = t1.team_id
      LEFT JOIN teams t2 ON m.team_2_id = t2.team_id
      LEFT JOIN teams tw ON m.winning_team_id = tw.team_id
      ORDER BY m.match_datetime DESC
      LIMIT 30
    `);

    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();