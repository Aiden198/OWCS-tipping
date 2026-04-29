const db = require("../db");

const results = [
  {
    date: "2026-04-24",
    team1Names: ["T1"],
    team2Names: ["ZAN Esports", "ZAN", "ZE"],
    team1Score: 3,
    team2Score: 0
  },
  {
    date: "2026-04-25",
    team1Names: ["Poker Face", "PF"],
    team2Names: ["Cheeseburger", "CHE"],
    team1Score: 2,
    team2Score: 3
  }
];

function normaliseNames(names) {
  return names.map(name => name.toLowerCase());
}

function rowSideMatches(row, side, names) {
  const values = [
    row[`source_team_${side}_name`],
    row[`team_${side}_name`],
    row[`team_${side}_abbreviation`]
  ]
    .filter(Boolean)
    .map(value => value.toLowerCase());

  return values.some(value => names.includes(value));
}

async function findMatch(connection, result) {
  const team1 = normaliseNames(result.team1Names);
  const team2 = normaliseNames(result.team2Names);

  const params = [
    team1, team1, team1,
    team2, team2, team2,
    team2, team2, team2,
    team1, team1, team1,
    result.date
  ];

  const [matches] = await connection.query(`
    SELECT
      m.match_id,
      m.match_datetime,
      m.team_1_id,
      m.team_2_id,
      m.source_team_1_name,
      m.source_team_2_name,
      t1.name AS team_1_name,
      t1.abbreviation AS team_1_abbreviation,
      t2.name AS team_2_name,
      t2.abbreviation AS team_2_abbreviation
    FROM matches m
    LEFT JOIN teams t1 ON m.team_1_id = t1.team_id
    LEFT JOIN teams t2 ON m.team_2_id = t2.team_id
    WHERE
      (
        (
          (
            LOWER(m.source_team_1_name) IN (?)
            OR LOWER(t1.name) IN (?)
            OR LOWER(t1.abbreviation) IN (?)
          )
          AND
          (
            LOWER(m.source_team_2_name) IN (?)
            OR LOWER(t2.name) IN (?)
            OR LOWER(t2.abbreviation) IN (?)
          )
        )
        OR
        (
          (
            LOWER(m.source_team_1_name) IN (?)
            OR LOWER(t1.name) IN (?)
            OR LOWER(t1.abbreviation) IN (?)
          )
          AND
          (
            LOWER(m.source_team_2_name) IN (?)
            OR LOWER(t2.name) IN (?)
            OR LOWER(t2.abbreviation) IN (?)
          )
        )
      )
      AND DATE(m.match_datetime) = ?
    ORDER BY m.match_datetime DESC
  `, params);

  return matches;
}

async function updateResults() {
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    for (const result of results) {
      const matches = await findMatch(connection, result);

      if (matches.length === 0) {
        console.log(`❌ No match found: ${result.team1Names[0]} vs ${result.team2Names[0]}`);
        continue;
      }

      if (matches.length > 1) {
        console.log(
          `⚠️ Multiple matches found for ${result.team1Names[0]} vs ${result.team2Names[0]}, using most recent: ${matches[0].match_id}`
        );
        console.table(matches);
      }

      const match = matches[0];

      const storedSameWay = rowSideMatches(
        match,
        1,
        normaliseNames(result.team1Names)
      );

      const team1Score = storedSameWay ? result.team1Score : result.team2Score;
      const team2Score = storedSameWay ? result.team2Score : result.team1Score;

      const winningTeamId =
        team1Score > team2Score
          ? match.team_1_id
          : match.team_2_id;

      await connection.query(`
        UPDATE matches
        SET
          status = 'completed',
          completed = TRUE,
          resolved = FALSE,
          team_1_score = ?,
          team_2_score = ?,
          winning_team_id = ?
        WHERE match_id = ?
      `, [
        team1Score,
        team2Score,
        winningTeamId,
        match.match_id
      ]);

      console.log(
        `✅ Updated match ${match.match_id}: ` +
        `${match.source_team_1_name || match.team_1_name} ${team1Score}-${team2Score} ` +
        `${match.source_team_2_name || match.team_2_name}`
      );
    }

    await connection.commit();
    console.log("\nDone updating match results.");
    process.exit(0);
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Error updating match results:", err);
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

updateResults();