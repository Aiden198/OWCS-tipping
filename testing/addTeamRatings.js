const db = require('../db');

async function addTeamRatings() {
  let connection;

  try {
    connection = await db.getConnection();

    console.log('Checking if teams.rating exists...');

    console.log('Applying initial team ratings...');

    const ratings = [
      { name: 'Twisted Minds', rating: 1700 },
      { name: 'Virtus.pro', rating: 1600 },
      { name: 'Team Liquid', rating: 1500 },
      { name: 'Space Station Gaming', rating: 1700 },
      { name: 'Dallas Fuel', rating: 1650 },
      { name: 'Geekay', rating: 1500 },
      { name: 'Al Qadsiah', rating: 1500 },
      { name: 'LuneX Gaming', rating: 1550 },
      { name: 'Disguised', rating: 1400 },
      { name: 'Extinction', rating: 1450 },
      { name: 'Team Peps', rating: 1400 },
      { name: "Anyone's Legend", rating: 1400 }
    ];

    for (const team of ratings) {
      const [result] = await connection.query(`
        UPDATE teams
        SET rating = ?
        WHERE name = ?
      `, [team.rating, team.name]);

      if (result.affectedRows === 0) {
        console.log(`No team found for: ${team.name}`);
      } else {
        console.log(`Set ${team.name} -> ${team.rating}`);
      }
    }

    console.log('Initial team ratings applied ✅');

    const [rows] = await connection.query(`
      SELECT team_id, name, abbreviation, region, rating
      FROM teams
      ORDER BY rating DESC, name ASC
    `);

    console.log('\nCurrent team ratings:');
    console.table(rows);

  } catch (err) {
    console.error('Error adding/updating team ratings:', err);
  } finally {
    if (connection) {
      connection.release();
    }
    await db.end();
  }
}

addTeamRatings();