require('dotenv').config();
const db = require('../db');

async function setTeamIcons() {
  const updates = [
    ['99divine', '/images/team_icons/99divide_icon.png'],
    ['al_qadsiah', '/images/team_icons/al_qadsiah_icon.png'],
    ['all_games', '/images/team_icons/all_games_icon.png'],
    ["anyone's_legend", "/images/team_icons/anyones_legend_icon.png"],
    ['cheeseburger', '/images/team_icons/cheeseburger_icon.png'],
    ['crazy_raccoon', '/images/team_icons/crazy_raccoon_icon.png'],
    ['dallas_fuel', '/images/team_icons/dallas_fuel_icon.png'],
    ['disguised', '/images/team_icons/disguised_icon.png'],
    ['enter_force.36', '/images/team_icons/enter_force_36_icon.png'],
    ['extinction', '/images/team_icons/extinction_icon.png'],
    ['fury', '/images/team_icons/fury_icon.png'],
    ['geekay', '/images/team_icons/geekay_icon.png'],
    ['homie', '/images/team_icons/homie_e_icon.png'],
    ['jd_gaming', '/images/team_icons/jd_gaming_icon.png'],
    ['lazuli', '/images/team_icons/lazuli_icon.png'],
    ['lunex_gaming', '/images/team_icons/lunex_gaming_icon.png'],
    ['milk_tea', '/images/team_icons/milk_tea_icon.png'],
    ['mmy', '/images/team_icons/mmy_icon.png'],
    ['naive_piggy', '/images/team_icons/naive_piggy_icon.png'],
    ['new_era', '/images/team_icons/new_era_icon.png'],
    ['nyam_gaming', '/images/team_icons/nyam_gaming_icon.png'],
    ['onside_gaming', '/images/team_icons/onside_gaming_icon.png'],
    ['please_not_hero_ban', '/images/team_icons/please_not_hero_ban_icon.png'],
    ['quasar', '/images/team_icons/quasar_icon.png'],
    ['rankers', '/images/team_icons/rankers_icon.png'],
    ['solus_victorem', '/images/team_icons/solus_victorem_icon.png'],
    ['space_station_gaming', '/images/team_icons/SSG_icon.png'],
    ['t1', '/images/team_icons/t1_icon.png'],
    ['team_falcons', '/images/team_icons/team_falcons_icon.png'],
    ['team_liquid', '/images/team_icons/team_liquid_icon.png'],
    ['team_peps', '/images/team_icons/team_peps_icon.png'],
    ['team_secret', '/images/team_icons/team_secret_icon.png'],
    ['telomere', '/images/team_icons/telomere_icon.png'],
    ['the_gatos_guapos', '/images/team_icons/the_gatos_guapos_icon.png'],
    ["tokyo_ta1yo's", "/images/team_icons/tokyo_ta1yo's_icon.png"],
    ['twisted_minds', '/images/team_icons/twisted_minds_icon.png'],
    ['varrel', '/images/team_icons/varrel_icon.png'],
    ['virtus.pro', '/images/team_icons/virtus.pro_icon.png'],
    ['weibo_gaming', '/images/team_icons/weibo_gaming_icon.png'],
    ['zan_esports', '/images/team_icons/zan_esports_icon.png'],
    ['zeta_division', '/images/team_icons/zeta_division_icon.png'],
    ['poker_face', '/images/team_icons/poker_face_icon.png']
  ];

  try {
    for (const [slug, iconPath] of updates) {
      const [result] = await db.query(
        `UPDATE teams SET icon_path = ? WHERE slug = ?`,
        [iconPath, slug]
      );

      console.log(`${slug}: ${result.affectedRows > 0 ? 'updated' : 'not found'}`);
    }

    console.log('\nDone.');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

setTeamIcons();