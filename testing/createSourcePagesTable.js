const db = require('../db');

const INITIAL_SOURCE_PAGES = [
  'https://liquipedia.net/overwatch/Overwatch_World_Cup/2026',
  'https://liquipedia.net/overwatch/Overwatch_Champions_Series/2026/Midseason_Championship',
  'https://liquipedia.net/overwatch/Overwatch_Champions_Series/2026/Midseason_Championship/Group_Stage',
  'https://liquipedia.net/overwatch/Overwatch_Champions_Series/2026/NA/Stage_2/Relegation',
  'https://liquipedia.net/overwatch/Overwatch_Champions_Series/2026/EMEA/Stage_2/Relegation',
  'https://liquipedia.net/overwatch/FACEIT_League/Season_10/OCE/Master',
  'https://liquipedia.net/overwatch/FACEIT_League/Season_10/OCE/Master/Regular_Season',
  'https://liquipedia.net/overwatch/FACEIT_League/Season_10/OCE/Open',
  'https://liquipedia.net/overwatch/FACEIT_League/Season_10/OCE/Open/Regular_Season'
];

async function run() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS source_pages (
        source_page_id INT AUTO_INCREMENT PRIMARY KEY,
        url VARCHAR(500) NOT NULL,
        label VARCHAR(255) DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uc_source_pages_url (url)
      )
    `);

    for (const url of INITIAL_SOURCE_PAGES) {
      await db.query('INSERT IGNORE INTO source_pages (url) VALUES (?)', [url]);
    }

    console.log('source_pages table created and seeded from services/liquipedia/sourcePages.js.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create source_pages table:', err);
    process.exit(1);
  }
}

run();
