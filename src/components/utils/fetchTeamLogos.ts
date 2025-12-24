interface Team {
  name: string;
  abbreviation: string;
  league: string;
  logoUrl: string;
  roomHash: string;
}

// Team abbreviations and names grouped by league
export const teamsByLeague: { [league: string]: { team: string; abbr: string; roomHash?: string }[] } = {
  "eng.1": [
    { team: "Arsenal", abbr: "ars", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Aston Villa", abbr: "avl", roomHash: "0xec615487f9c2c53263b4fd548ea298814c70343a" },
    { team: "Bournemouth", abbr: "bou", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Brentford", abbr: "bre", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Brighton", abbr: "bha", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Chelsea", abbr: "che", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Crystal Palace", abbr: "cry", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Everton", abbr: "eve", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Fulham", abbr: "ful", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Ipswich", abbr: "ips", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Leicester", abbr: "lei", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Liverpool", abbr: "liv", roomHash: "0x8e54d2497fbc73f1c8ff40ad8338afacef692364" },
    { team: "Man City", abbr: "mnc", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Man Utd", abbr: "man", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Newcastle", abbr: "new", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Nott'm Forest", abbr: "nfo", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Southampton", abbr: "sou", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Spurs", abbr: "tot", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "West Ham", abbr: "whu", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Wolves", abbr: "wol", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" }
  ],
"eng.2": [
  { team: "Burnley", abbr: "bur", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
  { team: "Luton Town", abbr: "lut", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
  { team: "Sheffield United", abbr: "shu", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
  { team: "Sunderland", abbr: "sun", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
  { team: "West Bromwich Albion", abbr: "wba", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
  { team: "Leeds United", abbr: "lee", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
  { team: "Norwich City", abbr: "nor", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
  { team: "Middlesbrough", abbr: "mid", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
  { team: "Coventry City", abbr: "cov", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
  { team: "Hull City", abbr: "hul", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
  { team: "Preston North End", abbr: "pre", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
  { team: "Stoke City", abbr: "sto", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
  { team: "Queens Park Rangers", abbr: "qpr", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
  { team: "Swansea City", abbr: "swa", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
  { team: "Blackburn Rovers", abbr: "bla", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
  { team: "Bristol City", abbr: "bri", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
  { team: "Watford", abbr: "wat", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
  { team: "Cardiff City", abbr: "car", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
  { team: "Millwall", abbr: "mil", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
  { team: "Plymouth Argyle", abbr: "ply", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
  { team: "Sheffield Wednesday", abbr: "shw", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
  { team: "Derby County", abbr: "der", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
  { team: "Oxford United", abbr: "oxf", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
  { team: "Portsmouth", abbr: "por", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" }
],
  "esp.1": [
    { team: "Athletic Bilbao", abbr: "ath", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Atlético de Madrid", abbr: "atm", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "CA Osasuna", abbr: "osa", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "CD Leganés", abbr: "leg", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Celta de Vigo", abbr: "cel", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Deportivo Alavés", abbr: "alv", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "FC Barcelona", abbr: "bar", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Getafe CF", abbr: "get", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Girona FC", abbr: "gir", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "RCD Espanyol Barcelona", abbr: "esp", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "RCD Mallorca", abbr: "mal", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Rayo Vallecano", abbr: "ray", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Real Betis Balompié", abbr: "bet", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Real Madrid", abbr: "rma", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Real Sociedad", abbr: "rso", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Real Valladolid CF", abbr: "vll", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Sevilla FC", abbr: "sev", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "UD Las Palmas", abbr: "lpa", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Valencia CF", abbr: "val", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Villarreal CF", abbr: "vil", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" }
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
    { team: "1.FC Heidenheim 1846", abbr: "hei", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "1.FC Union Berlin", abbr: "ubn", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "1.FSV Mainz 05", abbr: "mai", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Bayer 04 Leverkusen", abbr: "lev", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Bayern Munich", abbr: "bay", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Borussia Dortmund", abbr: "dor", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Borussia Mönchengladbach", abbr: "mgl", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Eintracht Frankfurt", abbr: "eff", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "FC Augsburg", abbr: "aug", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "FC St. Pauli", abbr: "stp", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Holstein Kiel", abbr: "kie", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "RB Leipzig", abbr: "rbl", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "SC Freiburg", abbr: "fri", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "SV Werder Bremen", abbr: "wer", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "TSG 1899 Hoffenheim", abbr: "tsg", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "VfB Stuttgart", abbr: "stu", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "VfL Bochum", abbr: "boc", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "VfL Wolfsburg", abbr: "wol", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" }
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
    { team: "Seattle Sounders", abbr: "sea", roomHash: "0x43c00e7cc2e247a924da0360134884736192e34b" },
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
    // { team: "Armenia", abbr: "arm" },
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
    // { team: "Kosovo", abbr: "kos" },
    { team: "Latvia", abbr: "lva" },
    { team: "Liechtenstein", abbr: "lie" },
    { team: "Lithuania", abbr: "ltu" },
    { team: "Luxembourg", abbr: "lux" },
    { team: "Malta", abbr: "mlt" },
    { team: "Moldova", abbr: "mda" },
    // { team: "Monaco", abbr: "mco" },
    // { team: "Montenegro", abbr: "mne" },
    { team: "Netherlands", abbr: "ned" },
    { team: "North Macedonia", abbr: "mkd" },
    { team: "Norway", abbr: "nor" },
    { team: "Poland", abbr: "pol" },
    { team: "Portugal", abbr: "por" },
    { team: "Romania", abbr: "rom" },
    //{ team: "Russia", abbr: "rus" },
    { team: "San Marino", abbr: "smr" },
    { team: "Serbia", abbr: "srb" },
    { team: "Slovakia", abbr: "svk" },
    { team: "Slovenia", abbr: "svn" },
    { team: "Spain", abbr: "esp" },
    { team: "Sweden", abbr: "swe" },
    { team: "Switzerland", abbr: "sui" },
    { team: "Turkey", abbr: "tur" },
    { team: "Ukraine", abbr: "ukr" },
    { team: "Wales", abbr: "wal" }
  ],
  ["fifa.worldq.concacaf"]: [
    { team: "Antigua and Barbuda", abbr: "atg" },
    { team: "Bahamas", abbr: "bah" },
    { team: "Barbados", abbr: "brb" },
    { team: "Belize", abbr: "blz" },
    { team: "Canada", abbr: "can" },
    { team: "Costa Rica", abbr: "crc" },
    { team: "Cuba", abbr: "cub" },
    { team: "Dominica", abbr: "dma" },
    { team: "Dominican Republic", abbr: "dom" },
    { team: "El Salvador", abbr: "slv" },
    { team: "Grenada", abbr: "grn" },
    { team: "Guatemala", abbr: "gua" },
    { team: "Haiti", abbr: "hai" },
    { team: "Honduras", abbr: "hon" },
    { team: "Jamaica", abbr: "jam" },
    { team: "Mexico", abbr: "mex" },
    { team: "Nicaragua", abbr: "nca" },
    { team: "Panama", abbr: "pan" },
    { team: "Saint Kitts and Nevis", abbr: "skn" },
    { team: "Saint Lucia", abbr: "lca" },
    { team: "Saint Vincent and the Grenadines", abbr: "vin" },
    { team: "Trinidad and Tobago", abbr: "tri" },
    { team: "United States", abbr: "usa" }
  ],
  ["fifa.worldq.afc"]: [
    //{ team: "Afghanistan", abbr: "afg" },
    { team: "Australia", abbr: "aus" },
    { team: "Bahrain", abbr: "bhr" },
    //{ team: "Bangladesh", abbr: "ban" },
    //{ team: "Brunei", abbr: "brn" },
    { team: "Cambodia", abbr: "cam" },
    { team: "China", abbr: "chn" },
    //{ team: "Chinese Taipei", abbr: "tpe" },
    { team: "Indonesia", abbr: "idn" },
    //{ team: "India", abbr: "ind" },
    { team: "Iran", abbr: "irn" },
    { team: "Iraq", abbr: "irq" },
    { team: "Japan", abbr: "jpn" },
    { team: "Jordan", abbr: "jor" },
    //{ team: "Kazakhstan", abbr: "kaz" },
    { team: "Korea Republic", abbr: "kor" },
    { team: "Kuwait", abbr: "kuw" },
    { team: "Kyrgyzstan", abbr: "kgz" },
    { team: "Laos", abbr: "lao" },
    //{ team: "Lebanon", abbr: "lbn" },
    // { team: "Malaysia", abbr: "mas" },
    { team: "Maldives", abbr: "mdv" },
    //{ team: "Mongolia", abbr: "mng" },
    // { team: "Myanmar", abbr: "mmr" },
    //{ team: "Nepal", abbr: "nep" },
    { team: "Oman", abbr: "oma" },
    //{ team: "Pakistan", abbr: "pak" },
  ],
  ["fifa.worldq.caf"]: [
    { team: "Algeria", abbr: "alg" },
    { team: "Angola", abbr: "ang" },
    { team: "Benin", abbr: "ben" },
    { team: "Botswana", abbr: "bot" },
    //{ team: "Burkina Faso", abbr: "bfa" },
    { team: "Burundi", abbr: "bdi" },
    { team: "Cameroon", abbr: "cmr" },
    { team: "Cape Verde", abbr: "cpv" },
    // { team: "Central African Republic", abbr: "caf" },
    { team: "Chad", abbr: "cha" },
    { team: "Comoros", abbr: "com" },
    //{ team: "Congo", abbr: "cgo" },
    //{ team: "Congo DR", abbr: "cod" },
    { team: "Djibouti", abbr: "dji" },
    { team: "Egypt", abbr: "egy" },
    { team: "Equatorial Guinea", abbr: "eqg" },
    { team: "Eritrea", abbr: "eri" },
    { team: "Eswatini", abbr: "swz" },
    { team: "Ethiopia", abbr: "eth" },
    { team: "Gabon", abbr: "gab" },
    { team: "Gambia", abbr: "gam" },
    { team: "Ghana", abbr: "gha" },
    // { team: "Guinea", abbr: "gin" },
    { team: "Guinea-Bissau", abbr: "gnb" },
    { team: "Ivory Coast", abbr: "civ" },
    { team: "Kenya", abbr: "ken" },
    { team: "Lesotho", abbr: "les" },
    { team: "Liberia", abbr: "lbr" },
    { team: "Libya", abbr: "lby" },
    { team: "Madagascar", abbr: "mad" },
    { team: "Malawi", abbr: "mwi" },
    { team: "Mali", abbr: "mli" },
    { team: "Mauritania", abbr: "mtn" },
    { team: "Mauritius", abbr: "mri" },
    { team: "Morocco", abbr: "mar" },
    { team: "Mozambique", abbr: "moz" },
    { team: "Namibia", abbr: "nam" },
    { team: "Niger", abbr: "nig" },
    { team: "Nigeria", abbr: "nga" },
    { team: "Rwanda", abbr: "rwa" },
    //{ team: "Sao Tome and Principe", abbr: "stp" },
    { team: "Senegal", abbr: "sen" },
    { team: "Seychelles", abbr: "sey" },
    { team: "Sierra Leone", abbr: "sle" },
    { team: "Somalia", abbr: "som" },
    { team: "South Africa", abbr: "rsa" },
    //{ team: "South Sudan", abbr: "ssd" },
    { team: "Sudan", abbr: "sud" },
    { team: "Tanzania", abbr: "tan" },
    { team: "Togo", abbr: "tog" },
    { team: "Tunisia", abbr: "tun" },
    { team: "Uganda", abbr: "uga" },
    { team: "Zambia", abbr: "zam" },
    //{ team: "Zimbabwe", abbr: "zim" }
  ]
  ,
  ["caf.nations"]: [
    { team: "Algeria", abbr: "alg" },
    { team: "Angola", abbr: "ang" },
    { team: "Benin", abbr: "ben" },
    { team: "Botswana", abbr: "bot" },
    //{ team: "Burkina Faso", abbr: "bfa" },
    { team: "Burundi", abbr: "bdi" },
    { team: "Cameroon", abbr: "cmr" },
    { team: "Cape Verde", abbr: "cpv" },
    // { team: "Central African Republic", abbr: "caf" },
    { team: "Chad", abbr: "cha" },
    { team: "Comoros", abbr: "com" },
    //{ team: "Congo", abbr: "cgo" },
    //{ team: "Congo DR", abbr: "cod" },
    { team: "Djibouti", abbr: "dji" },
    { team: "Egypt", abbr: "egy" },
    { team: "Equatorial Guinea", abbr: "eqg" },
    { team: "Eritrea", abbr: "eri" },
    { team: "Eswatini", abbr: "swz" },
    { team: "Ethiopia", abbr: "eth" },
    { team: "Gabon", abbr: "gab" },
    { team: "Gambia", abbr: "gam" },
    { team: "Ghana", abbr: "gha" },
    // { team: "Guinea", abbr: "gin" },
    { team: "Guinea-Bissau", abbr: "gnb" },
    { team: "Ivory Coast", abbr: "civ" },
    { team: "Kenya", abbr: "ken" },
    { team: "Lesotho", abbr: "les" },
    { team: "Liberia", abbr: "lbr" },
    { team: "Libya", abbr: "lby" },
    { team: "Madagascar", abbr: "mad" },
    { team: "Malawi", abbr: "mwi" },
    { team: "Mali", abbr: "mli" },
    { team: "Mauritania", abbr: "mtn" },
    { team: "Mauritius", abbr: "mri" },
    { team: "Morocco", abbr: "mar" },
    { team: "Mozambique", abbr: "moz" },
    { team: "Namibia", abbr: "nam" },
    { team: "Niger", abbr: "nig" },
    { team: "Nigeria", abbr: "nga" },
    { team: "Rwanda", abbr: "rwa" },
    //{ team: "Sao Tome and Principe", abbr: "stp" },
    { team: "Senegal", abbr: "sen" },
    { team: "Seychelles", abbr: "sey" },
    { team: "Sierra Leone", abbr: "sle" },
    { team: "Somalia", abbr: "som" },
    { team: "South Africa", abbr: "rsa" },
    //{ team: "South Sudan", abbr: "ssd" },
    { team: "Sudan", abbr: "sud" },
    { team: "Tanzania", abbr: "tan" },
    { team: "Togo", abbr: "tog" },
    { team: "Tunisia", abbr: "tun" },
    { team: "Uganda", abbr: "uga" },
    { team: "Zambia", abbr: "zam" },
    //{ team: "Zimbabwe", abbr: "zim" }
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
    teams.forEach(({ team, abbr, roomHash }) => {
        const logoUrl = getTeamLogo(abbr, league);
        if (roomHash) {
          teamData.push({ name: team, abbreviation: abbr, league, logoUrl, roomHash });
        } else {
          teamData.push({ name: team, abbreviation: abbr, league, logoUrl, roomHash: "0x0000000000000000000000000000000000000000" });
        }
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
