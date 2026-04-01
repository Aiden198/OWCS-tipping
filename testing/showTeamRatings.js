const db = require('../db');

async function showTeamRatings() {
  try {
    const [rows] = await db.query(`
      SELECT team_id, name, abbreviation, rating
      FROM teams
      ORDER BY rating DESC, name ASC
    `);

    console.table(rows);
  } catch (err) {
    console.error('Error showing team ratings:', err);
  } finally {
    await db.end();
  }
}

showTeamRatings();