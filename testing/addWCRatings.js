require('dotenv').config();
const db = require('../db');

const TEAM_RATINGS = {
  // =========================
  // AMERICAS
  // =========================
  'Team United States': 1580,
  'Team Canada': 1485,
  'Team Mexico': 1425,

  'Team Brazil': 1245,
  'Team Colombia': 1225,

  'Team Chile': 1200,
  'Team Puerto Rico': 1200,
  'Team Argentina': 1200,

  // =========================
  // EMEA
  // =========================
  'Team France': 1515,
  'Team United Kingdom': 1495,
  'Team Sweden': 1485,
  'Team Germany': 1465,

  'Team Finland': 1380,
  'Team Denmark': 1375,
  'Team Norway': 1360,
  'Team Spain': 1350,

  'Team Poland': 1270,
  'Team Austria': 1250,
  'Team Portugal': 1235,
  'Team Ireland': 1225,

  // =========================
  // ASIA / PACIFIC
  // =========================
  'Team South Korea': 1665,
  'Team Japan': 1530,
  'Team Australia': 1435,

  'Team Thailand': 1275,
  'Team Philippines': 1230,

  'Team India': 1200,
  'Team Pakistan': 1185,
  'Team Hong Kong': 1180,
};

async function run() {
  try {
    let updated = 0;

    for (const [teamName, rating] of Object.entries(TEAM_RATINGS)) {
      const [result] = await db.query(
        `
        UPDATE teams
        SET rating = ?
        WHERE name = ?
        AND region = 'World Cup'
        `,
        [rating, teamName]
      );

      if (result.affectedRows > 0) {
        console.log(`Updated ${teamName} -> ${rating}`);
        updated += result.affectedRows;
      } else {
        console.log(`Could not find ${teamName}`);
      }
    }

    console.log(`\nDone. Updated ${updated} teams.`);
    process.exit(0);

  } catch (err) {
    console.error('Failed to update ratings:', err);
    process.exit(1);
  }
}

run();