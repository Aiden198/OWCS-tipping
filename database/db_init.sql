SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS tips;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS team_aliases;
DROP TABLE IF EXISTS competitions;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
    user_id INT NOT NULL AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    profile_pic VARCHAR(255),
    credits DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
    is_admin BOOL NOT NULL DEFAULT FALSE,
    password VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY uc_users_email (email),
    UNIQUE KEY uc_users_username (username)
);

CREATE TABLE teams (
    team_id INT NOT NULL AUTO_INCREMENT,
    slug VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    abbreviation VARCHAR(10) DEFAULT NULL,
    region VARCHAR(20) NOT NULL,                 -- team's home region, not match region
    icon_path VARCHAR(255) NOT NULL,
    liquipedia_url VARCHAR(255) DEFAULT NULL,
    liquipedia_slug VARCHAR(255) DEFAULT NULL,
    active BOOL NOT NULL DEFAULT TRUE,
    rating INT NOT NULL DEFAULT 1500,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id),
    UNIQUE KEY uc_teams_slug (slug),
    UNIQUE KEY uc_teams_name (name),
    UNIQUE KEY uc_teams_abbreviation (abbreviation)
);

CREATE TABLE competitions (
    competition_id INT NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    game VARCHAR(50) NOT NULL DEFAULT 'overwatch',
    season_year INT NOT NULL,
    umbrella_region VARCHAR(50) DEFAULT NULL,    -- e.g. Asia
    competition_region VARCHAR(50) NOT NULL,     -- e.g. NA, EMEA, China, Japan, Korea, Pacific, Global
    stage_number INT DEFAULT NULL,               -- 1, 2, etc.
    stage_type VARCHAR(50) NOT NULL,             -- main, relegation, playoffs, finals, etc.
    source_page VARCHAR(500) NOT NULL,
    source_key VARCHAR(255) NOT NULL,            -- canonical internal source key
    active BOOL NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (competition_id),
    UNIQUE KEY uc_competitions_source_key (source_key)
);

CREATE TABLE team_aliases (
    alias_id INT NOT NULL AUTO_INCREMENT,
    team_id INT NOT NULL,
    source VARCHAR(50) NOT NULL,                 -- e.g. liquipedia
    alias_name VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (alias_id),
    UNIQUE KEY uc_team_aliases_source_name (source, alias_name),
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE
);

CREATE TABLE matches (
    match_id INT NOT NULL AUTO_INCREMENT,
    competition_id INT NOT NULL,

    source_match_key VARCHAR(255) NOT NULL,      -- stable external/internal unique key
    source_page VARCHAR(500) DEFAULT NULL,
    source_url VARCHAR(500) DEFAULT NULL,

    team_1_id INT DEFAULT NULL,
    team_2_id INT DEFAULT NULL,

    source_team_1_name VARCHAR(100) DEFAULT NULL,
    source_team_2_name VARCHAR(100) DEFAULT NULL,

    match_datetime DATETIME NOT NULL,
    round_label VARCHAR(100) DEFAULT NULL,       -- e.g. Upper Round 1, Week 2
    match_format VARCHAR(20) DEFAULT NULL,       -- Bo3, Bo5, Bo7
    status VARCHAR(20) NOT NULL DEFAULT 'upcoming',

    team_1_odds DECIMAL(6,2) DEFAULT NULL,
    team_2_odds DECIMAL(6,2) DEFAULT NULL,

    completed BOOL NOT NULL DEFAULT FALSE,
    resolved BOOL NOT NULL DEFAULT FALSE,

    team_1_score INT DEFAULT NULL,
    team_2_score INT DEFAULT NULL,
    winning_team_id INT DEFAULT NULL,

    last_synced_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (match_id),
    UNIQUE KEY uc_matches_source_match_key (source_match_key),

    FOREIGN KEY (competition_id) REFERENCES competitions(competition_id),
    FOREIGN KEY (team_1_id) REFERENCES teams(team_id),
    FOREIGN KEY (team_2_id) REFERENCES teams(team_id),
    FOREIGN KEY (winning_team_id) REFERENCES teams(team_id)
);

CREATE TABLE tips (
    tip_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    match_id INT NOT NULL,
    selected_team_id INT NOT NULL,
    odds DECIMAL(6,2) NOT NULL,
    amount_tipped DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'won', 'lost') NOT NULL DEFAULT 'pending',
    tip_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tip_id),
    UNIQUE KEY uc_user_match_tip (user_id, match_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (match_id) REFERENCES matches(match_id) ON DELETE CASCADE,
    FOREIGN KEY (selected_team_id) REFERENCES teams(team_id)
);

INSERT INTO teams (slug, name, abbreviation, region, icon_path, liquipedia_url, liquipedia_slug, active) VALUES
('al-qadsiah', 'Al Qadsiah', 'QAD', 'EMEA', '/images/team_icons/al_qadsiah_icon.png', 'https://liquipedia.net/overwatch/Al_Qadsiah', 'Al_Qadsiah', TRUE),
('anyones-legend', 'Anyone''s Legend', 'AL', 'EMEA', '/images/team_icons/anyone''s_legend_icon.png', 'https://liquipedia.net/overwatch/Anyone%27s_Legend', 'Anyone%27s_Legend', TRUE),
('dallas-fuel', 'Dallas Fuel', 'DAL', 'NA', '/images/team_icons/dallas_fuel_icon.webp', 'https://liquipedia.net/overwatch/Dallas_Fuel', 'Dallas_Fuel', TRUE),
('disguised', 'Disguised', 'DSG', 'NA', '/images/team_icons/disguised_icon.png', 'https://liquipedia.net/overwatch/Disguised', 'Disguised', TRUE),
('extinction', 'Extinction', 'EXN', 'NA', '/images/team_icons/extinction_icon.png', 'https://liquipedia.net/overwatch/Extinction', 'Extinction', TRUE),
('geekay', 'Geekay', 'GK', 'EMEA', '/images/team_icons/geekay_icon.png', 'https://liquipedia.net/overwatch/Geekay_Esports', 'Geekay_Esports', TRUE),
('lunex-gaming', 'LuneX Gaming', 'LNX', 'NA', '/images/team_icons/lunex_gaming_icon.png', 'https://liquipedia.net/overwatch/LuneX_Gaming', 'LuneX_Gaming', TRUE),
('space-station-gaming', 'Space Station Gaming', 'SSG', 'NA', '/images/team_icons/SSG_icon.png', 'https://liquipedia.net/overwatch/SSG', 'SSG', TRUE),
('team-liquid', 'Team Liquid', 'TL', 'NA', '/images/team_icons/team_liquid_icon.png', 'https://liquipedia.net/overwatch/Team_Liquid', 'Team_Liquid', TRUE),
('team-peps', 'Team Peps', 'PEP', 'EMEA', '/images/team_icons/team_peps_icon.png', 'https://liquipedia.net/overwatch/Team_Peps', 'Team_Peps', TRUE),
('twisted-minds', 'Twisted Minds', 'TM', 'EMEA', '/images/team_icons/twisted_minds_icon.png', 'https://liquipedia.net/overwatch/Twisted_Minds', 'Twisted_Minds', TRUE),
('virtus-pro', 'Virtus.pro', 'VP', 'EMEA', '/images/team_icons/virtus.pro_icon.png', 'https://liquipedia.net/overwatch/Virtus.pro', 'Virtus.pro', TRUE);

INSERT INTO team_aliases (team_id, source, alias_name)
SELECT team_id, 'liquipedia', name
FROM teams;