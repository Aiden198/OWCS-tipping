const db = require("../db");

const TEST_EMAIL = "tester@owcs.com";

async function seedResults() {
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Find the test user
    const [users] = await connection.query(
      `SELECT user_id FROM users WHERE email = ? LIMIT 1`,
      [TEST_EMAIL]
    );

    if (users.length === 0) {
      throw new Error(`Test user not found: ${TEST_EMAIL}`);
    }

    const userId = users[0].user_id;

    // Find matches this user has tipped on
    const [tippedMatches] = await connection.query(`
      SELECT
        t.tip_id,
        t.match_id,
        t.selected_team_id,
        m.team_1_id,
        m.team_2_id
      FROM tips t
      JOIN matches m ON t.match_id = m.match_id
      WHERE t.user_id = ?
        AND m.completed = FALSE
      ORDER BY m.match_datetime ASC
      LIMIT 3
    `, [userId]);

    if (tippedMatches.length === 0) {
      throw new Error("No tipped incomplete matches found for the test user.");
    }

    // Mark tipped matches as completed and make the user win all of them
    for (let i = 0; i < tippedMatches.length; i++) {
      const match = tippedMatches[i];
      const selectedTeamId = match.selected_team_id;

      let team1Score = 3;
      let team2Score = 1;

      // If selected team is team 2, swap scoreline so they still win
      if (selectedTeamId === match.team_2_id) {
        team1Score = 1;
        team2Score = 3;
      }

      await connection.query(`
        UPDATE matches
        SET
          completed = TRUE,
          winning_team_id = ?,
          team_1_score = ?,
          team_2_score = ?
        WHERE match_id = ?
      `, [selectedTeamId, team1Score, team2Score, match.match_id]);

      await connection.query(`
        UPDATE tips
        SET status = 'won'
        WHERE tip_id = ?
      `, [match.tip_id]);
    }

    // Find 2 extra incomplete matches the user did NOT tip on
    const [untippedMatches] = await connection.query(`
      SELECT
        m.match_id,
        m.team_1_id,
        m.team_2_id
      FROM matches m
      WHERE m.completed = FALSE
        AND m.match_id NOT IN (
          SELECT match_id FROM tips WHERE user_id = ?
        )
      ORDER BY m.match_datetime ASC
      LIMIT 2
    `, [userId]);

    for (let i = 0; i < untippedMatches.length; i++) {
      const match = untippedMatches[i];

      await connection.query(`
        UPDATE matches
        SET
          completed = TRUE,
          winning_team_id = ?,
          team_1_score = 3,
          team_2_score = 2
        WHERE match_id = ?
      `, [match.team_1_id, match.match_id]);
    }

    await connection.commit();

    console.log(`Marked ${tippedMatches.length} tipped matches as completed and won.`);
    console.log(`Marked ${untippedMatches.length} untipped matches as completed.`);
    process.exit(0);
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Error seeding test results:", err);
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

seedResults();