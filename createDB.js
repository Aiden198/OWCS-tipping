const fs = require("fs");
const path = require("path");
const db = require("./database/db");

async function createDatabase() {
  try {
    const sqlPath = path.join(__dirname, "database", "db_init.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    // mysql2 needs multipleStatements enabled for big SQL files
    await db.query(sql);

    console.log("Database initialized successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Error initializing database:", err);
    process.exit(1);
  }
}

createDatabase();