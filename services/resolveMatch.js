const db = require("../database/db");

async function resolveMatch(matchId) {
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [matchRows] = await connection.query(
      `
      SELECT
        match_id,
        completed,
        resolved,
        winning_team_id
      FROM matches
      WHERE match_id = ?
      LIMIT 1
      `,
      [matchId]
    );

    if (matchRows.length === 0) {
      throw new Error("Match not found.");
    }

    const match = matchRows[0];

    if (!match.completed) {
      throw new Error("Match is not completed yet.");
    }

    if (match.resolved) {
      throw new Error("Match has already been resolved.");
    }

    if (!match.winning_team_id) {
      throw new Error("Winning team is not set for this match.");
    }

    const [tips] = await connection.query(
      `
      SELECT
        tip_id,
        user_id,
        selected_team_id,
        amount_tipped,
        odds
      FROM tips
      WHERE match_id = ?
      `,
      [matchId]
    );

    for (const tip of tips) {
      const amountTipped = Number(tip.amount_tipped);
      const odds = Number(tip.odds);
      const tippedCorrectly =
        Number(tip.selected_team_id) === Number(match.winning_team_id);

      if (tippedCorrectly) {
        const payout = amountTipped * odds;

        await connection.query(
          `
          UPDATE users
          SET credits = credits + ?
          WHERE user_id = ?
          `,
          [payout, tip.user_id]
        );

        await connection.query(
          `
          UPDATE tips
          SET status = 'won'
          WHERE tip_id = ?
          `,
          [tip.tip_id]
        );
      } else {
        await connection.query(
          `
          UPDATE tips
          SET status = 'lost'
          WHERE tip_id = ?
          `,
          [tip.tip_id]
        );
      }
    }

    await connection.query(
      `
      UPDATE matches
      SET resolved = TRUE
      WHERE match_id = ?
      `,
      [matchId]
    );

    await connection.commit();

    return {
      success: true,
      message: `Match ${matchId} resolved successfully.`,
      resolvedTips: tips.length
    };
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    throw err;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = resolveMatch;