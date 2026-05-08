const db = require('../db');

async function addColumn(sql, name) {
  try {
    await db.query(sql);
    console.log(`Added ${name}`);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log(`${name} already exists`);
      return;
    }
    throw err;
  }
}

async function run() {
  try {
    await addColumn(`
      ALTER TABLE users
      ADD COLUMN tips_won INT DEFAULT 0
    `, 'tips_won');

    await addColumn(`
      ALTER TABLE users
      ADD COLUMN tips_lost INT DEFAULT 0
    `, 'tips_lost');

    await addColumn(`
      ALTER TABLE users
      ADD COLUMN current_tip_streak INT DEFAULT 0
    `, 'current_tip_streak');

    await addColumn(`
      ALTER TABLE users
      ADD COLUMN best_tip_streak INT DEFAULT 0
    `, 'best_tip_streak');

    console.log('User tip stats migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();