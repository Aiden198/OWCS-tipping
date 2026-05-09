// testing/backfillResolvedAt.js

const db = require("../db");

async function run() {
  try {
    const [result] = await db.query(`
      UPDATE tips t
      JOIN matches m ON t.match_id = m.match_id
      SET t.resolved_at = DATE_ADD(m.match_datetime, INTERVAL 1 HOUR)
      WHERE t.status IN ('won', 'lost')
        AND m.match_datetime IS NOT NULL
    `);

    console.log(`Updated ${result.affectedRows} resolved tips.`);
    process.exit(0);
  } catch (err) {
    console.error("Failed to backfill resolved_at:");
    console.error(err);
    process.exit(1);
  }
}

run();