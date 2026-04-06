const db = require("../db");
const bcrypt = require("bcrypt");

const TEST_EMAIL = "tester@owcs.com";
const TEST_PASSWORD = "password123";

async function seedTestTipsUser() {
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

    // Check if user already exists
    const [existingUsers] = await connection.query(
      `SELECT user_id FROM users WHERE email = ? LIMIT 1`,
      [TEST_EMAIL]
    );

    let userId;

    if (existingUsers.length > 0) {
      userId = existingUsers[0].user_id;

      await connection.query(
        `
        UPDATE users
        SET username = ?, password = ?, credits = ?, is_admin = ?
        WHERE user_id = ?
        `,
        ["Test", hashedPassword, 2500.00, 1, userId]
      );
    } else {
      const [insertUser] = await connection.query(
        `
        INSERT INTO users (username, email, profile_pic, credits, is_admin, password)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        ["Test", TEST_EMAIL, null, 2500.00, 0, hashedPassword]
      );

      userId = insertUser.insertId;
    }

    // Remove any old tips from this test user so reruns stay clean
    await connection.query(
      `DELETE FROM tips WHERE user_id = ?`,
      [userId]
    );

    // Get up to 5 upcoming matches
    const [matches] = await connection.query(
      `
      SELECT
        match_id,
        team_1_id,
        team_2_id,
        team_1_odds,
        team_2_odds,
        match_datetime,
        completed
      FROM matches
      WHERE completed = FALSE
      ORDER BY match_datetime ASC
      LIMIT 5
      `
    );

    if (matches.length === 0) {
      throw new Error("No upcoming matches found. Seed matches first.");
    }

    let totalTipped = 0;

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];

      // Alternate between tipping team 1 and team 2
      const pickTeam1 = i % 2 === 0;

      const selectedTeamId = pickTeam1 ? match.team_1_id : match.team_2_id;
      const odds = pickTeam1 ? Number(match.team_1_odds) : Number(match.team_2_odds);

      // Give varying tip amounts
      const amountTipped = Number((50 + i * 25).toFixed(2));

      totalTipped += amountTipped;

      await connection.query(
        `
        INSERT INTO tips (
          user_id,
          match_id,
          selected_team_id,
          odds,
          amount_tipped,
          status,
          tip_time
        )
        VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
        `,
        [userId, match.match_id, selectedTeamId, odds, amountTipped]
      );
    }

    // Adjust user credits after placing tips
    const remainingCredits = Number((2500.00 - totalTipped).toFixed(2));

    await connection.query(
      `UPDATE users SET credits = ? WHERE user_id = ?`,
      [remainingCredits, userId]
    );

    await connection.commit();

    console.log("Test tipping user created successfully.");
    console.log(`Email: ${TEST_EMAIL}`);
    console.log(`Password: ${TEST_PASSWORD}`);
    console.log(`User ID: ${userId}`);
    console.log(`Upcoming tipped matches created: ${matches.length}`);
    console.log(`Remaining credits: ${remainingCredits.toFixed(2)}`);

    process.exit(0);
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Error creating test tips user:", err);
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

seedTestTipsUser();

// tester@owcs.com

// password123