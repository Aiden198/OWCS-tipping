const db = require('../../db');

async function upsertCompetition(competition) {
  const selectSql = `
    SELECT competition_id
    FROM competitions
    WHERE source_key = ?
    LIMIT 1
  `;

  const [existingRows] = await db.query(selectSql, [competition.source_key]);

  if (existingRows.length > 0) {
    const competitionId = existingRows[0].competition_id;

    const updateSql = `
      UPDATE competitions
      SET
        title = ?,
        game = ?,
        season_year = ?,
        umbrella_region = ?,
        competition_region = ?,
        stage_number = ?,
        stage_type = ?,
        source_page = ?,
        active = ?
      WHERE competition_id = ?
    `;

    await db.query(updateSql, [
      competition.title,
      competition.game,
      competition.season_year,
      competition.umbrella_region,
      competition.competition_region,
      competition.stage_number,
      competition.stage_type,
      competition.source_page,
      competition.active ?? true,
      competitionId
    ]);

    return competitionId;
  }

  const insertSql = `
    INSERT INTO competitions (
      title,
      game,
      season_year,
      umbrella_region,
      competition_region,
      stage_number,
      stage_type,
      source_page,
      source_key,
      active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [insertResult] = await db.query(insertSql, [
    competition.title,
    competition.game,
    competition.season_year,
    competition.umbrella_region,
    competition.competition_region,
    competition.stage_number,
    competition.stage_type,
    competition.source_page,
    competition.source_key,
    competition.active ?? true
  ]);

  return insertResult.insertId;
}

module.exports = upsertCompetition;