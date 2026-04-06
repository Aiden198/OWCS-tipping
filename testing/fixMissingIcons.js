require('dotenv').config();
const db = require('../db');

async function setTeamIconsByName() {
  const updates = [
    ['Twisted Minds', '/images/team_icons/twisted_minds_icon.png'],
    ['Dallas Fuel', '/images/team_icons/dallas_fuel_icon.png'],
    ['Space Station Gaming', '/images/team_icons/SSG_icon.png'],
    ['Virtus.pro', '/images/team_icons/virtus.pro_icon.png'],
    ['VARREL', '/images/team_icons/varrel_icon.png'],
    ['Weibo Gaming', '/images/team_icons/weibo_gaming_icon.png'],
    ['ZETA DIVISION', '/images/team_icons/zeta_division_icon.png'],
    ['All Gamers', '/images/team_icons/all_games_icon.png'],
    ['Please Not Hero Ban', '/images/team_icons/please_not_hero_ban_icon.png'],
    ['Geekay', '/images/team_icons/geekay_icon.png'],
    ['Team Secret', '/images/team_icons/team_secret_icon.png'],
    ['The Gatos Guapos', '/images/team_icons/the_gatos_guapos_icon.png'],
    ['Crazy Raccoon', '/images/team_icons/crazy_raccoon_icon.png'],
    ['Team Falcons', '/images/team_icons/team_falcons_icon.png'],
    ['ONSIDE GAMING', '/images/team_icons/onside_gaming_icon.png'],
    ['ENTER FORCE.36', '/images/team_icons/enter_force_36_icon.png'],
    ['LuneX Gaming', '/images/team_icons/lunex_gaming_icon.png'],
    ['99DIVINE', '/images/team_icons/99divide_icon.png'],
    ['Naive Piggy', '/images/team_icons/naive_piggy_icon.png'],
    ['JD Gaming', '/images/team_icons/jd_gaming_icon.png'],
    ['Rankers', '/images/team_icons/rankers_icon.png'],
    ['T1', '/images/team_icons/t1_icon.png'],
    ['Quasar Esports', '/images/team_icons/quasar_icon.png'],
    ['Poker Face', '/images/team_icons/poker_face_icon.png'],
    ['Team Liquid', '/images/team_icons/team_liquid_icon.png'],
    ['Solus Victorem', '/images/team_icons/solus_victorem_icon.png'],
    ['Nyam Gaming', '/images/team_icons/nyam_gaming_icon.png'],
    ['Al Qadsiah', '/images/team_icons/al_qadsiah_icon.png'],
    ['ZAN Esports', '/images/team_icons/zan_esports_icon.png'],
    ['FURY', '/images/team_icons/fury_icon.png'],
    ['MMY', '/images/team_icons/mmy_icon.png'],
    ['Homie E', '/images/team_icons/homie_e_icon.png'],
    ["Tokyo Ta1yo's", '/images/team_icons/tokyo_talyos_icon.png'],
    ['Lazuli', '/images/team_icons/lazuli_icon.png'],
    ['DEG', '/images/team_icons/deg_icon.png'],
    ['Milk Tea', '/images/team_icons/milk_tea_icon.png'],
    ['New Era', '/images/team_icons/new_era_icon.png'],
    ['Cheeseburger', '/images/team_icons/cheeseburger_icon.png'],
    ['Telomere', '/images/team_icons/telomere_icon.png'],
    ['Extinction', '/images/team_icons/extinction_icon.png'],
    ['Disguised', '/images/team_icons/disguised_icon.png'],
    ["Anyone's Legend", '/images/team_icons/anyones_legend_icon.png'],
    ['Team Peps', '/images/team_icons/team_peps_icon.png']
  ];

  try {
    let updated = 0;
    let notFound = 0;

    for (const [teamName, iconPath] of updates) {
      const [result] = await db.query(
        `UPDATE teams SET icon_path = ? WHERE name = ?`,
        [iconPath, teamName]
      );

      if (result.affectedRows > 0) {
        console.log(`✅ ${teamName} -> ${iconPath}`);
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

setTeamIconsByName();