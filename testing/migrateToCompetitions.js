require('dotenv').config();
const db = require('../db');

async function runMigration() {
  const connection = await db.getConnection();

  try {
    console.log('Starting migration to competitions schema...');
    await connection.beginTransaction();

    // --------------------------------------------------
    // 1. USERS
    // --------------------------------------------------
    console.log('Updating users table...');
    await connection.query(`
      ALTER TABLE users
        ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `).catch(() => console.log('Users timestamps already exist, skipping.'));

    await connection.query(`
      ALTER TABLE users
        ADD UNIQUE KEY uc_users_username (username)
    `).catch(() => console.log('Username unique key already exists, skipping.'));

    // --------------------------------------------------
    // 2. TEAMS
    // --------------------------------------------------
    console.log('Updating teams table...');
    await connection.query(`
      ALTER TABLE teams
        MODIFY COLUMN abbreviation VARCHAR(10) DEFAULT NULL
    `);

    await connection.query(`
      ALTER TABLE teams
        ADD COLUMN liquipedia_slug VARCHAR(255) DEFAULT NULL,
        ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `).catch(() => console.log('Some team columns already exist, skipping.'));

    await connection.query(`
      ALTER TABLE teams
        ADD UNIQUE KEY uc_teams_name (name)
    `).catch(() => console.log('Team name unique key already exists, skipping.'));

    await connection.query(`
      UPDATE teams
      SET slug = 'virtus-pro'
      WHERE name = 'Virtus.pro' AND slug = 'virtus.pro'
    `);

    await connection.query(`
      UPDATE teams
      SET liquipedia_slug =
        REPLACE(
          SUBSTRING_INDEX(liquipedia_url, '/overwatch/', -1),
          '%27',
          ''''
        )
      WHERE liquipedia_url IS NOT NULL
        AND liquipedia_slug IS NULL
    `);

    // --------------------------------------------------
    // 3. COMPETITIONS
    // --------------------------------------------------
    console.log('Creating competitions table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS competitions (
          competition_id INT NOT NULL AUTO_INCREMENT,
          title VARCHAR(255) NOT NULL,
          game VARCHAR(50) NOT NULL DEFAULT 'overwatch',
          season_year INT NOT NULL,
          umbrella_region VARCHAR(50) DEFAULT NULL,
          competition_region VARCHAR(50) NOT NULL,
          stage_number INT DEFAULT NULL,
          stage_type VARCHAR(50) NOT NULL,
          source_page VARCHAR(500) NOT NULL,
          source_key VARCHAR(255) NOT NULL,
          active BOOL NOT NULL DEFAULT TRUE,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (competition_id),
          UNIQUE KEY uc_competitions_source_key (source_key)
      )
    `);

    // --------------------------------------------------
    // 4. TEAM ALIASES
    // --------------------------------------------------
    console.log('Creating team_aliases table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS team_aliases (
          alias_id INT NOT NULL AUTO_INCREMENT,
          team_id INT NOT NULL,
          source VARCHAR(50) NOT NULL,
          alias_name VARCHAR(255) NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (alias_id),
          UNIQUE KEY uc_team_aliases_source_name (source, alias_name),
          FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE
      )
    `);

    // --------------------------------------------------
    // 5. MATCHES NEW COLUMNS
    // --------------------------------------------------
    console.log('Updating matches table...');
    await connection.query(`
      ALTER TABLE matches
        ADD COLUMN competition_id INT DEFAULT NULL AFTER match_id,
        ADD COLUMN source_match_key VARCHAR(255) DEFAULT NULL AFTER competition_id,
        ADD COLUMN source_page VARCHAR(500) DEFAULT NULL AFTER source_match_key,
        ADD COLUMN round_label VARCHAR(100) DEFAULT NULL AFTER match_datetime,
        ADD COLUMN match_format VARCHAR(20) DEFAULT NULL AFTER round_label
    `).catch(() => console.log('Some match columns already exist, skipping.'));

    // --------------------------------------------------
    // 6. INSERT LEGACY COMPETITIONS
    // --------------------------------------------------
    console.log('Creating legacy competition records...');
    await connection.query(`
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
      )
      SELECT DISTINCT
          CONCAT(
            'OWCS ',
            COALESCE(m.region, 'Unknown'),
            CASE
              WHEN m.stage IS NOT NULL AND m.stage <> '' THEN CONCAT(' ', m.stage)
              ELSE ''
            END
          ) AS title,
          'overwatch' AS game,
          YEAR(COALESCE(m.match_datetime, NOW())) AS season_year,
          CASE
            WHEN m.region IN ('Japan', 'Korea', 'Pacific', 'China') THEN 'Asia'
            ELSE NULL
          END AS umbrella_region,
          COALESCE(m.region, 'Unknown') AS competition_region,
          CASE
            WHEN m.stage REGEXP '[Ss]tage[[:space:]]*[0-9]+' THEN
              CAST(REGEXP_SUBSTR(m.stage, '[0-9]+') AS UNSIGNED)
            ELSE NULL
          END AS stage_number,
          CASE
            WHEN LOWER(COALESCE(m.stage, '')) LIKE '%relegation%' THEN 'relegation'
            WHEN LOWER(COALESCE(m.stage, '')) LIKE '%playoff%' THEN 'playoffs'
            WHEN LOWER(COALESCE(m.stage, '')) LIKE '%final%' THEN 'finals'
            ELSE 'main'
          END AS stage_type,
          COALESCE(
            NULLIF(m.source_url, ''),
            'legacy-migration'
          ) AS source_page,
          CONCAT(
            'legacy:',
            COALESCE(m.region, 'unknown'),
            ':',
            COALESCE(m.stage, 'main'),
            ':',
            YEAR(COALESCE(m.match_datetime, NOW()))
          ) AS source_key,
          TRUE AS active
      FROM matches m
      WHERE NOT EXISTS (
        SELECT 1
        FROM competitions c
        WHERE c.source_key = CONCAT(
            'legacy:',
            COALESCE(m.region, 'unknown'),
            ':',
            COALESCE(m.stage, 'main'),
            ':',
            YEAR(COALESCE(m.match_datetime, NOW()))
        )
      )
    `);

    // --------------------------------------------------
    // 7. LINK MATCHES TO COMPETITIONS
    // --------------------------------------------------
    console.log('Linking matches to competitions...');
    await connection.query(`
      UPDATE matches m
      JOIN competitions c
        ON c.source_key = CONCAT(
            'legacy:',
            COALESCE(m.region, 'unknown'),
            ':',
            COALESCE(m.stage, 'main'),
            ':',
            YEAR(COALESCE(m.match_datetime, NOW()))
        )
      SET m.competition_id = c.competition_id
      WHERE m.competition_id IS NULL
    `);

    // --------------------------------------------------
    // 8. MIGRATE SOURCE KEYS
    // --------------------------------------------------
    console.log('Migrating source keys...');
    await connection.query(`
      UPDATE matches
      SET source_match_key = COALESCE(source_match_key, source_id, CONCAT('legacy-match-', match_id))
      WHERE source_match_key IS NULL
    `);

    await connection.query(`
      ALTER TABLE matches
        MODIFY COLUMN competition_id INT NOT NULL,
        MODIFY COLUMN source_match_key VARCHAR(255) NOT NULL
    `);

    await connection.query(`
      ALTER TABLE matches
        ADD UNIQUE KEY uc_matches_source_match_key (source_match_key)
    `).catch(() => console.log('Source match key unique index already exists, skipping.'));

    await connection.query(`
      ALTER TABLE matches
        ADD CONSTRAINT fk_matches_competition
        FOREIGN KEY (competition_id) REFERENCES competitions(competition_id)
    `).catch(() => console.log('Competition foreign key already exists, skipping.'));

    // --------------------------------------------------
    // 9. TEAM ALIASES SEED
    // --------------------------------------------------
    console.log('Seeding team aliases...');
    await connection.query(`
      INSERT INTO team_aliases (team_id, source, alias_name)
      SELECT team_id, 'liquipedia', name
      FROM teams
      WHERE NOT EXISTS (
        SELECT 1
        FROM team_aliases a
        WHERE a.source = 'liquipedia'
          AND a.alias_name = teams.name
      )
    `);

    await connection.query(`
      INSERT INTO team_aliases (team_id, source, alias_name)
      SELECT t.team_id, 'liquipedia', t.abbreviation
      FROM teams t
      WHERE t.abbreviation IS NOT NULL
        AND t.abbreviation <> ''
        AND NOT EXISTS (
          SELECT 1
          FROM team_aliases a
          WHERE a.source = 'liquipedia'
            AND a.alias_name = t.abbreviation
        )
    `);

    await connection.query(`
      INSERT INTO team_aliases (team_id, source, alias_name)
      SELECT team_id, 'liquipedia', 'SSG'
      FROM teams
      WHERE slug = 'space-station-gaming'
      AND NOT EXISTS (
        SELECT 1 FROM team_aliases
        WHERE source = 'liquipedia'
          AND alias_name = 'SSG'
      )
    `);

    await connection.query(`
      INSERT INTO team_aliases (team_id, source, alias_name)
      SELECT team_id, 'liquipedia', 'TL'
      FROM teams
      WHERE slug = 'team-liquid'
      AND NOT EXISTS (
        SELECT 1 FROM team_aliases
        WHERE source = 'liquipedia'
          AND alias_name = 'TL'
      )
    `);

    // --------------------------------------------------
    // 10. CLEANUP OLD STRUCTURE
    // --------------------------------------------------
    console.log('Dropping old source_id index...');
    await connection.query(`
      ALTER TABLE matches
      DROP INDEX unique_source_id
    `).catch(() => console.log('Old source_id index not found, skipping.'));

    console.log('Dropping old columns...');
    await connection.query(`
      ALTER TABLE matches
        DROP COLUMN source_id,
        DROP COLUMN stage,
        DROP COLUMN region
    `).catch(() => console.log('Some old match columns already removed, skipping.'));

    await connection.commit();
    console.log('Migration completed successfully.');
  } catch (err) {
    await connection.rollback();
    console.error('Migration failed. Rolled back changes.');
    console.error(err);
  } finally {
    connection.release();
    process.exit();
  }
}

runMigration();