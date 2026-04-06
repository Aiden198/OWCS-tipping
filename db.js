const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST || '127.0.0.1',
  port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'owcs_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
};

console.log('[DB] Connecting to MySQL:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database
});

const db = mysql.createPool(dbConfig);

async function testConnection() {
  try {
    const connection = await db.getConnection();
    console.log('[DB] Connected to MySQL');
    connection.release();
  } catch (err) {
    console.error('[DB] Database connection failed:', err);
  }
}

testConnection();

module.exports = db;