const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'db',
  port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
  user: process.env.MYSQLUSER || process.env.DB_USER || 'owcs_user',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || 'owcs_password',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'owcs_db',
  multipleStatements: true,
  connectionLimit: 10
});

db.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to MySQL');
    connection.release();
  }
});

module.exports = db;