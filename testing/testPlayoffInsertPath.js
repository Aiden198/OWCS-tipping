// testing/testPlayoffInsertPath.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const parseCompetitionMetadata = require('../services/liquipedia/parseCompetitionMetadata');
const fetchLiquipediaMatches = require('../services/liquipedia/fetchLiquipediaMatches');
const normalizeLiquipediaApiMatch = require('../services/liquipedia/normalizeLiquipediaApiMatch');
const resolveTeamAlias = require('../services/liquipedia/resolveTeamAlias');
const db = require('../db');

async function testPage(pageUrl) {
  const pageName = new URL(pageUrl).pathname.replace(/^\/overwatch\//, '');
  const meta = parseCompetitionMetadata(pageUrl);

  console.log('\n==================================================');
  console.log('PAGE:', pageUrl);

  const matches = await fetchLiquipediaMatches(pageName, 0, 50);

  for (const raw of matches) {
    const normalized = normalizeLiquipediaApiMatch(raw, meta);

    if (!normalized) {
      console.log('NORMALIZED = null', raw.match2id);
      continue;
    }

    const team1 = await resolveTeamAlias(normalized.source_team_1_name);
    const team2 = await resolveTeamAlias(normalized.source_team_2_name);

    const [dbRows] = await db.query(
      `
      SELECT
        m.match_id,
        m.source_match_key,
        m.match_datetime,
        m.completed,
        t1.name AS team1_name,
        t2.name AS team2_name
      FROM matches m
      LEFT JOIN teams t1 ON m.team_1_id = t1.team_id
      LEFT JOIN teams t2 ON m.team_2_id = t2.team_id
      WHERE m.source_match_key = ?
      `,
      [normalized.source_match_key]
    );

    console.log({
      source_match_key: normalized.source_match_key,
      source_team_1_name: normalized.source_team_1_name,
      source_team_2_name: normalized.source_team_2_name,
      resolved_team_1: team1 ? `${team1.team_id} - ${team1.name}` : null,
      resolved_team_2: team2 ? `${team2.team_id} - ${team2.name}` : null,
      match_datetime: normalized.match_datetime,
      in_db: dbRows.length > 0,
      db_row: dbRows[0] || null
    });
  }
}

async function main() {
  try {
    await testPage('https://liquipedia.net/overwatch/Overwatch_Champions_Series/2026/NA/Stage_1');
    await testPage('https://liquipedia.net/overwatch/Overwatch_Champions_Series/2026/EMEA/Stage_1');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();