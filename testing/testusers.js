const db = require("../db");
const bcrypt = require("bcrypt");

const firstNames = [
  "Aiden", "Luca", "Noah", "Mason", "Ethan", "Jack", "Oliver", "Levi",
  "Isaac", "Logan", "Ryan", "Zane", "Cooper", "Jayden", "Finn", "Tyler",
  "Harvey", "Callum", "Max", "Blake", "Harrison", "Jesse", "Kai", "Reid",
  "Oscar", "Ben", "Joel", "Mitchell", "Archie", "Toby", "Dylan", "Asher",
  "Elijah", "Riley", "Hunter", "Nathan", "Carter", "Alex", "Jordan", "Sam",
  "Liam", "Will", "Bailey", "Connor", "Henry", "Xavier", "Phoenix", "Jaxon",
  "Angus", "Declan", "Brody", "Rhys", "Seb", "Tom", "Caleb", "Ari"
];

const lastNames = [
  "Smith", "Jones", "Brown", "Taylor", "Wilson", "White", "Martin", "Hall",
  "Walker", "Young", "Allen", "King", "Scott", "Green", "Baker", "Wright",
  "Harris", "Mitchell", "Parker", "Adams", "Campbell", "Murphy", "Kelly",
  "Morgan", "Reed", "Ward", "Evans", "Turner", "Collins", "Cooper"
];

function randomFrom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomCredits() {
  // Gives a realistic spread with some high and low values
  return (Math.random() * 4000 + 100).toFixed(2);
}

async function seedTestUsers() {
  let connection;

  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    // Clear dependent rows first
    await connection.query("DELETE FROM tips");
    await connection.query("DELETE FROM users");

    const plainPassword = "password123";
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const usersToInsert = [];

    for (let i = 1; i <= 60; i++) {
      const firstname = randomFrom(firstNames);
      const lastname = randomFrom(lastNames);
      const email = `${firstname.toLowerCase()}.${lastname.toLowerCase()}${i}@example.com`;
      const credits = randomCredits();
      const isAdmin = i === 1 ? 1 : 0; // make first user admin for convenience

      usersToInsert.push([
        firstname,
        lastname,
        email,
        null,
        credits,
        isAdmin,
        hashedPassword
      ]);
    }

    await connection.query(`
      INSERT INTO users (
        firstname,
        lastname,
        email,
        profile_pic,
        credits,
        is_admin,
        password
      ) VALUES ?
    `, [usersToInsert]);

    await connection.commit();

    console.log("Inserted 60 test users successfully.");
    console.log(`All users use password: ${plainPassword}`);
    process.exit(0);
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Error seeding test users:", err);
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

seedTestUsers();