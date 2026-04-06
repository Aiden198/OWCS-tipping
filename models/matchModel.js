const db = require('../db');

exports.getAllMatches = async () => {
  const [rows] = await db.query(`
    SELECT
      m.match_id,
      m.competition_id,
      m.source_match_key,
      m.source_page,
      m.source_url,
      m.match_datetime,
      m.round_label,
      m.match_format,
      m.status,
      m.completed,
      m.resolved,
      m.team_1_score,
      m.team_2_score,
      m.winning_team_id,
      m.team_1_odds,
      m.team_2_odds,
      c.title AS competition_title,
      c.umbrella_region,
      c.competition_region,
      c.stage_number,
      c.stage_type,
      COALESCE(t1.name, m.source_team_1_name) AS team_1_name,
      COALESCE(t2.name, m.source_team_2_name) AS team_2_name,
      t1.abbreviation AS team_1_abbreviation,
      t2.abbreviation AS team_2_abbreviation,
      t1.icon_path AS team_1_icon,
      t2.icon_path AS team_2_icon
    FROM matches m
    LEFT JOIN competitions c ON m.competition_id = c.competition_id
    LEFT JOIN teams t1 ON m.team_1_id = t1.team_id
    LEFT JOIN teams t2 ON m.team_2_id = t2.team_id
    ORDER BY m.match_datetime ASC
  `);

  return rows;
};

exports.getMatchesByStatus = async (status) => {
  const [rows] = await db.query(`
    SELECT
      m.match_id,
      m.competition_id,
      m.source_match_key,
      m.source_page,
      m.source_url,
      m.match_datetime,
      m.round_label,
      m.match_format,
      m.status,
      m.completed,
      m.resolved,
      m.team_1_score,
      m.team_2_score,
      m.winning_team_id,
      m.team_1_odds,
      m.team_2_odds,
      c.title AS competition_title,
      c.umbrella_region,
      c.competition_region,
      c.stage_number,
      c.stage_type,
      COALESCE(t1.name, m.source_team_1_name) AS team_1_name,
      COALESCE(t2.name, m.source_team_2_name) AS team_2_name,
      t1.abbreviation AS team_1_abbreviation,
      t2.abbreviation AS team_2_abbreviation,
      t1.icon_path AS team_1_icon,
      t2.icon_path AS team_2_icon
    FROM matches m
    LEFT JOIN competitions c ON m.competition_id = c.competition_id
    LEFT JOIN teams t1 ON m.team_1_id = t1.team_id
    LEFT JOIN teams t2 ON m.team_2_id = t2.team_id
    WHERE m.status = ?
    ORDER BY m.match_datetime ASC
  `, [status]);

  return rows;
};

exports.findBySourceMatchKey = async (sourceMatchKey) => {
  const [rows] = await db.query(`
    SELECT *
    FROM matches
    WHERE source_match_key = ?
    LIMIT 1
  `, [sourceMatchKey]);

  return rows[0] || null;
};

exports.insertMatch = async (match) => {
  const [result] = await db.query(`
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
      team_1_odds,
      team_2_odds,
      completed,
      resolved,
      team_1_score,
      team_2_score,
      winning_team_id,
      last_synced_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
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
    match.team_1_odds,
    match.team_2_odds,
    match.completed,
    match.resolved,
    match.team_1_score,
    match.team_2_score,
    match.winning_team_id,
    match.last_synced_at
  ]);

  return result;
};

exports.updateMatchBySourceMatchKey = async (sourceMatchKey, match) => {
  const [result] = await db.query(`
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
      team_1_odds = ?,
      team_2_odds = ?,
      completed = ?,
      resolved = ?,
      team_1_score = ?,
      team_2_score = ?,
      winning_team_id = ?,
      last_synced_at = ?
    WHERE source_match_key = ?
  `, [
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
    match.team_1_odds,
    match.team_2_odds,
    match.completed,
    match.resolved,
    match.team_1_score,
    match.team_2_score,
    match.winning_team_id,
    match.last_synced_at,
    sourceMatchKey
  ]);

  return result;
};

exports.upsertMatch = async (match) => {
  const existing = await exports.findBySourceMatchKey(match.source_match_key);

  if (existing) {
    await exports.updateMatchBySourceMatchKey(match.source_match_key, match);
    return 'updated';
  }

  await exports.insertMatch(match);
  return 'inserted';
};

exports.findTeamByName = async (teamName) => {
  const [rows] = await db.query(`
    SELECT *
    FROM teams
    WHERE name = ?
    LIMIT 1
  `, [teamName]);

  return rows[0] || null;
};