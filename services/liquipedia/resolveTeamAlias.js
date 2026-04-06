const db = require('../../db');

function normalizeName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function buildSlug(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildAbbreviation(name) {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 10);
  }

  return String(name || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 3)
    .toUpperCase();
}

async function resolveTeamAlias(sourceName) {
  if (!sourceName) {
    return null;
  }

  const trimmedName = String(sourceName).trim();
  const normalizedSource = normalizeName(trimmedName);

  // 1. Exact alias match from Liquipedia alias table
  const [aliasRows] = await db.query(
    `
      SELECT t.*
      FROM team_aliases ta
      JOIN teams t ON ta.team_id = t.team_id
      WHERE ta.source = 'liquipedia'
        AND LOWER(ta.alias_name) = LOWER(?)
      LIMIT 1
    `,
    [trimmedName]
  );

  if (aliasRows.length > 0) {
    return aliasRows[0];
  }

  // 2. Exact team name match
  const [teamRows] = await db.query(
    `
      SELECT *
      FROM teams
      WHERE LOWER(name) = LOWER(?)
      LIMIT 1
    `,
    [trimmedName]
  );

  if (teamRows.length > 0) {
    return teamRows[0];
  }

  // 3. Fuzzy normalized match against aliases
  const [allAliasRows] = await db.query(
    `
      SELECT
        t.*,
        ta.alias_name
      FROM team_aliases ta
      JOIN teams t ON ta.team_id = t.team_id
      WHERE ta.source = 'liquipedia'
    `
  );

  const normalizedAliasMatch = allAliasRows.find(
    row => normalizeName(row.alias_name) === normalizedSource
  );

  if (normalizedAliasMatch) {
    return normalizedAliasMatch;
  }

  // 4. Fuzzy normalized match against team names
  const [allTeamRows] = await db.query(`SELECT * FROM teams`);

  const normalizedTeamMatch = allTeamRows.find(
    row => normalizeName(row.name) === normalizedSource
  );

  if (normalizedTeamMatch) {
    // store this alias so next time it resolves directly
    await db.query(
      `
        INSERT IGNORE INTO team_aliases (team_id, source, alias_name)
        VALUES (?, 'liquipedia', ?)
      `,
      [normalizedTeamMatch.team_id, trimmedName]
    );

    return normalizedTeamMatch;
  }

  // 5. Create new team if still not found
  console.log('[Team] Creating new team:', trimmedName);

  const slug = buildSlug(trimmedName);
  const abbreviation = buildAbbreviation(trimmedName);

  const [insertResult] = await db.query(
    `
      INSERT INTO teams (
        slug,
        name,
        abbreviation,
        region,
        icon_path,
        liquipedia_url,
        liquipedia_slug,
        active,
        rating
      ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, 1500)
    `,
    [
      slug,
      trimmedName,
      abbreviation,
      'UNKNOWN',
      '/images/team_icons/default_team_icon.png',
      null,
      null
    ]
  );

  const teamId = insertResult.insertId;

  await db.query(
    `
      INSERT INTO team_aliases (team_id, source, alias_name)
      VALUES (?, 'liquipedia', ?)
    `,
    [teamId, trimmedName]
  );

  const [newTeamRows] = await db.query(
    `
      SELECT *
      FROM teams
      WHERE team_id = ?
      LIMIT 1
    `,
    [teamId]
  );

  return newTeamRows[0] || null;
}

module.exports = resolveTeamAlias;