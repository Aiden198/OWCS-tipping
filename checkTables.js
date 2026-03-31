const db = require("./database/db");

db.promise().query("SHOW TABLES")
  .then(([rows]) => {
    console.log("Tables in owcs_db:");
    console.table(rows);
    process.exit();
  })
  .catch((err) => {
    console.error("Error checking tables:", err);
    process.exit();
  });