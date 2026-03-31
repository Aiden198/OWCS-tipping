const db = require("../database/db");

function addHours(date, hours) {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

async function seedMatches() {
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Wipe dependent rows first
    await connection.query("DELETE FROM tips");
    await connection.query("DELETE FROM matches");

    const [teams] = await connection.query(`
      SELECT team_id, name, abbreviation, region
      FROM teams
      WHERE active = TRUE
      ORDER BY region, team_id
    `);

    const naTeams = teams.filter((team) => team.region === "NA");
    const emeaTeams = teams.filter((team) => team.region === "EMEA");

    if (naTeams.length < 2 || emeaTeams.length < 2) {
      throw new Error("Not enough teams in one or both regions to create matches.");
    }

    // Same-region pairings only
    const naPairings = [
      [naTeams.find(t => t.abbreviation === "TL") || naTeams[0], naTeams.find(t => t.abbreviation === "SSG") || naTeams[1]],
      [naTeams.find(t => t.abbreviation === "DAL") || naTeams[2], naTeams.find(t => t.abbreviation === "DSG") || naTeams[3]],
      [naTeams.find(t => t.abbreviation === "LNX") || naTeams[4], naTeams.find(t => t.abbreviation === "EXN") || naTeams[5]],
      [naTeams.find(t => t.abbreviation === "SSG") || naTeams[1], naTeams.find(t => t.abbreviation === "DAL") || naTeams[2]],
      [naTeams.find(t => t.abbreviation === "TL") || naTeams[0], naTeams.find(t => t.abbreviation === "LNX") || naTeams[4]],
      [naTeams.find(t => t.abbreviation === "DSG") || naTeams[3], naTeams.find(t => t.abbreviation === "EXN") || naTeams[5]]
    ];

    const emeaPairings = [
      [emeaTeams.find(t => t.abbreviation === "PEP") || emeaTeams[0], emeaTeams.find(t => t.abbreviation === "TM") || emeaTeams[1]],
      [emeaTeams.find(t => t.abbreviation === "QAD") || emeaTeams[2], emeaTeams.find(t => t.abbreviation === "VP") || emeaTeams[3]],
      [emeaTeams.find(t => t.abbreviation === "AL") || emeaTeams[4], emeaTeams.find(t => t.abbreviation === "GK") || emeaTeams[5]],
      [emeaTeams.find(t => t.abbreviation === "TM") || emeaTeams[1], emeaTeams.find(t => t.abbreviation === "QAD") || emeaTeams[2]],
      [emeaTeams.find(t => t.abbreviation === "VP") || emeaTeams[3], emeaTeams.find(t => t.abbreviation === "PEP") || emeaTeams[0]],
      [emeaTeams.find(t => t.abbreviation === "GK") || emeaTeams[5], emeaTeams.find(t => t.abbreviation === "AL") || emeaTeams[4]]
    ];

    const now = new Date();

    const matchesToInsert = [];

    for (let i = 0; i < 6; i++) {
      const [na1, na2] = naPairings[i];
      const [eu1, eu2] = emeaPairings[i];

      matchesToInsert.push({
        team1: na1,
        team2: na2,
        datetime: addHours(now, 24 + i * 8),
        team1Odds: 1.75 + (i * 0.05),
        team2Odds: 2.05 - (i * 0.03)
      });

      matchesToInsert.push({
        team1: eu1,
        team2: eu2,
        datetime: addHours(now, 28 + i * 8),
        team1Odds: 1.80 + (i * 0.04),
        team2Odds: 1.95 - (i * 0.02)
      });
    }

    for (const match of matchesToInsert) {
      await connection.query(`
        INSERT INTO matches (
          team_1_id,
          team_2_id,
          match_datetime,
          team_1_odds,
          team_2_odds,
          completed,
          team_1_score,
          team_2_score,
          winning_team_id
        )
        VALUES (?, ?, ?, ?, ?, FALSE, NULL, NULL, NULL)
      `, [
        match.team1.team_id,
        match.team2.team_id,
        match.datetime,
        match.team1Odds.toFixed(2),
        match.team2Odds.toFixed(2)
      ]);
    }

    await connection.commit();

    console.log("Inserted 12 test matches successfully.");
    process.exit(0);
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Error seeding matches:", err);
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

seedMatches();