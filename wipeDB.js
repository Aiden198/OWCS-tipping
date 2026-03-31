const db = require("./db");

async function wipeDatabase() {
  try {
    console.log("Connecting to database...");

    // Disable FK checks in case you add relations later
    await db.promise().query("SET FOREIGN_KEY_CHECKS = 0");

    // Add tables here as your project grows
    await db.promise().query("DROP TABLE IF EXISTS users");

    await db.promise().query("SET FOREIGN_KEY_CHECKS = 1");

    console.log("Database wiped successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Error wiping database:", err);
    process.exit(1);
  }
}

wipeDatabase();