const db = require('../db');

exports.getAllMatches = async () => {
  const [rows] = await db.query(`
    SELECT
      m.match_id,
      m.source_id,
      m.match_datetime,
      m.stage,
      m.region,
      m.status,
      m.team_1_score,
      m.team_2_score,
      m.winning_team_id,
      COALESCE(t1.name, m.source_team_1_name) AS team_1_name,
      COALESCE(t2.name, m.source_team_2_name) AS team_2_name,
      t1.icon_path AS team_1_icon,
      t2.icon_path AS team_2_icon
    FROM matches m
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
      m.source_id,
      m.match_datetime,
      m.stage,
      m.region,
      m.status,
      m.team_1_score,
      m.team_2_score,
      m.winning_team_id,
      COALESCE(t1.name, m.source_team_1_name) AS team_1_name,
      COALESCE(t2.name, m.source_team_2_name) AS team_2_name,
      t1.icon_path AS team_1_icon,
      t2.icon_path AS team_2_icon
    FROM matches m
    LEFT JOIN teams t1 ON m.team_1_id = t1.team_id
    LEFT JOIN teams t2 ON m.team_2_id = t2.team_id
    WHERE m.status = ?
    ORDER BY m.match_datetime ASC
  `, [status]);

  return rows;
};

exports.findBySourceId = async (sourceId) => {
  const [rows] = await db.query(`
    SELECT *
    FROM matches
    WHERE source_id = ?
    LIMIT 1
  `, [sourceId]);

  return rows[0] || null;
};

exports.insertMatch = async (match) => {
  const [result] = await db.query(`
    INSERT INTO matches (
      source_id,
      source_url,
      team_1_id,
      team_2_id,
      source_team_1_name,
      source_team_2_name,
      match_datetime,
      stage,
      region,
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    match.source_id,
    match.source_url,
    match.team_1_id,
    match.team_2_id,
    match.source_team_1_name,
    match.source_team_2_name,
    match.match_datetime,
    match.stage,
    match.region,
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

exports.updateMatchBySourceId = async (sourceId, match) => {
  const [result] = await db.query(`
    UPDATE matches
    SET
      source_url = ?,
      team_1_id = ?,
      team_2_id = ?,
      source_team_1_name = ?,
      source_team_2_name = ?,
      match_datetime = ?,
      stage = ?,
      region = ?,
      status = ?,
      completed = ?,
      team_1_score = ?,
      team_2_score = ?,
      winning_team_id = ?,
      last_synced_at = ?
    WHERE source_id = ?
  `, [
    match.source_url,
    match.team_1_id,
    match.team_2_id,
    match.source_team_1_name,
    match.source_team_2_name,
    match.match_datetime,
    match.stage,
    match.region,
    match.status,
    match.completed,
    match.team_1_score,
    match.team_2_score,
    match.winning_team_id,
    match.last_synced_at,
    sourceId
  ]);

  return result;
};

exports.upsertMatch = async (match) => {
  const existing = await exports.findBySourceId(match.source_id);

  if (existing) {
    await exports.updateMatchBySourceId(match.source_id, match);
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