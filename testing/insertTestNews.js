const db = require('../db');

async function run() {
  try {
    await db.query(`
      INSERT INTO news_items (
        type,
        title,
        body,
        source_url,
        status
      )
      VALUES (?, ?, ?, ?, ?)
    `, [
      'match_result',
      'Team Falcons defeat Crazy Raccoon',
      'Team Falcons secured a 3–1 victory over Crazy Raccoon in OWCS Korea Stage 2.',
      'https://liquipedia.net/overwatch/Main_Page',
      'draft'
    ]);

    console.log('Test news item inserted.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to insert test news item:');
    console.error(err);
    process.exit(1);
  }
}

run();