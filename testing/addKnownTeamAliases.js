const db = require('../db');

async function run() {
  try {
    console.log('[Aliases] Adding known Liquipedia aliases...');

    // Spacestation Gaming -> Space Station Gaming
    const [ssgResult] = await db.query(`
      INSERT IGNORE INTO team_aliases (team_id, source, alias_name)
      SELECT team_id, 'liquipedia', 'Spacestation Gaming'
      FROM teams
      WHERE name = 'Space Station Gaming'
    `);

    console.log('[Aliases] SSG alias added or already existed.');

    // Geekay Esports -> Geekay
    const [geekayResult] = await db.query(`
      INSERT IGNORE INTO team_aliases (team_id, source, alias_name)
      SELECT team_id, 'liquipedia', 'Geekay Esports'
      FROM teams
      WHERE name = 'Geekay'
    `);

    console.log('[Aliases] Geekay alias added or already existed.');

    console.log('\n[Aliases] Done.');
    process.exit(0);
  } catch (err) {
    console.error('[Aliases] Failed:', err);
    process.exit(1);
  }
}

run(); // yes