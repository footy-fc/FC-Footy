interface Team {
  name: string;
  abbreviation: string;
  league: string;
  logoUrl: string;
}

// Team abbreviations and names grouped by league
export const teamsByLeague: { [league: string]: { team: string; abbr: string }[] } = {
  "eng.1": [
    { team: "Arsenal", abbr: "ars" },
    { team: "Aston Villa", abbr: "avl" },
    { team: "Bournemouth", abbr: "bou" },
    { team: "Brentford", abbr: "bre" },
    { team: "Brighton", abbr: "bha" },
    { team: "Chelsea", abbr: "che" },
    { team: "Crystal Palace", abbr: "cry" },
    { team: "Everton", abbr: "eve" },
    { team: "Fulham", abbr: "ful" },
    { team: "Ipswich", abbr: "ips" },
    { team: "Leicester", abbr: "lei" },
    { team: "Liverpool", abbr: "liv" },
    { team: "Man City", abbr: "mnc" },
    { team: "Man Utd", abbr: "man" },
    { team: "Newcastle", abbr: "new" },
    { team: "Nott'm Forest", abbr: "nfo" },
    { team: "Southampton", abbr: "sou" },
    { team: "Spurs", abbr: "tot" },
    { team: "West Ham", abbr: "whu" },
    { team: "Wolves", abbr: "wol" }
  ],
  "eng.2": [
  { team: "Burnley", abbr: "bur" },
  { team: "Luton Town", abbr: "lut" },
  { team: "Sheffield United", abbr: "shu" },
  { team: "Sunderland", abbr: "sun" },
  { team: "West Bromwich Albion", abbr: "wba" },
  { team: "Leeds United", abbr: "lee" },
  { team: "Norwich City", abbr: "nor" },
  { team: "Middlesbrough", abbr: "mid" },
  { team: "Coventry City", abbr: "cov" },
  { team: "Hull City", abbr: "hul" },
  { team: "Preston North End", abbr: "pre" },
  { team: "Stoke City", abbr: "sto" },
  { team: "Queens Park Rangers", abbr: "qpr" },
  { team: "Swansea City", abbr: "swa" },
  { team: "Blackburn Rovers", abbr: "bla" },
  { team: "Bristol City", abbr: "bri" },
  { team: "Watford", abbr: "wat" },
  { team: "Cardiff City", abbr: "car" },
  { team: "Millwall", abbr: "mil" },
  { team: "Plymouth Argyle", abbr: "ply" },
  { team: "Sheffield Wednesday", abbr: "shw" },
  { team: "Derby County", abbr: "der" },
  { team: "Oxford United", abbr: "oxf" },
  { team: "Portsmouth", abbr: "por" }
],
  "esp.1": [
    { team: "Athletic Bilbao", abbr: "ath" },
    { team: "Atlético de Madrid", abbr: "atm" },
    { team: "CA Osasuna", abbr: "osa" },
    { team: "CD Leganés", abbr: "leg" },
    { team: "Celta de Vigo", abbr: "cel" },
    { team: "Deportivo Alavés", abbr: "alv" },
    { team: "FC Barcelona", abbr: "bar" },
    { team: "Getafe CF", abbr: "get" },
    { team: "Girona FC", abbr: "gir" },
    { team: "RCD Espanyol Barcelona", abbr: "esp" },
    { team: "RCD Mallorca", abbr: "mal" },
    { team: "Rayo Vallecano", abbr: "ray" },
    { team: "Real Betis Balompié", abbr: "bet" },
    { team: "Real Madrid", abbr: "rma" },
    { team: "Real Sociedad", abbr: "rso" },
    { team: "Real Valladolid CF", abbr: "vll" },
    { team: "Sevilla FC", abbr: "sev" },
    { team: "UD Las Palmas", abbr: "lpa" },
    { team: "Valencia CF", abbr: "val" },
    { team: "Villarreal CF", abbr: "vil" }
  ],
  "fra.1": [
    { team: "AJ Auxerre", abbr: "aja" },
    { team: "Angers SCO", abbr: "ang" },
    { team: "AS Monaco", abbr: "asm" },
    { team: "AS Saint-Étienne", abbr: "ste" },
    { team: "FC Nantes", abbr: "nte" },
    { team: "FC Toulouse", abbr: "tol" },
    { team: "Le Havre AC", abbr: "lhv" },
    { team: "LOSC Lille", abbr: "lil" },
    { team: "Montpellier HSC", abbr: "mtp" },
    { team: "OGC Nice", abbr: "nic" },
    { team: "Olympique Lyon", abbr: "lyo" },
    { team: "Olympique Marseille", abbr: "mar" },
    { team: "Paris Saint-Germain", abbr: "psg" },
    { team: "RC Lens", abbr: "len" },
    { team: "RC Strasbourg Alsace", abbr: "str" },
    { team: "Stade Brestois 29", abbr: "bre" },
    { team: "Stade Reims", abbr: "rei" },
    { team: "Stade Rennais FC", abbr: "ren" }
  ],
  "ger.1": [
    { team: "1.FC Heidenheim 1846", abbr: "hei" },
    { team: "1.FC Union Berlin", abbr: "ubn" },
    { team: "1.FSV Mainz 05", abbr: "mai" },
    { team: "Bayer 04 Leverkusen", abbr: "lev" },
    { team: "Bayern Munich", abbr: "bay" },
    { team: "Borussia Dortmund", abbr: "dor" },
    { team: "Borussia Mönchengladbach", abbr: "mgl" },
    { team: "Eintracht Frankfurt", abbr: "eff" },
    { team: "FC Augsburg", abbr: "aug" },
    { team: "FC St. Pauli", abbr: "stp" },
    { team: "Holstein Kiel", abbr: "kie" },
    { team: "RB Leipzig", abbr: "rbl" },
    { team: "SC Freiburg", abbr: "fri" },
    { team: "SV Werder Bremen", abbr: "wer" },
    { team: "TSG 1899 Hoffenheim", abbr: "tsg" },
    { team: "VfB Stuttgart", abbr: "stu" },
    { team: "VfL Bochum", abbr: "boc" },
    { team: "VfL Wolfsburg", abbr: "wol" }
  ],
  "ita.1": [
    { team: "AC Milan", abbr: "mil" },
    { team: "AC Monza", abbr: "mon" },
    { team: "ACF Fiorentina", abbr: "fio" },
    { team: "AS Roma", abbr: "rom" },
    { team: "Atalanta BC", abbr: "ata" },
    { team: "Bologna FC 1909", abbr: "bol" },
    { team: "Cagliari Calcio", abbr: "cal" },
    { team: "Como 1907", abbr: "com" },
    { team: "FC Empoli", abbr: "emp" },
    { team: "Genoa CFC", abbr: "gen" },
    { team: "Hellas Verona", abbr: "ver" },
    { team: "Inter Milan", abbr: "int" },
    { team: "Juventus FC", abbr: "juv" },
    { team: "Parma Calcio 1913", abbr: "par" },
    { team: "SS Lazio", abbr: "laz" },
    { team: "SSC Napoli", abbr: "nap" },
    { team: "Torino FC", abbr: "tor" },
    { team: "US Lecce", abbr: "lec" },
    { team: "Udinese Calcio", abbr: "udi" },
    { team: "Venezia FC", abbr: "ven" }
  ],
  "usa.1": [
    { team: "Atlanta United", abbr: "atl" },
    { team: "Austin FC", abbr: "atx" },
    { team: "Chicago Fire", abbr: "chi" },
    { team: "FC Cincinnati", abbr: "cin" },
    { team: "Columbus Crew", abbr: "clb" },
    { team: "Charlotte FC", abbr: "clt" },
    { team: "Colorado Rapids", abbr: "col" },
    { team: "FC Dallas", abbr: "dal" },
    { team: "D.C. United", abbr: "dcu" },
    { team: "Houston Dynamo", abbr: "hou" },
    { team: "Juarez", abbr: "jua" },
    { team: "LA Galaxy", abbr: "la" },
    { team: "LA Galaxy", abbr: "lag" },
    { team: "LAFC", abbr: "laf" },
    { team: "Inter Miami", abbr: "mia" },
    { team: "Minnesota United", abbr: "min" },
    { team: "New England Revolution", abbr: "ner" },
    { team: "Nashville SC", abbr: "nsh" },
    { team: "New York City FC", abbr: "nyc" },
    { team: "New York Red Bulls", abbr: "nyr" },
    { team: "Orlando City SC", abbr: "orl" },
    { team: "Philadelphia Union", abbr: "phi" },
    { team: "Portland Timbers", abbr: "por" },
    { team: "Real Salt Lake", abbr: "rsl" },
    { team: "San Jose Earthquakes", abbr: "sj" },
    { team: "Seattle Sounders", abbr: "sea" },
    { team: "Sporting Kansas City", abbr: "skc" },
    { team: "St. Louis City SC", abbr: "stl" },
    { team: "Toronto FC", abbr: "tor" },
    { team: "Vancouver Whitecaps", abbr: "van" }
  ],
  ["fifa.worldq.conmebol"]: [
    { team: "Argentina", abbr: "arg" },
    { team: "Bolivia", abbr: "bol" },
    { team: "Brazil", abbr: "bra" },
    { team: "Chile", abbr: "chi" },
    { team: "Colombia", abbr: "col" },
    { team: "Ecuador", abbr: "ecu" },
    { team: "Paraguay", abbr: "par" },
    { team: "Peru", abbr: "per" },
    { team: "Uruguay", abbr: "uru" },
    { team: "Venezuela", abbr: "ven" },
  ],
  ["fifa.worldq.uefa"]: [
    { team: "Albania", abbr: "alb" },
    { team: "Andorra", abbr: "and" },
    { team: "Armenia", abbr: "arm" },
    { team: "Austria", abbr: "aut" },
    { team: "Azerbaijan", abbr: "aze" },
    { team: "Belarus", abbr: "blr" },
    { team: "Belgium", abbr: "bel" },
    { team: "Bosnia and Herzegovina", abbr: "bih" },
    { team: "Bulgaria", abbr: "bul" },
    { team: "Croatia", abbr: "cro" },
    { team: "Cyprus", abbr: "cyp" },
    { team: "Czech Republic", abbr: "cze" },
    { team: "Denmark", abbr: "den" },
    { team: "England", abbr: "eng" },
    { team: "Estonia", abbr: "est" },
    { team: "Finland", abbr: "fin" },
    { team: "France", abbr: "fra" },
    { team: "Georgia", abbr: "geo" },
    { team: "Germany", abbr: "ger" },
    { team: "Greece", abbr: "gre" },
    { team: "Hungary", abbr: "hun" },
    { team: "Iceland", abbr: "isl" },
    { team: "Ireland", abbr: "irl" },
    { team: "Italy", abbr: "ita" },
    { team: "Kazakhstan", abbr: "kaz" },
    { team: "Kosovo", abbr: "kos" },
    { team: "Latvia", abbr: "lva" },
    { team: "Liechtenstein", abbr: "lie" },
    { team: "Lithuania", abbr: "ltu" },
    { team: "Luxembourg", abbr: "lux" },
    { team: "Malta", abbr: "mlt" },
    { team: "Moldova", abbr: "mda" },
    { team: "Monaco", abbr: "mco" },
    { team: "Montenegro", abbr: "mne" },
    { team: "Netherlands", abbr: "nld" },
    { team: "North Macedonia", abbr: "mkd" },
    { team: "Norway", abbr: "nor" },
    { team: "Poland", abbr: "pol" },
    { team: "Portugal", abbr: "por" },
    { team: "Romania", abbr: "rou" },
    { team: "Russia", abbr: "rus" },
    { team: "San Marino", abbr: "smr" },
    { team: "Serbia", abbr: "srb" },
    { team: "Slovakia", abbr: "svk" },
    { team: "Slovenia", abbr: "svn" },
    { team: "Spain", abbr: "esp" },
    { team: "Sweden", abbr: "swe" },
    { team: "Switzerland", abbr: "che" },
    { team: "Turkey", abbr: "tur" },
    { team: "Ukraine", abbr: "ukr" },
    { team: "United Kingdom", abbr: "gbr" },
    { team: "Wales", abbr: "wal" }
  ],
  ["fifa.worldq.concacaf"]: [
    { team: "Antigua and Barbuda", abbr: "atg" },
    { team: "Bahamas", abbr: "bhs" },
    { team: "Barbados", abbr: "brb" },
    { team: "Belize", abbr: "blz" },
    { team: "Canada", abbr: "can" },
    { team: "Costa Rica", abbr: "crc" },
    { team: "Cuba", abbr: "cub" },
    { team: "Dominica", abbr: "dma" },
    { team: "Dominican Republic", abbr: "dom" },
    { team: "El Salvador", abbr: "slv" },
    { team: "Grenada", abbr: "grd" },
    { team: "Guatemala", abbr: "gtm" },
    { team: "Haiti", abbr: "hti" },
    { team: "Honduras", abbr: "hon" },
    { team: "Jamaica", abbr: "jam" },
    { team: "Mexico", abbr: "mex" },
    { team: "Nicaragua", abbr: "nic" },
    { team: "Panama", abbr: "pan" },
    { team: "Saint Kitts and Nevis", abbr: "skn" },
    { team: "Saint Lucia", abbr: "lca" },
    { team: "Saint Vincent and the Grenadines", abbr: "vct" },
    { team: "Trinidad and Tobago", abbr: "tto" },
    { team: "United States", abbr: "usa" }
  ],
  ["fifa.worldq.afc"]: [
    { team: "Afghanistan", abbr: "afg" },
    { team: "Australia", abbr: "aus" },
    { team: "Bahrain", abbr: "bhr" },
    { team: "Bangladesh", abbr: "ban" },
    { team: "Brunei", abbr: "brn" },
    { team: "Cambodia", abbr: "cam" },
    { team: "China", abbr: "chn" },
    { team: "Chinese Taipei", abbr: "tpe" },
    { team: "India", abbr: "ind" },
    { team: "Iran", abbr: "irn" },
    { team: "Iraq", abbr: "irq" },
    { team: "Japan", abbr: "jpn" },
    { team: "Jordan", abbr: "jor" },
    { team: "Kazakhstan", abbr: "kaz" },
    { team: "Korea Republic", abbr: "kor" },
    { team: "Kuwait", abbr: "kuw" },
    { team: "Kyrgyzstan", abbr: "kgz" },
    { team: "Laos", abbr: "lao" },
    { team: "Lebanon", abbr: "lbn" },
    { team: "Malaysia", abbr: "mas" },
    { team: "Maldives", abbr: "mdv" },
    { team: "Mongolia", abbr: "mng" },
    { team: "Myanmar", abbr: "mmr" },
    { team: "Nepal", abbr: "npl" },
    { team: "Oman", abbr: "omn" },
    { team: "Pakistan", abbr: "pak" },
  ],
  ["fifa.worldq.caf"]: [
    { team: "Algeria", abbr: "alg" },
    { team: "Angola", abbr: "ang" },
    { team: "Benin", abbr: "ben" },
    { team: "Botswana", abbr: "bot" },
    { team: "Burkina Faso", abbr: "bur" },
    { team: "Burundi", abbr: "bdi" },
    { team: "Cameroon", abbr: "cmr" },
    { team: "Cape Verde", abbr: "cpv" },
    { team: "Central African Republic", abbr: "caf" },
    { team: "Chad", abbr: "cha" },
    { team: "Comoros", abbr: "com" },
    { team: "Congo", abbr: "cgo" },
    { team: "Congo DR", abbr: "cod" },
    { team: "Djibouti", abbr: "dji" },
    { team: "Egypt", abbr: "egy" },
    { team: "Equatorial Guinea", abbr: "gnq" },
    { team: "Eritrea", abbr: "eri" },
    { team: "Eswatini", abbr: "swz" },
    { team: "Ethiopia", abbr: "eth" },
    { team: "Gabon", abbr: "gab" },
    { team: "Gambia", abbr: "gam" },
    { team: "Ghana", abbr: "gha" },
    { team: "Guinea", abbr: "gin" },
    { team: "Guinea-Bissau", abbr: "gnb" },
    { team: "Ivory Coast", abbr: "civ" },
    { team: "Kenya", abbr: "ken" },
    { team: "Lesotho", abbr: "lso" },
    { team: "Liberia", abbr: "lbr" },
    { team: "Libya", abbr: "lby" },
    { team: "Madagascar", abbr: "mad" },
    { team: "Malawi", abbr: "mwi" },
    { team: "Mali", abbr: "mli" },
    { team: "Mauritania", abbr: "mrt" },
    { team: "Mauritius", abbr: "mus" },
    { team: "Morocco", abbr: "mar" },
    { team: "Mozambique", abbr: "moz" },
    { team: "Namibia", abbr: "nam" },
    { team: "Niger", abbr: "ner" },
    { team: "Nigeria", abbr: "nga" },
    { team: "Rwanda", abbr: "rwa" },
    { team: "Sao Tome and Principe", abbr: "stp" },
    { team: "Senegal", abbr: "sen" },
    { team: "Seychelles", abbr: "sey" },
    { team: "Sierra Leone", abbr: "sle" },
    { team: "Somalia", abbr: "som" },
    { team: "South Africa", abbr: "zaf" },
    { team: "South Sudan", abbr: "ssd" },
    { team: "Sudan", abbr: "sud" },
    { team: "Tanzania", abbr: "tan" },
    { team: "Togo", abbr: "tog" },
    { team: "Tunisia", abbr: "tun" },
    { team: "Uganda", abbr: "uga" },
    { team: "Zambia", abbr: "zam" },
    { team: "Zimbabwe", abbr: "zim" }
  ]
};

