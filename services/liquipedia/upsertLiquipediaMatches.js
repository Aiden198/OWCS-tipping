const db = require('../../db');

const sourcePages = require('./sourcePages');
const parseCompetitionMetadata = require('./parseCompetitionMetadata');
const fetchLiquipediaMatches = require('./fetchLiquipediaMatches');
const normalizeLiquipediaApiMatch = require('./normalizeLiquipediaApiMatch');
const resolveTeamAlias = require('./resolveTeamAlias');
const upsertCompetition = require('./upsertCompetition');

async function upsertSingleMatch(match) {
  const [existingRows] = await db.query(
    `
      SELECT match_id
      FROM matches
      WHERE source_match_key = ?
      LIMIT 1
    `,
    [match.source_match_key]
  );

  if (existingRows.length > 0) {
    const matchId = existingRows[0].match_id;

    await db.query(
      `
        UPDATE matches
        SET
          competition_id = ?,
          source_page = ?,
          source_url = ?,
          team_1_id = ?,
          team_2_id = ?,
          source_team_1_name = ?,
          source_team_2_name = ?,
          match_datetime = ?,
          round_label = ?,
          match_format = ?,
          status = ?,
          completed = ?,
          team_1_score = ?,
          team_2_score = ?,
          winning_team_id = ?,
          last_synced_at = NOW()
        WHERE match_id = ?
      `,
      [
        match.competition_id,
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
        match.team_1_score,
        match.team_2_score,
        match.winning_team_id,
        matchId
      ]
    );

    return { type: 'updated', match_id: matchId };
  }

  const [insertResult] = await db.query(
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

  return { type: 'inserted', match_id: insertResult.insertId };
}

async function upsertLiquipediaMatches() {
  const summary = {
    pages: 0,
    competitions: 0,
    matchesFound: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    unmatchedTeams: []
  };

  for (const pageUrl of sourcePages) {
    console.log(`[Liquipedia API] Processing page: ${pageUrl}`);

    const competitionMeta = parseCompetitionMetadata(pageUrl);
    const competitionId = await upsertCompetition(competitionMeta);

    summary.pages += 1;
    summary.competitions += 1;

    let apiMatches = [];
    let offset = 0;
    const limit = 20;

    while (true) {
      const pageName = new URL(pageUrl).pathname.replace(/^\/overwatch\//, '');
      console.log('[Liquipedia API] derived pageName:', pageName);

      const batch = await fetchLiquipediaMatches(pageName, offset, limit);
      apiMatches.push(...batch);

      if (batch.length < limit) {
        break;
      }

      offset += limit;
    }

    summary.matchesFound += apiMatches.length;

    for (const apiMatch of apiMatches) {
      const normalized = normalizeLiquipediaApiMatch(apiMatch, competitionMeta);

      if (!normalized || !normalized.match_datetime) {
        console.log('[Skip] Invalid normalized match:', JSON.stringify(apiMatch, null, 2));
        summary.skipped += 1;
        continue;
      }

      const team1 = await resolveTeamAlias(normalized.source_team_1_name);
      const team2 = await resolveTeamAlias(normalized.source_team_2_name);

      if (!team1 || !team2) {
        console.log('[Skip] Could not resolve teams:', {
          source_match_key: normalized.source_match_key,
          team1: normalized.source_team_1_name,
          team2: normalized.source_team_2_name
        });

        summary.skipped += 1;

        if (!team1) summary.unmatchedTeams.push(normalized.source_team_1_name);
        if (!team2) summary.unmatchedTeams.push(normalized.source_team_2_name);

        continue;
      }

      let winningTeamId = null;
      if (normalized.winning_team_side === 1) {
        winningTeamId = team1.team_id;
      } else if (normalized.winning_team_side === 2) {
        winningTeamId = team2.team_id;
      }

      const result = await upsertSingleMatch({
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

      if (result.type === 'inserted') {
        summary.inserted += 1;
      } else {
        summary.updated += 1;
      }
    }
  }

  summary.unmatchedTeams = [...new Set(summary.unmatchedTeams)];
  return summary;
}

module.exports = upsertLiquipediaMatches;