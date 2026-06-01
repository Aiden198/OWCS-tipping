require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');

const db = require('../db');

const parseCompetitionMetadata = require('../services/liquipedia/parseCompetitionMetadata');
const fetchLiquipediaMatches = require('../services/liquipedia/fetchLiquipediaMatches');
const normalizeLiquipediaApiMatch = require('../services/liquipedia/normalizeLiquipediaApiMatch');
const resolveTeamAlias = require('../services/liquipedia/resolveTeamAlias');
const upsertCompetition = require('../services/liquipedia/upsertCompetition');

const SOURCE_PAGE = 'https://liquipedia.net/overwatch/Overwatch_Champions_Series/2026/Asia/Stage_2/Japan/Regular_Season';

async function upsertSingleMatch(match) {
  const [result] = await db.query(
    `
      INSERT INTO matches (
        competition_id,
        source_match_key,
        source_page,
        source_url,
        team_1_id,
        team_2_id,
        source_team_1_name,
        source_team_2_name,
        match_datetime,
        round_label,
        match_format,
        status,
        completed,
        resolved,
        team_1_score,
        team_2_score,
        winning_team_id,
        last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        competition_id = VALUES(competition_id),
        source_page = VALUES(source_page),
        source_url = VALUES(source_url),
        team_1_id = VALUES(team_1_id),
        team_2_id = VALUES(team_2_id),
        source_team_1_name = VALUES(source_team_1_name),
        source_team_2_name = VALUES(source_team_2_name),
        match_datetime = VALUES(match_datetime),
        round_label = VALUES(round_label),
        match_format = VALUES(match_format),
        status = VALUES(status),
        completed = VALUES(completed),
        team_1_score = VALUES(team_1_score),
        team_2_score = VALUES(team_2_score),
        winning_team_id = VALUES(winning_team_id),
        last_synced_at = NOW()
    `,
    [
      match.competition_id,
      match.source_match_key,
      match.source_page,
      match.source_url,
      match.team_1_id,
      match.team_2_id,
      match.source_team_1_name,
      match.source_team_2_name,
      match.match_datetime,
      match.round_label,
      match.match_format,
      match.status,
      match.completed,
      false,
      match.team_1_score,
      match.team_2_score,
      match.winning_team_id
    ]
  );

  return {
    affectedRows: result.affectedRows,
    insertId: result.insertId,
    type: result.insertId && result.affectedRows === 1 ? 'inserted' : 'updated'
  };
}

async function main() {
  const report = {
    sourcePage: SOURCE_PAGE,
    pageName: null,
    competitionMeta: null,
    competitionId: null,
    rawMatches: [],
    processedMatches: [],
    summary: {
      rawFound: 0,
      normalized: 0,
      inserted: 0,
      updated: 0,
      skippedInvalid: 0,
      skippedUnmatchedTeams: 0,
      upsertErrors: 0
    }
  };

  try {
    const competitionMeta = parseCompetitionMetadata(SOURCE_PAGE);
    const competitionId = await upsertCompetition(competitionMeta);

    const pageName = new URL(SOURCE_PAGE).pathname.replace(/^\/overwatch\//, '');

    report.pageName = pageName;
    report.competitionMeta = competitionMeta;
    report.competitionId = competitionId;

    const rawMatches = await fetchLiquipediaMatches(pageName, 0, 50);

    report.rawMatches = rawMatches;
    report.summary.rawFound = rawMatches.length;

    for (const apiMatch of rawMatches) {
      const entry = {
        raw: apiMatch,
        normalized: null,
        teamResolution: null,
        upsert: null,
        skippedReason: null,
        error: null
      };

      try {
        const normalized = normalizeLiquipediaApiMatch(apiMatch, competitionMeta);
        entry.normalized = normalized;

        if (!normalized) {
          entry.skippedReason = 'normalizeLiquipediaApiMatch returned null';
          report.summary.skippedInvalid += 1;
          report.processedMatches.push(entry);
          continue;
        }

        report.summary.normalized += 1;

        const team1 = await resolveTeamAlias(normalized.source_team_1_name);
        const team2 = await resolveTeamAlias(normalized.source_team_2_name);

        entry.teamResolution = {
          sourceTeam1: normalized.source_team_1_name,
          resolvedTeam1: team1,
          sourceTeam2: normalized.source_team_2_name,
          resolvedTeam2: team2
        };

        if (!team1 || !team2) {
          entry.skippedReason = 'Could not resolve one or both teams';
          report.summary.skippedUnmatchedTeams += 1;
          report.processedMatches.push(entry);
          continue;
        }

        let winningTeamId = null;
        if (normalized.winning_team_side === 1) {
          winningTeamId = team1.team_id;
        } else if (normalized.winning_team_side === 2) {
          winningTeamId = team2.team_id;
        }

        const upsertResult = await upsertSingleMatch({
          competition_id: competitionId,
          source_match_key: normalized.source_match_key,
          source_page: normalized.source_page,
          source_url: normalized.source_page,
          team_1_id: team1.team_id,
          team_2_id: team2.team_id,
          source_team_1_name: normalized.source_team_1_name,
          source_team_2_name: normalized.source_team_2_name,
          match_datetime: normalized.match_datetime,
          round_label: normalized.round_label,
          match_format: normalized.match_format,
          status: normalized.status,
          completed: normalized.completed,
          team_1_score: normalized.team_1_score,
          team_2_score: normalized.team_2_score,
          winning_team_id: winningTeamId
        });

        entry.upsert = upsertResult;

        if (upsertResult.type === 'inserted') {
          report.summary.inserted += 1;
        } else {
          report.summary.updated += 1;
        }
      } catch (err) {
        entry.error = {
          message: err.message,
          code: err.code,
          sqlMessage: err.sqlMessage,
          stack: err.stack
        };

        report.summary.upsertErrors += 1;
      }

      report.processedMatches.push(entry);
    }
  } catch (err) {
    report.fatalError = {
      message: err.message,
      code: err.code,
      sqlMessage: err.sqlMessage,
      stack: err.stack
    };
  } finally {
    const outputPath = path.resolve(__dirname, 'singleLiquipediaUpsertReport.json');

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

    console.log('\n[Test Complete]');
    console.log('Report saved to:', outputPath);
    console.log(report.summary);

    await db.end?.();
    process.exit(0);
  }
}

main();