/**
 * Get the full team name based on its abbreviation and league
 * 
 * @param teamAbbr - The team abbreviation (e.g., 'mnc', 'bha')
 * @param league - The league code (e.g., 'eng.1', 'esp.1')
 * @returns The full team name or a default value if not found
 */
export function getTeamFullName(teamAbbr: string, league: string): string {
  if (!teamAbbr || !league) return "Unknown Team";

  const normalizedAbbr = teamAbbr.toLowerCase();
  const leagueTeams = teamsByLeague[league];

  if (!leagueTeams) {
    console.warn(`[Team Lookup] League not found: ${league}. Returning default.`);
    return "Unknown League Team";
  }

  const team = leagueTeams.find(t => t.abbr.toLowerCase() === normalizedAbbr);

  if (!team) {
    console.warn(`[Team Lookup] Team not found: ${normalizedAbbr} in ${league}. Returning default.`);
    return "Unknown Team";
  }

  return team.team; // Return the full team name
}

/**
 * Get the logo URL for a team based on its abbreviation and league
 * 
 * @param teamAbbr - The team abbreviation (e.g., 'clb', 'hou')
 * @param league - The league code (e.g., 'usa.1', 'eng.1')
 * @returns The URL to the team logo or default spinner if not available
 */
export function getTeamLogo(teamAbbr: string, league: string): string {
  // Default fallback image
  const DEFAULT_LOGO = '/defifa_spinner.gif';
  //console.log(`[Team Logo] Fetching logo for team: ${teamAbbr}, league: ${league}`);
  // Return default if missing required params
  if (!teamAbbr || !league) {
    // console.log(`[Team Logo] Missing required params: teamAbbr=${teamAbbr}, league=${league}. Using fallback.`);
    return DEFAULT_LOGO;
  }
  
  // Normalize the team abbreviation to lowercase
  const normalizedAbbr = teamAbbr.toLowerCase();
  
  // Validate if the team exists in the specified league
  const leagueTeams = teamsByLeague[league];
  if (!leagueTeams) {
    // console.log(`[Team Logo] League not found: ${league}. Using fallback.`);
    return DEFAULT_LOGO;
  }
  
  // Check if the team abbreviation exists in the league
  const teamExists = leagueTeams.some(team => team.abbr.toLowerCase() === normalizedAbbr);
  if (!teamExists) {
    // // console.log(`[Team Logo] Team not found: ${normalizedAbbr} in league ${league}. Using fallback.`);
    return DEFAULT_LOGO;
  }
  
  // Construct the logo URL using the league as part of the path
  const logoUrl = `https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/${league}/${normalizedAbbr}.png`;
  // console.log(`[Team Logo] Using logo URL: ${logoUrl}`);
  return logoUrl;
}

