const db = require('../db');

async function deleteTestUsers() {
  const usernames = [
    'test',
    'test1',
    'test2',
    'test3',
    'test4',
    'test5',
    'test6',
    'pickle',
    'peanut'
  ];

  try {
    const placeholders = usernames.map(() => '?').join(', ');

    const [result] = await db.query(
      `DELETE FROM users WHERE username IN (${placeholders})`,
      usernames
    );

    console.log(`Deleted ${result.affectedRows} user(s).`);
  } catch (err) {
    console.error('Error deleting test users:', err);
  } finally {
    process.exit();
  }
}

deleteTestUsers();