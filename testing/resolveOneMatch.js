const resolveMatch = require("./services/resolveMatch");

const matchId = Number(process.argv[2]);

if (!matchId) {
  console.log("Usage: node resolveOneMatch.js <matchId>");
  process.exit(1);
}

resolveMatch(matchId)
  .then((result) => {
    console.log(result);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Resolve error:", err.message);
    process.exit(1);
  });