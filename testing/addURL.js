require('dotenv').config();
const db = require('../db');

async function setTeamLiquipediaLinksByName() {
  const updates = [
    ['T1', 'https://liquipedia.net/overwatch/T1'],
    ['Team Falcons', 'https://liquipedia.net/overwatch/Team_Falcons'],
    ['Crazy Raccoon', 'https://liquipedia.net/overwatch/Crazy_Raccoon'],
    ['ZETA DIVISION', 'https://liquipedia.net/overwatch/ZETA_DIVISION'],
    ['New Era', 'https://liquipedia.net/overwatch/New_Era'],
    ['ONSIDE GAMING', 'https://liquipedia.net/overwatch/ONSIDE_GAMING'],
    ['Cheeseburger', 'https://liquipedia.net/overwatch/Cheeseburger'],
    ['Poker Face', 'https://liquipedia.net/overwatch/Poker_Face'],

    ['Team Secret', 'https://liquipedia.net/overwatch/Team_Secret'],
    ['The Gatos Guapos', 'https://liquipedia.net/overwatch/The_Gatos_Guapos'],

    ['VARREL', 'https://liquipedia.net/overwatch/VARREL'],
    ['Please Not Hero Ban', 'https://liquipedia.net/overwatch/Please_Not_Hero_Ban'],
    ['99DIVINE', 'https://liquipedia.net/overwatch/99DIVINE'],
    ['Telomere', 'https://liquipedia.net/overwatch/Telomere'],
    ['Lazuli', 'https://liquipedia.net/overwatch/Lazuli'],
    ['ENTER FORCE.36', 'https://liquipedia.net/overwatch/ENTER_FORCE.36'],
    ['Nyam Gaming', 'https://liquipedia.net/overwatch/Nyam_Gaming'],

    ['Weibo Gaming', 'https://liquipedia.net/overwatch/Weibo_Gaming'],
    ['JD Gaming', 'https://liquipedia.net/overwatch/JD_Gaming'],
    ['All Gamers', 'https://liquipedia.net/overwatch/All_Gamers'],
    ['Milk Tea', 'https://liquipedia.net/overwatch/Milk_Tea'],
    ['Homie E', 'https://liquipedia.net/overwatch/Homie_E'],
    ['Solus Victorem', 'https://liquipedia.net/overwatch/Solus_Victorem']
  ];

  try {
    let updated = 0;
    let notFound = 0;

    for (const [teamName, liquipediaUrl] of updates) {
      const [result] = await db.query(
        `UPDATE teams SET liquipedia_url = ? WHERE name = ?`,
        [liquipediaUrl, teamName]
      );

      if (result.affectedRows > 0) {
        console.log(`✅ ${teamName} -> ${liquipediaUrl}`);
        updated++;
      } else {
        console.log(`❌ Team not found in DB: ${teamName}`);
        notFound++;
      }
    }

    console.log(`\nDone. Updated ${updated} teams. Not found: ${notFound}.`);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

setTeamLiquipediaLinksByName();