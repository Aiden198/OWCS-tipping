const db = require('../db');

async function run() {
  try {
    await db.query(`
      ALTER TABLE news_items
      ADD COLUMN image_url VARCHAR(500) NULL
    `);

    console.log('image_url column added to news_items.');
    process.exit(0);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('image_url column already exists.');
      process.exit(0);
    }

    console.error('Failed to add image_url column:');
    console.error(err);
    process.exit(1);
  }
}

run();