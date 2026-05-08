const db = require('../db');

async function run() {
  try {
    const [users] = await db.query(`
      SELECT user_id
      FROM users
    `);

    for (const user of users) {
      const userId = user.user_id;

      const [[totals]] = await db.query(`
        SELECT
          SUM(status = 'won') AS tips_won,
          SUM(status = 'lost') AS tips_lost
        FROM tips
        WHERE user_id = ?
          AND status IN ('won', 'lost')
      `, [userId]);

      const [resolvedTips] = await db.query(`
        SELECT status
        FROM tips
        WHERE user_id = ?
          AND status IN ('won', 'lost')
        ORDER BY tip_time ASC, tip_id ASC
      `, [userId]);

      let currentStreak = 0;
      let bestStreak = 0;

      for (const tip of resolvedTips) {
        if (tip.status === 'won') {
          currentStreak++;
          if (currentStreak > bestStreak) {
            bestStreak = currentStreak;
          }
        } else {
          currentStreak = 0;
        }
      }

      await db.query(`
        UPDATE users
        SET tips_won = ?,
            tips_lost = ?,
            current_tip_streak = ?,
            best_tip_streak = ?
        WHERE user_id = ?
      `, [
        Number(totals.tips_won || 0),
        Number(totals.tips_lost || 0),
        currentStreak,
        bestStreak,
        userId
      ]);

      console.log(`Updated user ${userId}`);
    }

    console.log('Backfill complete.');
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exit(1);
  }
}

run();