const db = require("../db");

function expectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function updateEloRatings(ratingA, ratingB, scoreA, scoreB, kFactor = 32) {
  const expectedA = expectedScore(ratingA, ratingB);
  const expectedB = expectedScore(ratingB, ratingA);

  const newRatingA = Math.round(ratingA + kFactor * (scoreA - expectedA));
  const newRatingB = Math.round(ratingB + kFactor * (scoreB - expectedB));

  return {
    newRatingA,
    newRatingB
  };
}

async function resolveMatch(matchId) {
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [matchRows] = await connection.query(
      `
      SELECT
        match_id,
        team_1_id,
        team_2_id,
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

    if (match.winning_team_id == null) {
      throw new Error("Winning team is not set for this match.");
    }

    const [tips] = await connection.query(
      `
      SELECT
        tip_id,
        user_id,
        selected_team_id,
        amount_tipped,
        odds,
        status
      FROM tips
      WHERE match_id = ?
        AND status = 'pending'
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

    // Elo update
    const [teamRows] = await connection.query(
      `
      SELECT
        team_id,
        rating
      FROM teams
      WHERE team_id IN (?, ?)
      `,
      [match.team_1_id, match.team_2_id]
    );

    if (teamRows.length !== 2) {
      throw new Error("Could not find both teams for Elo update.");
    }

    const team1 = teamRows.find(t => Number(t.team_id) === Number(match.team_1_id));
    const team2 = teamRows.find(t => Number(t.team_id) === Number(match.team_2_id));

    if (!team1 || !team2) {
      throw new Error("Team rating rows missing for Elo update.");
    }

    let scoreA = 0;
    let scoreB = 0;

    if (Number(match.winning_team_id) === Number(match.team_1_id)) {
      scoreA = 1;
      scoreB = 0;
    } else if (Number(match.winning_team_id) === Number(match.team_2_id)) {
      scoreA = 0;
      scoreB = 1;
    } else {
      throw new Error("Winning team does not match either team in match.");
    }

    const { newRatingA, newRatingB } = updateEloRatings(
      Number(team1.rating),
      Number(team2.rating),
      scoreA,
      scoreB
    );

    await connection.query(
      `
      UPDATE teams
      SET rating = ?
      WHERE team_id = ?
      `,
      [newRatingA, team1.team_id]
    );

    await connection.query(
      `
      UPDATE teams
      SET rating = ?
      WHERE team_id = ?
      `,
      [newRatingB, team2.team_id]
    );

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
      resolvedTips: tips.length,
      eloUpdate: {
        team_1_id: team1.team_id,
        old_team_1_rating: Number(team1.rating),
        new_team_1_rating: newRatingA,
        team_2_id: team2.team_id,
        old_team_2_rating: Number(team2.rating),
        new_team_2_rating: newRatingB
      }
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