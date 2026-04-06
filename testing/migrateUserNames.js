require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
      port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
      user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
      password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
      database: process.env.MYSQLDATABASE || process.env.DB_NAME
    });

    console.log('Connected to MySQL');

    await connection.beginTransaction();

    // 1) Add username column
    await connection.query(`
      ALTER TABLE users
      ADD COLUMN username VARCHAR(255) NULL AFTER user_id
    `);
    console.log('Added username column');

    // 2) Copy firstname into username for existing users
    await connection.query(`
      UPDATE users
      SET username = firstname
      WHERE username IS NULL
    `);
    console.log('Copied firstname values into username');

    // 3) Make username required
    await connection.query(`
      ALTER TABLE users
      MODIFY COLUMN username VARCHAR(255) NOT NULL
    `);
    console.log('Made username NOT NULL');

    // 4) Drop lastname column
    await connection.query(`
      ALTER TABLE users
      DROP COLUMN lastname
    `);
    console.log('Dropped lastname column');

    // 5) Rename firstname column to username? No:
    // We already created the new username column and copied values into it,
    // so now we can safely remove firstname too.
    await connection.query(`
      ALTER TABLE users
      DROP COLUMN firstname
    `);
    console.log('Dropped firstname column');

    await connection.commit();
    console.log('Migration completed successfully');
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Migration failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();