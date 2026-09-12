const db = require('../db');

async function run() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id VARCHAR(128) NOT NULL PRIMARY KEY,
        expires INT UNSIGNED NOT NULL,
        data TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sessions_expires (expires)
      )
    `);

    console.log('sessions table created or already exists.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create sessions table:', err);
    process.exit(1);
  }
}

run();
