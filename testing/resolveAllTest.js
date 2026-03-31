const resolveAllMatches = require("../services/resolveAllMatches");

resolveAllMatches()
  .then((result) => {
    console.log("Resolve all completed matches result:");
    console.dir(result, { depth: null });
    process.exit(0);
  })
  .catch((err) => {
    console.error("Resolve all error:", err);
    process.exit(1);
  });