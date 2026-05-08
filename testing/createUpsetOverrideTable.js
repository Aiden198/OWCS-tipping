const db = require('../db');

async function run() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS upset_overrides (
        override_id INT AUTO_INCREMENT PRIMARY KEY,
        match_id INT NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (match_id) REFERENCES matches(match_id) ON DELETE CASCADE
      )
    `);

    console.log('upset_overrides table created or already exists.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create upset_overrides table:', err);
    process.exit(1);
  }
}

run();