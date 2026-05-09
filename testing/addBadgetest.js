const db = require('../db');

async function run() {
  try {
    await db.query(`
      UPDATE users
      SET badge_type = 'owner'
      WHERE user_id = 1
    `);

    await db.query(`
      UPDATE users
      SET badge_type = 'vip'
      WHERE user_id = 27
    `);

    console.log('Badges updated successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to update badges:', err);
    process.exit(1);
  }
}

run();