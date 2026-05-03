require('dotenv').config();
const db = require('../db');

async function run() {
  try {
    const [result] = await db.query(`
      DELETE FROM matches
      WHERE match_datetime < DATE_SUB(NOW(), INTERVAL 1 MONTH)
        AND completed = TRUE
        AND resolved = TRUE
    `);

    console.log(`Deleted ${result.affectedRows} old matches.`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to clean old matches:', err);
    process.exit(1);
  }
}

run();