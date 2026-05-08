const db = require('../../db');

async function generateUpsetNews() {
  const [matches] = await db.query(`
    SELECT
      m.match_id,
      m.team_1_score,
      m.team_2_score,
      m.source_url,
      m.winning_team_id,
      m.team_1_odds,
      m.team_2_odds,
      t1.team_id AS team_1_id,
      t1.name AS team_1_name,
      t2.team_id AS team_2_id,
      t2.name AS team_2_name,
      winner.name AS winner_name,
      winner.icon_path AS winner_icon_path
    FROM matches m
    JOIN teams t1 ON m.team_1_id = t1.team_id
    JOIN teams t2 ON m.team_2_id = t2.team_id
    JOIN teams winner ON m.winning_team_id = winner.team_id
    WHERE m.completed = 1
      AND m.winning_team_id IS NOT NULL
      AND (
        (m.winning_team_id = m.team_1_id AND m.team_1_odds >= 2.5)
        OR
        (m.winning_team_id = m.team_2_id AND m.team_2_odds >= 2.5)
      )
      AND NOT EXISTS (
        SELECT 1
        FROM news_items n
        WHERE n.related_match_id = m.match_id
          AND n.type = 'upset_result'
      )
    ORDER BY m.match_datetime DESC
    LIMIT 20
  `);

  let created = 0;

  for (const match of matches) {
    const losingTeamName =
      match.winning_team_id === match.team_1_id
        ? match.team_2_name
        : match.team_1_name;

    const winnerOdds =
      match.winning_team_id === match.team_1_id
        ? match.team_1_odds
        : match.team_2_odds;

    await db.query(`
      INSERT INTO news_items (
        type,
        title,
        body,
        source_url,
        related_match_id,
        image_url,
        status
      )
      VALUES (?, ?, ?, ?, ?, 'draft')
    `, [
      'upset_result',
      `${match.winner_name} pull off upset over ${losingTeamName}`,
      `${match.winner_name} entered at ${Number(winnerOdds).toFixed(2)} odds and defeated ${losingTeamName} ${match.team_1_score}–${match.team_2_score}.`,
      match.source_url,
      match.match_id
    ]);

    created++;
  }

  return { created };
}

module.exports = generateUpsetNews;