const db = require('../db');

async function run() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS news_items (
        news_id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        body TEXT,
        source_url VARCHAR(500),
        related_match_id INT NULL,
        status ENUM('draft', 'published', 'ignored') DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        published_at DATETIME NULL
      )
    `);

    console.log('news_items table created or already exists.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create news_items table:');
    console.error(err);
    process.exit(1);
  }
}

run();