require('dotenv').config();
const db = require('../db');
const resolveAllMatches = require('../services/resolveAllMatches');

const resultsToApply = [
  // April 4
  { team1: 'Al Qadsiah', team2: 'Twisted Minds', score1: 0, score2: 3, winner: 'Twisted Minds' },
  { team1: "Anyone's Legend", team2: 'Team Peps', score1: 3, score2: 2, winner: "Anyone's Legend" },
  { team1: 'Virtus.pro', team2: 'Geekay', score1: 3, score2: 1, winner: 'Virtus.pro' },

  { team1: 'Space Station Gaming', team2: 'Dallas Fuel', score1: 2, score2: 3, winner: 'Dallas Fuel' },
  { team1: 'Team Liquid', team2: 'LuneX Gaming', score1: 3, score2: 1, winner: 'Team Liquid' },

  // April 5
  { team1: 'Virtus.pro', team2: 'Twisted Minds', score1: 0, score2: 3, winner: 'Twisted Minds' },
  { team1: "Anyone's Legend", team2: 'Geekay', score1: 2, score2: 3, winner: 'Geekay' },

  { team1: 'Disguised', team2: 'LuneX Gaming', score1: 1, score2: 3, winner: 'LuneX Gaming' },
  { team1: 'Dallas Fuel', team2: 'Extinction', score1: 3, score2: 0, winner: 'Dallas Fuel' },
  { team1: 'Space Station Gaming', team2: 'Team Liquid', score1: 3, score2: 1, winner: 'Space Station Gaming' }
];

async function applyResults() {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    for (const result of resultsToApply) {
      const [[winnerRow]] = await connection.query(
        `SELECT team_id FROM teams WHERE name = ? LIMIT 1`,
        [result.winner]
      );

      if (!winnerRow) {
        throw new Error(`Winner team not found: ${result.winner}`);
      }

      const [matchRows] = await connection.query(
        `
        SELECT
          m.match_id,
          t1.name AS team_1_name,
          t2.name AS team_2_name
        FROM matches m
        JOIN teams t1 ON m.team_1_id = t1.team_id
        JOIN teams t2 ON m.team_2_id = t2.team_id
        WHERE t1.name = ?
          AND t2.name = ?
          AND m.completed = FALSE
        ORDER BY m.match_datetime ASC
        LIMIT 1
        `,
        [result.team1, result.team2]
      );

      if (matchRows.length === 0) {
        throw new Error(`Uncompleted match not found: ${result.team1} vs ${result.team2}`);
      }

      const match = matchRows[0];

      await connection.query(
        `
        UPDATE matches
        SET
          team_1_score = ?,
          team_2_score = ?,
          winning_team_id = ?,
          completed = TRUE,
          status = 'completed'
        WHERE match_id = ?
        `,
        [result.score1, result.score2, winnerRow.team_id, match.match_id]
      );

      console.log(
        `Updated match ${match.match_id}: ${result.team1} ${result.score1}-${result.score2} ${result.team2}`
      );
    }

    await connection.commit();
    console.log('All match results applied successfully.');
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function main() {
  try {
    console.log('Applying current results...');
    await applyResults();

    console.log('Resolving all completed unresolved matches...');
    const summary = await resolveAllMatches();

    console.log('Resolution summary:', summary);
    process.exit(0);
  } catch (err) {
    console.error('Payout script failed:', err);
    process.exit(1);
  }
}

main();