/**
 * Extracts league code from blockchain event ID format.
 * Example: "eng_1_LA_STL_20250311180716" → "eng.1"
 *
 * @param eventId - The event ID from the blockchain
 * @returns The formatted league code (e.g., "eng.1")
 */
export function getLeagueFromEventId(eventId: string): string {
  if (!eventId) return "usa.1"; // Default fallback

  // Extract league part from eventId (e.g., "eng_1_LA_STL_20250311180716" → "eng_1")
  const parts = eventId.split("_");
  if (parts.length < 2) return "usa.1"; // Fallback if format is unexpected

  const rawLeague = `${parts[0]}_${parts[1]}`; // Extract "eng_1", "usa_1", etc.

  // Convert format from "eng_1" → "eng.1" for compatibility with `teamsByLeague`
  return rawLeague.replace("_", ".");
}

/**
 * Get the league code from a numeric league ID
 * 
 * @param leagueId - The numeric league ID (e.g., '1', '2')
 * @returns The league code (e.g., 'usa.1', 'eng.1')
 */
export function getLeagueCode(leagueId: string): string {
  // If leagueId is undefined, null, or empty string, default to USA MLS
  if (!leagueId) {
    return 'usa.1';
  }
  
  const leagueMap: Record<string, string> = {
    '1': 'usa.1',
    '2': 'eng.1',
    '3': 'esp.1',
    '4': 'ger.1',
    '5': 'ita.1',
    '6': 'fra.1',
    '7': 'uefa.champions',
    '8': 'uefa.europa',
    '9': 'eng.2',
    '10': 'fifa.worldq.conmebol',
    '11': 'fifa.worldq.uefa',
    '12': 'fifa.worldq.concacaf',
    '13': 'fifa.worldq.afc',
    '14': 'eng.fa',
    '15': 'eng.league_cup',
    '16': 'fifa.worldq.caf'
  };
  
  // Check if the league code is directly provided (e.g., 'usa.1' instead of '1')
  if (Object.values(leagueMap).includes(leagueId)) {
    return leagueId;
  }
  
  return leagueMap[leagueId] || 'usa.1'; // Default to USA MLS if not found
}

