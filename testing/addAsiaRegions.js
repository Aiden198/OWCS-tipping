require('dotenv').config();
const db = require('../db');

const regionMappings = {
  China: [
    { name: 'Weibo Gaming' },
    { name: 'JD Gaming' },
    { name: 'All Gamers' },
    { name: 'Milk Tea' },
    { name: 'Homie E' },
    { name: 'DEG' },
    { name: 'Solus Victorem' },
    { name: 'Naive Piggy' }
  ],

  Japan: [
    { name: 'VARREL' },
    { name: "Tokyo Ta1yo's" },
    { like: 'Please Not Hero Ban' },
    { name: '99DIVINE' },
    { name: 'Telomere' },
    { name: 'Lazuli' },
    { name: 'ENTER FORCE.36' },
    { name: 'Nyam Gaming' }
  ],

  Korea: [
    { name: 'T1' },
    { name: 'Team Falcons' },
    { name: 'Crazy Raccoon' },
    { name: 'ZETA DIVISION' },
    { name: 'New Era' },
    { name: 'ONSIDE GAMING' },
    { name: 'ZAN Esports' },
    { name: 'Cheeseburger' },
    { name: 'Poker Face' }
  ],

  Pacific: [
    { name: 'Team Secret' },
    { like: 'The Gatos Guapos' },
    { name: 'MMY' },
    { name: 'FURY' },
    { name: 'Rankers' },
    { name: 'Quasar Esports' }
  ]
};

async function updateTeamRegion(connection, region, teamRef) {
  let rows;
  let sql;
  let params;

  if (teamRef.name) {
    sql = `
      SELECT team_id, name, region
      FROM teams
      WHERE name = ?
      LIMIT 1
    `;
    params = [teamRef.name];
  } else if (teamRef.like) {
    sql = `
      SELECT team_id, name, region
      FROM teams
      WHERE name LIKE ?
      LIMIT 1
    `;
    params = [teamRef.like];
  } else {
    throw new Error(`Invalid team reference: ${JSON.stringify(teamRef)}`);
  }

  [rows] = await connection.query(sql, params);

  if (rows.length === 0) {
    return {
      found: false,
      updated: false,
      team: teamRef.name || teamRef.like
    };
  }

  const team = rows[0];

  if (team.region === region) {
    return {
      found: true,
      updated: false,
      team: team.name
    };
  }

  await connection.query(
    `
      UPDATE teams
      SET region = ?
      WHERE team_id = ?
    `,
    [region, team.team_id]
  );

  return {
    found: true,
    updated: true,
    team: team.name
  };
}

async function main() {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let updatedCount = 0;
    let unchangedCount = 0;
    const missingTeams = [];

    for (const [region, teams] of Object.entries(regionMappings)) {
      console.log(`\nUpdating ${region} teams...`);

      for (const teamRef of teams) {
        const result = await updateTeamRegion(connection, region, teamRef);

        if (!result.found) {
          console.log(`  Missing: ${result.team}`);
          missingTeams.push({ region, team: result.team });
          continue;
        }

        if (result.updated) {
          console.log(`  Updated: ${result.team} -> ${region}`);
          updatedCount++;
        } else {
          console.log(`  Unchanged: ${result.team} already ${region}`);
          unchangedCount++;
        }
      }
    }

    await connection.commit();

    console.log('\n=== Region Update Complete ===');
    console.log(`Updated: ${updatedCount}`);
    console.log(`Already correct: ${unchangedCount}`);
    console.log(`Missing: ${missingTeams.length}`);

    if (missingTeams.length > 0) {
      console.log('\nMissing teams:');
      for (const item of missingTeams) {
        console.log(`- [${item.region}] ${item.team}`);
      }
    }
  } catch (err) {
    await connection.rollback();
    console.error('\nRegion update failed, rolled back.');
    console.error(err);
    process.exit(1);
  } finally {
    connection.release();
    process.exit(0);
  }
}

main();