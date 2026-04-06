require('dotenv').config();
const db = require('../db');

async function main() {
  try {
    const [teamRows] = await db.query(
      `
      SELECT team_id, name
      FROM teams
      WHERE name = 'FURY'
      LIMIT 1
      `
    );

    if (teamRows.length === 0) {
      throw new Error('FURY team not found. Fix the team row first.');
    }

    const teamId = teamRows[0].team_id;

    await db.query(
      `
      INSERT INTO team_aliases (team_id, source, alias_name)
      SELECT ?, 'liquipedia', ?
      WHERE NOT EXISTS (
        SELECT 1
        FROM team_aliases
        WHERE source = 'liquipedia'
          AND alias_name = ?
      )
      `,
      [teamId, 'F(T', 'F(T']
    );

    console.log('Added alias F(T -> FURY');
  } catch (err) {
    console.error('Failed to add alias:', err);
    process.exit(1);
  }

  process.exit(0);
}

main();