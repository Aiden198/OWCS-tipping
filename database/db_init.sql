CREATE DATABASE IF NOT EXISTS owcs_db;
USE owcs_db;

-- Disable foreign key checks to allow drop
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS user;

-- Enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE user (
    user_id INT NOT NULL AUTO_INCREMENT,
    firstname VARCHAR(255) NOT NULL,
    lastname VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    profile_pic VARCHAR(255),
    is_admin BOOL DEFAULT FALSE,
    password VARCHAR(255) NOT NULL,
    PRIMARY KEY (user_id),
    UNIQUE KEY uc_user_email (email)
);
