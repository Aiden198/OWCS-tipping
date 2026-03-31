const express = require('express');
const router = express.Router();
const db = require('../../database/db');

router.post('/', async function (req, res) {
  const sessionUser = req.session.user;

  if (!sessionUser) {
    return res.status(401).send('You must be logged in to place a tip.');
  }

  const { match_id, selected_team_id, amount_tipped } = req.body;

  const matchId = Number(match_id);
  const selectedTeamId = Number(selected_team_id);
  const amountTipped = Number(amount_tipped);

  if (!matchId || !selectedTeamId || !amountTipped) {
    return res.status(400).send('Missing required tip information.');
  }

  if (!Number.isFinite(amountTipped) || amountTipped <= 0) {
    return res.status(400).send('Tip amount must be greater than 0.');
  }

  let connection;

  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    const [matchRows] = await connection.query(`
      SELECT
        match_id,
        team_1_id,
        team_2_id,
        team_1_odds,
        team_2_odds,
        match_datetime,
        completed
      FROM matches
      WHERE match_id = ?
      LIMIT 1
    `, [matchId]);

    if (matchRows.length === 0) {
      await connection.rollback();
      return res.status(404).send('Match not found.');
    }

    const match = matchRows[0];

    if (match.completed) {
      await connection.rollback();
      return res.status(400).send('This match has already been completed.');
    }

    const now = new Date();
    const matchTime = new Date(match.match_datetime);

    if (now >= matchTime) {
      await connection.rollback();
      return res.status(400).send('Tipping for this match has closed.');
    }

    let lockedOdds = null;

    if (selectedTeamId === match.team_1_id) {
      lockedOdds = Number(match.team_1_odds);
    } else if (selectedTeamId === match.team_2_id) {
      lockedOdds = Number(match.team_2_odds);
    } else {
      await connection.rollback();
      return res.status(400).send('Selected team is not part of this match.');
    }

    const [userRows] = await connection.query(`
      SELECT user_id, credits
      FROM users
      WHERE user_id = ?
      LIMIT 1
    `, [sessionUser.userID]);

    if (userRows.length === 0) {
      await connection.rollback();
      return res.status(404).send('User not found.');
    }

    const user = userRows[0];

    const [existingTipRows] = await connection.query(`
      SELECT tip_id, amount_tipped
      FROM tips
      WHERE user_id = ? AND match_id = ?
      LIMIT 1
    `, [sessionUser.userID, matchId]);

    const existingTip = existingTipRows[0] || null;
    const oldAmount = existingTip ? Number(existingTip.amount_tipped) : 0;

    const effectiveAvailableCredits = Number(user.credits) + oldAmount;

    if (effectiveAvailableCredits < amountTipped) {
      await connection.rollback();
      return res.status(400).send('You do not have enough credits for this tip.');
    }

    const newCredits = effectiveAvailableCredits - amountTipped;

    if (existingTip) {
      await connection.query(`
        UPDATE tips
        SET selected_team_id = ?, odds = ?, amount_tipped = ?, status = 'pending', tip_time = CURRENT_TIMESTAMP
        WHERE tip_id = ?
      `, [selectedTeamId, lockedOdds, amountTipped, existingTip.tip_id]);
    } else {
      await connection.query(`
        INSERT INTO tips (user_id, match_id, selected_team_id, odds, amount_tipped, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `, [sessionUser.userID, matchId, selectedTeamId, lockedOdds, amountTipped]);
    }

    await connection.query(`
      UPDATE users
      SET credits = ?
      WHERE user_id = ?
    `, [newCredits, sessionUser.userID]);

    req.session.user.credits = newCredits;

    await connection.commit();

    return res.status(200).json({
      message: existingTip ? 'Tip updated successfully.' : 'Tip placed successfully.',
      credits: newCredits
    });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }

    console.error('Tip submission error:', err);
    return res.status(500).send('Internal server error.');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;