export const fetchTeamLogos = async (): Promise<Team[]> => {
  try {
    const teamData: Team[] = [];

    // Iterate over each league and its teams.
    for (const [league, teams] of Object.entries(teamsByLeague)) {
      teams.forEach(({ team, abbr }) => {
        // Use the getTeamLogo function to get the logo URL
        const logoUrl = getTeamLogo(abbr, league);
        
        // Push the team data, including the league.
        teamData.push({ name: team, abbreviation: abbr, league, logoUrl });
      });
    }

    return teamData;
  } catch (error) {
    console.error("Error fetching team logos:", error);
    throw new Error("Error fetching team logos");
  }
};

/**
 * Returns a user-friendly league name from the league ID.
 *
 * @param leagueId - The league identifier (e.g., "eng.1", "uefa.champions")
 * @returns The full league name (e.g., "Premier League", "UEFA Champions League")
 */
export function getLeagueDisplayName(leagueId: string): string {
  const leagueMap: Record<string, string> = {
    "eng.1": "Premier League",
    "eng.2": "Championship",
    "uefa.champions": "UEFA Champions League",
    "uefa.europa": "UEFA Europa League",
    "fra.1": "Ligue 1",
    "esp.1": "La Liga",
    "ger.1": "Bundesliga",
    "ita.1": "Serie A",
    "usa.1": "Major League Soccer (MLS)",
    "eng.fa": "FA Cup",
    "eng.league_cup": "EFL Cup",
    "fifa.worldq.conmebol": "World Cup Qualifiers (CONMEBOL)",
    "fifa.worldq.uefa": "World Cup Qualifiers (UEFA)",
    "fifa.worldq.concacaf": "World Cup Qualifiers (CONCACAF)",
    "fifa.worldq.afc": "World Cup Qualifiers (AFC)",
  };

  return leagueMap[leagueId] || leagueId; // Return mapped name or fallback to leagueId
}
