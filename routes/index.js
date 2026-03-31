const express = require("express");
const router = express.Router();
const { getTeamById } = require("../data/teamHelpers");

router.get("/", function (req, res) {
  const featuredMatches = [
    {
      time: "SATURDAY • 7:30 PM",
      team1: getTeamById("team-peps"),
      team2: getTeamById("twisted-minds")
    },
    {
      time: "SATURDAY • 9:00 PM",
      team1: getTeamById("team-liquid"),
      team2: getTeamById("space-station-gaming")
    },
    {
      time: "SUNDAY • 6:00 PM",
      team1: getTeamById("al-qadsiah"),
      team2: getTeamById("virtus.pro")
    }
  ];

  res.render("index", { featuredMatches });
});

module.exports = router;