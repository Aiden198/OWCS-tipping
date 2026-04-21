function parseCompetitionMetadata(pageUrl) {
  const parsed = new URL(pageUrl);
  const path = decodeURIComponent(parsed.pathname.replace(/^\/overwatch\//, ''));
  const parts = path.split('/');

  // Examples:
  // Overwatch_Champions_Series/2026/NA/Stage_1/Regular_Season
  // Overwatch_Champions_Series/2026/EMEA/Stage_1/Relegation
  // Overwatch_Champions_Series/2026/Asia/Stage_1/Japan/Regular_Season
  // Overwatch_World_Cup/2026

  const series = parts[0] || null;
  const seasonYear = parts[1] ? Number(parts[1]) : null;

  let umbrellaRegion = null;
  let competitionRegion = null;
  let stagePart = null;
  let phasePart = null;

  if (series === 'Overwatch_World_Cup') {
    umbrellaRegion = 'World Cup';
    competitionRegion = 'World Cup';
    stagePart = parts[2] || null;
    phasePart = parts[3] || null;
  } else if (parts[2] === 'Asia') {
    umbrellaRegion = 'Asia';
    stagePart = parts[3] || null;
    competitionRegion = parts[4] || null; // Japan / Korea / Pacific
    phasePart = parts[5] || null;         // Regular_Season / Relegation
  } else {
    competitionRegion = parts[2] || null; // NA / EMEA / China
    stagePart = parts[3] || null;         // Stage_1
    phasePart = parts[4] || null;         // Regular_Season / Relegation
  }

  let stageNumber = null;
  if (stagePart && /^Stage_\d+$/i.test(stagePart)) {
    stageNumber = Number(stagePart.replace(/Stage_/i, ''));
  }

  let stageType = 'main';
  if (phasePart) {
    stageType = phasePart.toLowerCase();
  }

  const titleParts =
    series === 'Overwatch_World_Cup'
      ? [
          'Overwatch World Cup',
          seasonYear,
          stagePart ? stagePart.replace(/_/g, ' ') : null,
          phasePart ? phasePart.replace(/_/g, ' ') : null
        ].filter(Boolean)
      : [
          'OWCS',
          seasonYear,
          umbrellaRegion,
          competitionRegion,
          stagePart ? stagePart.replace(/_/g, ' ') : null,
          phasePart ? phasePart.replace(/_/g, ' ') : null
        ].filter(Boolean);

  const title = titleParts.join(' ');

  const sourceKey =
    series === 'Overwatch_World_Cup'
      ? [
          series,
          seasonYear,
          'world_cup',
          stagePart,
          phasePart
        ]
          .filter(Boolean)
          .join(':')
          .toLowerCase()
      : [
          series,
          seasonYear,
          umbrellaRegion,
          competitionRegion,
          stagePart,
          phasePart
        ]
          .filter(Boolean)
          .join(':')
          .toLowerCase();

  return {
    title,
    game: 'overwatch',
    season_year: seasonYear,
    umbrella_region: umbrellaRegion,
    competition_region: competitionRegion,
    stage_number: stageNumber,
    stage_type: stageType,
    source_page: pageUrl,
    source_key: sourceKey,
    active: true
  };
}

module.exports = parseCompetitionMetadata;