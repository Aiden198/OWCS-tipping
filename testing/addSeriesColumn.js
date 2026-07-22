const db = require('../db');

async function run() {
  try {
    await db.query(`
      ALTER TABLE competitions
      ADD COLUMN series VARCHAR(50) NOT NULL DEFAULT 'OWCS'
    `);

    console.log('series column added to competitions.');
    process.exit(0);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('series column already exists.');
      process.exit(0);
    }

    console.error('Failed to add series column:');
    console.error(err);
    process.exit(1);
  }
}

run();
