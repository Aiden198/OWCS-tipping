const db = require("../db");

async function topUpLowBalanceUsers() {
  try {
    console.log("Checking for users below 500 credits...\n");

    const [beforeRows] = await db.query(`
      SELECT user_id, firstname, lastname, email, credits
      FROM users
      ORDER BY user_id ASC
    `);

    console.log("Balances before:");
    console.table(beforeRows);

    const [result] = await db.query(`
      UPDATE users
      SET credits = 500
      WHERE credits < 500
    `);

    console.log(`\nTop-up complete.`);
    console.log(`${result.affectedRows} account(s) were topped up to 500 credits.\n`);

    const [afterRows] = await db.query(`
      SELECT user_id, firstname, lastname, email, credits
      FROM users
      ORDER BY user_id ASC
    `);

    console.log("Balances after:");
    console.table(afterRows);

  } catch (err) {
    console.error("Error topping up credits:", err);
  } finally {
    process.exit();
  }
}

topUpLowBalanceUsers();