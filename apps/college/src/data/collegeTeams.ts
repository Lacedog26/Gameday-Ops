import type { TeamBrand } from '@gamedayops/core'

// ---------------------------------------------------------------------------
// GameDayOps College — team universe (COMPLETE current FBS + FCS).
//
// Every current FBS (136) and FCS (128) program for the 2025–2026 season, with
// data-driven conference + subdivision so realignment is a data change, not a
// code change. Only public identity facts are encoded (school, nickname,
// conference, team colors). NO trademarked logo artwork is bundled — every team
// carries an EMPTY logo slot; the board shows a neutral monogram until an
// authorized customer uploads the real mark (Admin → Team Branding). Colors are
// editable per team. Conferences are free-form strings (never a fixed union).
// ---------------------------------------------------------------------------

const c = (
  id: string,
  school: string,
  nickname: string,
  abbr: string,
  subdivision: 'FBS' | 'FCS',
  conference: string,
  primary: string,
  secondary: string,
  accent: string,
  opts: { location?: string; independent?: boolean; text?: string } = {},
): TeamBrand => ({
  id,
  name: `${school} ${nickname}`,
  location: opts.location ?? school,
  nickname,
  shortName: school,
  abbr,
  product: 'COLLEGE_FOOTBALL',
  conference,
  division: '',
  subdivision,
  school,
  independent: opts.independent,
  colors: { primary, secondary, accent, text: opts.text ?? '#FFFFFF' },
  assets: { primaryLogoUrl: '', secondaryLogoUrl: '', wordmarkUrl: '', backgroundAssetUrl: '' },
})

export const COLLEGE_TEAMS: TeamBrand[] = [
  // ===== FBS =====

  // --- SEC (16) ---
  c('TEX', 'Texas', 'Longhorns', 'TEX', 'FBS', 'SEC', '#BF5700', '#FFFFFF', '#333F48', { location: 'Austin, TX' }),
  c('ALA', 'Alabama', 'Crimson Tide', 'ALA', 'FBS', 'SEC', '#9E1B32', '#FFFFFF', '#828A8F', { location: 'Tuscaloosa, AL' }),
  c('ARK', 'Arkansas', 'Razorbacks', 'ARK', 'FBS', 'SEC', '#9D2235', '#FFFFFF', '#000000', { location: 'Fayetteville, AR' }),
  c('AUB', 'Auburn', 'Tigers', 'AUB', 'FBS', 'SEC', '#0C2340', '#E87722', '#FFFFFF', { location: 'Auburn, AL' }),
  c('FLA', 'Florida', 'Gators', 'FLA', 'FBS', 'SEC', '#0021A5', '#FA4616', '#FFFFFF', { location: 'Gainesville, FL' }),
  c('UGA', 'Georgia', 'Bulldogs', 'UGA', 'FBS', 'SEC', '#BA0C2F', '#000000', '#FFFFFF', { location: 'Athens, GA' }),
  c('UK', 'Kentucky', 'Wildcats', 'UK', 'FBS', 'SEC', '#0033A0', '#FFFFFF', '#000000', { location: 'Lexington, KY' }),
  c('LSU', 'LSU', 'Tigers', 'LSU', 'FBS', 'SEC', '#461D7C', '#FDD023', '#FFFFFF', { location: 'Baton Rouge, LA' }),
  c('MSST', 'Mississippi State', 'Bulldogs', 'MSST', 'FBS', 'SEC', '#660000', '#FFFFFF', '#000000', { location: 'Starkville, MS' }),
  c('MIZ', 'Missouri', 'Tigers', 'MIZ', 'FBS', 'SEC', '#F1B82D', '#000000', '#FFFFFF', { location: 'Columbia, MO' }),
  c('OU', 'Oklahoma', 'Sooners', 'OU', 'FBS', 'SEC', '#841617', '#FDF9D8', '#FFFFFF', { location: 'Norman, OK' }),
  c('MISS', 'Ole Miss', 'Rebels', 'MISS', 'FBS', 'SEC', '#14213D', '#CE1126', '#FFFFFF', { location: 'Oxford, MS' }),
  c('SCAR', 'South Carolina', 'Gamecocks', 'SCAR', 'FBS', 'SEC', '#73000A', '#000000', '#FFFFFF', { location: 'Columbia, SC' }),
  c('TENN', 'Tennessee', 'Volunteers', 'TENN', 'FBS', 'SEC', '#FF8200', '#FFFFFF', '#58595B', { location: 'Knoxville, TN' }),
  c('TAMU', 'Texas A&M', 'Aggies', 'TAMU', 'FBS', 'SEC', '#500000', '#FFFFFF', '#000000', { location: 'College Station, TX' }),
  c('VAN', 'Vanderbilt', 'Commodores', 'VAN', 'FBS', 'SEC', '#866D4B', '#000000', '#FFFFFF', { location: 'Nashville, TN' }),

  // --- Big Ten (18) ---
  c('ILL', 'Illinois', 'Fighting Illini', 'ILL', 'FBS', 'Big Ten', '#13294B', '#E84A27', '#FFFFFF', { location: 'Champaign, IL' }),
  c('IND', 'Indiana', 'Hoosiers', 'IND', 'FBS', 'Big Ten', '#990000', '#FFFFFF', '#000000', { location: 'Bloomington, IN' }),
  c('IOWA', 'Iowa', 'Hawkeyes', 'IOWA', 'FBS', 'Big Ten', '#000000', '#FFCD00', '#FFFFFF', { location: 'Iowa City, IA' }),
  c('MD', 'Maryland', 'Terrapins', 'MD', 'FBS', 'Big Ten', '#E03A3E', '#FFD520', '#000000', { location: 'College Park, MD' }),
  c('MICH', 'Michigan', 'Wolverines', 'MICH', 'FBS', 'Big Ten', '#00274C', '#FFCB05', '#FFFFFF', { location: 'Ann Arbor, MI' }),
  c('MSU', 'Michigan State', 'Spartans', 'MSU', 'FBS', 'Big Ten', '#18453B', '#FFFFFF', '#000000', { location: 'East Lansing, MI' }),
  c('MINN', 'Minnesota', 'Golden Gophers', 'MINN', 'FBS', 'Big Ten', '#7A0019', '#FFCC33', '#FFFFFF', { location: 'Minneapolis, MN' }),
  c('NEB', 'Nebraska', 'Cornhuskers', 'NEB', 'FBS', 'Big Ten', '#E41C38', '#FFFFFF', '#000000', { location: 'Lincoln, NE' }),
  c('NW', 'Northwestern', 'Wildcats', 'NW', 'FBS', 'Big Ten', '#4E2A84', '#FFFFFF', '#000000', { location: 'Evanston, IL' }),
  c('OSU', 'Ohio State', 'Buckeyes', 'OSU', 'FBS', 'Big Ten', '#BB0000', '#666666', '#FFFFFF', { location: 'Columbus, OH' }),
  c('ORE', 'Oregon', 'Ducks', 'ORE', 'FBS', 'Big Ten', '#154733', '#FEE123', '#FFFFFF', { location: 'Eugene, OR' }),
  c('PSU', 'Penn State', 'Nittany Lions', 'PSU', 'FBS', 'Big Ten', '#041E42', '#FFFFFF', '#96BEE6', { location: 'University Park, PA' }),
  c('PUR', 'Purdue', 'Boilermakers', 'PUR', 'FBS', 'Big Ten', '#CEB888', '#000000', '#FFFFFF', { location: 'West Lafayette, IN' }),
  c('RUT', 'Rutgers', 'Scarlet Knights', 'RUT', 'FBS', 'Big Ten', '#CC0033', '#000000', '#FFFFFF', { location: 'Piscataway, NJ' }),
  c('UCLA', 'UCLA', 'Bruins', 'UCLA', 'FBS', 'Big Ten', '#2D68C4', '#F2A900', '#FFFFFF', { location: 'Los Angeles, CA' }),
  c('USC', 'USC', 'Trojans', 'USC', 'FBS', 'Big Ten', '#990000', '#FFC72C', '#FFFFFF', { location: 'Los Angeles, CA' }),
  c('WASH', 'Washington', 'Huskies', 'WASH', 'FBS', 'Big Ten', '#4B2E83', '#B7A57A', '#FFFFFF', { location: 'Seattle, WA' }),
  c('WIS', 'Wisconsin', 'Badgers', 'WIS', 'FBS', 'Big Ten', '#C5050C', '#FFFFFF', '#000000', { location: 'Madison, WI' }),

  // --- Big 12 (16) ---
  c('ARIZ', 'Arizona', 'Wildcats', 'ARIZ', 'FBS', 'Big 12', '#0C234B', '#AB0520', '#FFFFFF', { location: 'Tucson, AZ' }),
  c('ASU', 'Arizona State', 'Sun Devils', 'ASU', 'FBS', 'Big 12', '#8C1D40', '#FFC627', '#000000', { location: 'Tempe, AZ' }),
  c('BAY', 'Baylor', 'Bears', 'BAY', 'FBS', 'Big 12', '#003015', '#FFB81C', '#FFFFFF', { location: 'Waco, TX' }),
  c('BYU', 'BYU', 'Cougars', 'BYU', 'FBS', 'Big 12', '#002E5D', '#FFFFFF', '#C5C5C5', { location: 'Provo, UT' }),
  c('CIN', 'Cincinnati', 'Bearcats', 'CIN', 'FBS', 'Big 12', '#000000', '#E00122', '#FFFFFF', { location: 'Cincinnati, OH' }),
  c('COLO', 'Colorado', 'Buffaloes', 'COLO', 'FBS', 'Big 12', '#CFB87C', '#000000', '#565A5C', { location: 'Boulder, CO' }),
  c('HOU', 'Houston', 'Cougars', 'HOU', 'FBS', 'Big 12', '#C8102E', '#FFFFFF', '#000000', { location: 'Houston, TX' }),
  c('ISU', 'Iowa State', 'Cyclones', 'ISU', 'FBS', 'Big 12', '#C8102E', '#F1BE48', '#FFFFFF', { location: 'Ames, IA' }),
  c('KU', 'Kansas', 'Jayhawks', 'KU', 'FBS', 'Big 12', '#0051BA', '#E8000D', '#FFFFFF', { location: 'Lawrence, KS' }),
  c('KSU', 'Kansas State', 'Wildcats', 'KSU', 'FBS', 'Big 12', '#512888', '#FFFFFF', '#000000', { location: 'Manhattan, KS' }),
  c('OKST', 'Oklahoma State', 'Cowboys', 'OKST', 'FBS', 'Big 12', '#FF7300', '#000000', '#FFFFFF', { location: 'Stillwater, OK' }),
  c('TCU', 'TCU', 'Horned Frogs', 'TCU', 'FBS', 'Big 12', '#4D1979', '#FFFFFF', '#A3A9AC', { location: 'Fort Worth, TX' }),
  c('TTU', 'Texas Tech', 'Red Raiders', 'TTU', 'FBS', 'Big 12', '#CC0000', '#000000', '#FFFFFF', { location: 'Lubbock, TX' }),
  c('UCF', 'UCF', 'Knights', 'UCF', 'FBS', 'Big 12', '#000000', '#BA9B37', '#FFFFFF', { location: 'Orlando, FL' }),
  c('UTAH', 'Utah', 'Utes', 'UTAH', 'FBS', 'Big 12', '#CC0000', '#FFFFFF', '#000000', { location: 'Salt Lake City, UT' }),
  c('WVU', 'West Virginia', 'Mountaineers', 'WVU', 'FBS', 'Big 12', '#002855', '#EAAA00', '#FFFFFF', { location: 'Morgantown, WV' }),

  // --- ACC (17) ---
  c('BC', 'Boston College', 'Eagles', 'BC', 'FBS', 'ACC', '#98002E', '#BC9B6A', '#FFFFFF', { location: 'Chestnut Hill, MA' }),
  c('CAL', 'California', 'Golden Bears', 'CAL', 'FBS', 'ACC', '#003262', '#FDB515', '#FFFFFF', { location: 'Berkeley, CA' }),
  c('CLEM', 'Clemson', 'Tigers', 'CLEM', 'FBS', 'ACC', '#F56600', '#522D80', '#FFFFFF', { location: 'Clemson, SC' }),
  c('DUKE', 'Duke', 'Blue Devils', 'DUKE', 'FBS', 'ACC', '#003087', '#FFFFFF', '#000000', { location: 'Durham, NC' }),
  c('FSU', 'Florida State', 'Seminoles', 'FSU', 'FBS', 'ACC', '#782F40', '#CEB888', '#000000', { location: 'Tallahassee, FL' }),
  c('GT', 'Georgia Tech', 'Yellow Jackets', 'GT', 'FBS', 'ACC', '#B3A369', '#003057', '#FFFFFF', { location: 'Atlanta, GA' }),
  c('LOU', 'Louisville', 'Cardinals', 'LOU', 'FBS', 'ACC', '#AD0000', '#000000', '#FFFFFF', { location: 'Louisville, KY' }),
  c('MIAF', 'Miami', 'Hurricanes', 'MIAF', 'FBS', 'ACC', '#F47321', '#005030', '#FFFFFF', { location: 'Coral Gables, FL' }),
  c('NCST', 'NC State', 'Wolfpack', 'NCST', 'FBS', 'ACC', '#CC0000', '#000000', '#FFFFFF', { location: 'Raleigh, NC' }),
  c('UNC', 'North Carolina', 'Tar Heels', 'UNC', 'FBS', 'ACC', '#7BAFD4', '#FFFFFF', '#13294B', { location: 'Chapel Hill, NC' }),
  c('PITT', 'Pittsburgh', 'Panthers', 'PITT', 'FBS', 'ACC', '#003594', '#FFB81C', '#FFFFFF', { location: 'Pittsburgh, PA' }),
  c('SMU', 'SMU', 'Mustangs', 'SMU', 'FBS', 'ACC', '#0033A0', '#CC0035', '#FFFFFF', { location: 'University Park, TX' }),
  c('STAN', 'Stanford', 'Cardinal', 'STAN', 'FBS', 'ACC', '#8C1515', '#FFFFFF', '#000000', { location: 'Stanford, CA' }),
  c('SYR', 'Syracuse', 'Orange', 'SYR', 'FBS', 'ACC', '#F76900', '#000E54', '#FFFFFF', { location: 'Syracuse, NY' }),
  c('UVA', 'Virginia', 'Cavaliers', 'UVA', 'FBS', 'ACC', '#232D4B', '#F84C1E', '#FFFFFF', { location: 'Charlottesville, VA' }),
  c('VT', 'Virginia Tech', 'Hokies', 'VT', 'FBS', 'ACC', '#630031', '#CF4420', '#FFFFFF', { location: 'Blacksburg, VA' }),
  c('WAKE', 'Wake Forest', 'Demon Deacons', 'WAKE', 'FBS', 'ACC', '#9E7E38', '#000000', '#FFFFFF', { location: 'Winston-Salem, NC' }),

  // --- American (14) ---
  c('ARMY', 'Army', 'Black Knights', 'ARMY', 'FBS', 'American', '#000000', '#D4BF91', '#FFFFFF', { location: 'West Point, NY' }),
  c('CHAR', 'Charlotte', '49ers', 'CHAR', 'FBS', 'American', '#046A38', '#B9975B', '#FFFFFF', { location: 'Charlotte, NC' }),
  c('ECU', 'East Carolina', 'Pirates', 'ECU', 'FBS', 'American', '#592A8A', '#FDC82F', '#FFFFFF', { location: 'Greenville, NC' }),
  c('FAU', 'Florida Atlantic', 'Owls', 'FAU', 'FBS', 'American', '#003366', '#CC0000', '#FFFFFF', { location: 'Boca Raton, FL' }),
  c('MEM', 'Memphis', 'Tigers', 'MEM', 'FBS', 'American', '#003087', '#898D8D', '#FFFFFF', { location: 'Memphis, TN' }),
  c('NAVY', 'Navy', 'Midshipmen', 'NAVY', 'FBS', 'American', '#00205B', '#C5B783', '#FFFFFF', { location: 'Annapolis, MD' }),
  c('UNT', 'North Texas', 'Mean Green', 'UNT', 'FBS', 'American', '#00853E', '#000000', '#FFFFFF', { location: 'Denton, TX' }),
  c('RICE', 'Rice', 'Owls', 'RICE', 'FBS', 'American', '#00205B', '#C1C6C8', '#FFFFFF', { location: 'Houston, TX' }),
  c('USF', 'South Florida', 'Bulls', 'USF', 'FBS', 'American', '#006747', '#CFC493', '#FFFFFF', { location: 'Tampa, FL' }),
  c('TEM', 'Temple', 'Owls', 'TEM', 'FBS', 'American', '#9D2235', '#FFFFFF', '#000000', { location: 'Philadelphia, PA' }),
  c('TUL', 'Tulane', 'Green Wave', 'TUL', 'FBS', 'American', '#006747', '#418FDE', '#FFFFFF', { location: 'New Orleans, LA' }),
  c('TLSA', 'Tulsa', 'Golden Hurricane', 'TLSA', 'FBS', 'American', '#002D72', '#C8102E', '#FFC72C', { location: 'Tulsa, OK' }),
  c('UAB', 'UAB', 'Blazers', 'UAB', 'FBS', 'American', '#1E6B52', '#F4C300', '#000000', { location: 'Birmingham, AL' }),
  c('UTSA', 'UTSA', 'Roadrunners', 'UTSA', 'FBS', 'American', '#0C2340', '#F15A22', '#FFFFFF', { location: 'San Antonio, TX' }),

  // --- Mountain West (12) ---
  c('AF', 'Air Force', 'Falcons', 'AF', 'FBS', 'Mountain West', '#003087', '#8A8D8F', '#FFFFFF', { location: 'Colorado Springs, CO' }),
  c('BSU', 'Boise State', 'Broncos', 'BSU', 'FBS', 'Mountain West', '#0033A0', '#D64309', '#FFFFFF', { location: 'Boise, ID' }),
  c('CSU', 'Colorado State', 'Rams', 'CSU', 'FBS', 'Mountain West', '#1E4D2B', '#C8C372', '#FFFFFF', { location: 'Fort Collins, CO' }),
  c('FRES', 'Fresno State', 'Bulldogs', 'FRES', 'FBS', 'Mountain West', '#DB0032', '#002E6D', '#FFFFFF', { location: 'Fresno, CA' }),
  c('HAW', 'Hawaii', 'Rainbow Warriors', 'HAW', 'FBS', 'Mountain West', '#024731', '#FFFFFF', '#000000', { location: 'Honolulu, HI' }),
  c('NEV', 'Nevada', 'Wolf Pack', 'NEV', 'FBS', 'Mountain West', '#003366', '#807F84', '#FFFFFF', { location: 'Reno, NV' }),
  c('UNM', 'New Mexico', 'Lobos', 'UNM', 'FBS', 'Mountain West', '#BA0C2F', '#63666A', '#FFFFFF', { location: 'Albuquerque, NM' }),
  c('SDSU', 'San Diego State', 'Aztecs', 'SDSU', 'FBS', 'Mountain West', '#A6192E', '#000000', '#A7A8AA', { location: 'San Diego, CA' }),
  c('SJSU', 'San Jose State', 'Spartans', 'SJSU', 'FBS', 'Mountain West', '#0055A2', '#E5A823', '#FFFFFF', { location: 'San Jose, CA' }),
  c('UNLV', 'UNLV', 'Rebels', 'UNLV', 'FBS', 'Mountain West', '#CF0A2C', '#000000', '#666666', { location: 'Las Vegas, NV' }),
  c('USU', 'Utah State', 'Aggies', 'USU', 'FBS', 'Mountain West', '#00263A', '#8A8D8F', '#FFFFFF', { location: 'Logan, UT' }),
  c('WYO', 'Wyoming', 'Cowboys', 'WYO', 'FBS', 'Mountain West', '#492F24', '#FFC425', '#FFFFFF', { location: 'Laramie, WY' }),

  // --- Sun Belt (14) ---
  c('APP', 'Appalachian State', 'Mountaineers', 'APP', 'FBS', 'Sun Belt', '#000000', '#FFCC00', '#FFFFFF', { location: 'Boone, NC' }),
  c('ARST', 'Arkansas State', 'Red Wolves', 'ARST', 'FBS', 'Sun Belt', '#CC092F', '#000000', '#FFFFFF', { location: 'Jonesboro, AR' }),
  c('CCU', 'Coastal Carolina', 'Chanticleers', 'CCU', 'FBS', 'Sun Belt', '#006F71', '#A27752', '#000000', { location: 'Conway, SC' }),
  c('GASO', 'Georgia Southern', 'Eagles', 'GASO', 'FBS', 'Sun Belt', '#011E41', '#87714D', '#FFFFFF', { location: 'Statesboro, GA' }),
  c('GAST', 'Georgia State', 'Panthers', 'GAST', 'FBS', 'Sun Belt', '#0039A6', '#C60C30', '#FFFFFF', { location: 'Atlanta, GA' }),
  c('JMU', 'James Madison', 'Dukes', 'JMU', 'FBS', 'Sun Belt', '#450084', '#CBB677', '#FFFFFF', { location: 'Harrisonburg, VA' }),
  c('ULL', 'Louisiana', "Ragin' Cajuns", 'ULL', 'FBS', 'Sun Belt', '#CE181E', '#000000', '#FFFFFF', { location: 'Lafayette, LA' }),
  c('ULM', 'Louisiana-Monroe', 'Warhawks', 'ULM', 'FBS', 'Sun Belt', '#660000', '#FFB81C', '#FFFFFF', { location: 'Monroe, LA' }),
  c('MRSH', 'Marshall', 'Thundering Herd', 'MRSH', 'FBS', 'Sun Belt', '#00B140', '#000000', '#FFFFFF', { location: 'Huntington, WV' }),
  c('ODU', 'Old Dominion', 'Monarchs', 'ODU', 'FBS', 'Sun Belt', '#003057', '#7C878E', '#FFFFFF', { location: 'Norfolk, VA' }),
  c('USA', 'South Alabama', 'Jaguars', 'USA', 'FBS', 'Sun Belt', '#00205B', '#BF0D3E', '#FFFFFF', { location: 'Mobile, AL' }),
  c('USM', 'Southern Miss', 'Golden Eagles', 'USM', 'FBS', 'Sun Belt', '#000000', '#FFAB00', '#FFFFFF', { location: 'Hattiesburg, MS' }),
  c('TXST', 'Texas State', 'Bobcats', 'TXST', 'FBS', 'Sun Belt', '#501214', '#6A7259', '#FFFFFF', { location: 'San Marcos, TX' }),
  c('TROY', 'Troy', 'Trojans', 'TROY', 'FBS', 'Sun Belt', '#8A2432', '#A2AAAD', '#000000', { location: 'Troy, AL' }),

  // --- MAC (13) ---
  c('AKR', 'Akron', 'Zips', 'AKR', 'FBS', 'MAC', '#00285E', '#84754E', '#FFFFFF', { location: 'Akron, OH' }),
  c('BALL', 'Ball State', 'Cardinals', 'BALL', 'FBS', 'MAC', '#BA0C2F', '#FFFFFF', '#000000', { location: 'Muncie, IN' }),
  c('BGSU', 'Bowling Green', 'Falcons', 'BGSU', 'FBS', 'MAC', '#FE5000', '#4F2C1D', '#FFFFFF', { location: 'Bowling Green, OH' }),
  c('BUFF', 'Buffalo', 'Bulls', 'BUFF', 'FBS', 'MAC', '#005BBB', '#000000', '#FFFFFF', { location: 'Buffalo, NY' }),
  c('CMU', 'Central Michigan', 'Chippewas', 'CMU', 'FBS', 'MAC', '#6A0032', '#FFC82E', '#FFFFFF', { location: 'Mount Pleasant, MI' }),
  c('EMU', 'Eastern Michigan', 'Eagles', 'EMU', 'FBS', 'MAC', '#046A38', '#FFFFFF', '#000000', { location: 'Ypsilanti, MI' }),
  c('KENT', 'Kent State', 'Golden Flashes', 'KENT', 'FBS', 'MAC', '#002664', '#EAAB00', '#FFFFFF', { location: 'Kent, OH' }),
  c('MIOH', 'Miami (OH)', 'RedHawks', 'MIOH', 'FBS', 'MAC', '#B61E2E', '#000000', '#FFFFFF', { location: 'Oxford, OH' }),
  c('NIU', 'Northern Illinois', 'Huskies', 'NIU', 'FBS', 'MAC', '#CC0000', '#000000', '#FFFFFF', { location: 'DeKalb, IL' }),
  c('OHIO', 'Ohio', 'Bobcats', 'OHIO', 'FBS', 'MAC', '#00694E', '#FFFFFF', '#000000', { location: 'Athens, OH' }),
  c('TOL', 'Toledo', 'Rockets', 'TOL', 'FBS', 'MAC', '#15397F', '#FFCB05', '#FFFFFF', { location: 'Toledo, OH' }),
  c('UMAS', 'UMass', 'Minutemen', 'UMAS', 'FBS', 'MAC', '#881C1C', '#FFFFFF', '#000000', { location: 'Amherst, MA' }),
  c('WMU', 'Western Michigan', 'Broncos', 'WMU', 'FBS', 'MAC', '#532E1F', '#B39B6E', '#FFFFFF', { location: 'Kalamazoo, MI' }),

  // --- Conference USA (12) ---
  c('DEL', 'Delaware', 'Blue Hens', 'DEL', 'FBS', 'Conference USA', '#00539F', '#FFD200', '#FFFFFF', { location: 'Newark, DE' }),
  c('FIU', 'Florida International', 'Panthers', 'FIU', 'FBS', 'Conference USA', '#081E3F', '#B6862C', '#FFFFFF', { location: 'Miami, FL' }),
  c('JVST', 'Jacksonville State', 'Gamecocks', 'JVST', 'FBS', 'Conference USA', '#CC0000', '#000000', '#FFFFFF', { location: 'Jacksonville, AL' }),
  c('KENN', 'Kennesaw State', 'Owls', 'KENN', 'FBS', 'Conference USA', '#000000', '#FDB913', '#FFFFFF', { location: 'Kennesaw, GA' }),
  c('LIB', 'Liberty', 'Flames', 'LIB', 'FBS', 'Conference USA', '#002D62', '#A6192E', '#FFFFFF', { location: 'Lynchburg, VA' }),
  c('LT', 'Louisiana Tech', 'Bulldogs', 'LT', 'FBS', 'Conference USA', '#002F8B', '#E31B23', '#FFFFFF', { location: 'Ruston, LA' }),
  c('MTSU', 'Middle Tennessee', 'Blue Raiders', 'MTSU', 'FBS', 'Conference USA', '#0066CC', '#000000', '#FFFFFF', { location: 'Murfreesboro, TN' }),
  c('MOST', 'Missouri State', 'Bears', 'MOST', 'FBS', 'Conference USA', '#5E0009', '#FFFFFF', '#000000', { location: 'Springfield, MO' }),
  c('NMSU', 'New Mexico State', 'Aggies', 'NMSU', 'FBS', 'Conference USA', '#8C0B42', '#FFFFFF', '#000000', { location: 'Las Cruces, NM' }),
  c('SHSU', 'Sam Houston', 'Bearkats', 'SHSU', 'FBS', 'Conference USA', '#F56600', '#FFFFFF', '#000000', { location: 'Huntsville, TX' }),
  c('UTEP', 'UTEP', 'Miners', 'UTEP', 'FBS', 'Conference USA', '#041E42', '#FF8200', '#C4C4C4', { location: 'El Paso, TX' }),
  c('WKU', 'Western Kentucky', 'Hilltoppers', 'WKU', 'FBS', 'Conference USA', '#B01E24', '#000000', '#FFFFFF', { location: 'Bowling Green, KY' }),

  // --- Pac-12 (2) ---
  c('ORST', 'Oregon State', 'Beavers', 'ORST', 'FBS', 'Pac-12', '#DC4405', '#000000', '#FFFFFF', { location: 'Corvallis, OR' }),
  c('WSU', 'Washington State', 'Cougars', 'WSU', 'FBS', 'Pac-12', '#981E32', '#5E6A71', '#FFFFFF', { location: 'Pullman, WA' }),

  // --- FBS Independents (2) ---
  c('ND', 'Notre Dame', 'Fighting Irish', 'ND', 'FBS', 'FBS Independent', '#0C2340', '#C99700', '#FFFFFF', { location: 'Notre Dame, IN', independent: true }),
  c('CONN', 'UConn', 'Huskies', 'CONN', 'FBS', 'FBS Independent', '#000E2F', '#FFFFFF', '#7C878E', { location: 'Storrs, CT', independent: true }),

  // ===== FCS =====

  // --- Big Sky (12) ---
  c('CP', 'Cal Poly', 'Mustangs', 'CP', 'FCS', 'Big Sky', '#154734', '#BD8B13', '#FFFFFF', { location: 'San Luis Obispo, CA' }),
  c('EWU', 'Eastern Washington', 'Eagles', 'EWU', 'FCS', 'Big Sky', '#A10022', '#000000', '#FFFFFF', { location: 'Cheney, WA' }),
  c('IDHO', 'Idaho', 'Vandals', 'IDHO', 'FCS', 'Big Sky', '#F1B300', '#000000', '#FFFFFF', { location: 'Moscow, ID' }),
  c('IDST', 'Idaho State', 'Bengals', 'IDST', 'FCS', 'Big Sky', '#F47D30', '#000000', '#FFFFFF', { location: 'Pocatello, ID' }),
  c('MONT', 'Montana', 'Grizzlies', 'MONT', 'FCS', 'Big Sky', '#7C2529', '#A2AAAD', '#000000', { location: 'Missoula, MT' }),
  c('MTST', 'Montana State', 'Bobcats', 'MTST', 'FCS', 'Big Sky', '#00205B', '#FFB81C', '#FFFFFF', { location: 'Bozeman, MT' }),
  c('NAU', 'Northern Arizona', 'Lumberjacks', 'NAU', 'FCS', 'Big Sky', '#003466', '#FFC72C', '#FFFFFF', { location: 'Flagstaff, AZ' }),
  c('UNCO', 'Northern Colorado', 'Bears', 'UNCO', 'FCS', 'Big Sky', '#013C65', '#F6B000', '#FFFFFF', { location: 'Greeley, CO' }),
  c('PRST', 'Portland State', 'Vikings', 'PRST', 'FCS', 'Big Sky', '#154734', '#FFFFFF', '#000000', { location: 'Portland, OR' }),
  c('SAC', 'Sacramento State', 'Hornets', 'SAC', 'FCS', 'Big Sky', '#043927', '#C4B581', '#FFFFFF', { location: 'Sacramento, CA' }),
  c('UCD', 'UC Davis', 'Aggies', 'UCD', 'FCS', 'Big Sky', '#002855', '#B3A369', '#FFFFFF', { location: 'Davis, CA' }),
  c('WEB', 'Weber State', 'Wildcats', 'WEB', 'FCS', 'Big Sky', '#492365', '#FFFFFF', '#000000', { location: 'Ogden, UT' }),

  // --- CAA (14) ---
  c('ALBY', 'Albany', 'Great Danes', 'ALBY', 'FCS', 'CAA', '#46166B', '#EEB211', '#FFFFFF', { location: 'Albany, NY' }),
  c('BRY', 'Bryant', 'Bulldogs', 'BRY', 'FCS', 'CAA', '#000000', '#B3995D', '#FFFFFF', { location: 'Smithfield, RI' }),
  c('CAMP', 'Campbell', 'Fighting Camels', 'CAMP', 'FCS', 'CAA', '#F47920', '#000000', '#FFFFFF', { location: 'Buies Creek, NC' }),
  c('ELON', 'Elon', 'Phoenix', 'ELON', 'FCS', 'CAA', '#73000A', '#B59A57', '#FFFFFF', { location: 'Elon, NC' }),
  c('HAMP', 'Hampton', 'Pirates', 'HAMP', 'FCS', 'CAA', '#003087', '#FFFFFF', '#000000', { location: 'Hampton, VA' }),
  c('MAIN', 'Maine', 'Black Bears', 'MAIN', 'FCS', 'CAA', '#003263', '#A6CEEC', '#FFFFFF', { location: 'Orono, ME' }),
  c('MONM', 'Monmouth', 'Hawks', 'MONM', 'FCS', 'CAA', '#14345B', '#8C8985', '#FFFFFF', { location: 'West Long Branch, NJ' }),
  c('UNH', 'New Hampshire', 'Wildcats', 'UNH', 'FCS', 'CAA', '#003591', '#FFFFFF', '#000000', { location: 'Durham, NH' }),
  c('NCAT', 'North Carolina A&T', 'Aggies', 'NCAT', 'FCS', 'CAA', '#004684', '#F4C430', '#FFFFFF', { location: 'Greensboro, NC' }),
  c('URI', 'Rhode Island', 'Rams', 'URI', 'FCS', 'CAA', '#002147', '#75B2DD', '#FFFFFF', { location: 'Kingston, RI' }),
  c('STBK', 'Stony Brook', 'Seawolves', 'STBK', 'FCS', 'CAA', '#990000', '#16233F', '#FFFFFF', { location: 'Stony Brook, NY' }),
  c('TOW', 'Towson', 'Tigers', 'TOW', 'FCS', 'CAA', '#000000', '#FFB81C', '#FFFFFF', { location: 'Towson, MD' }),
  c('NOVA', 'Villanova', 'Wildcats', 'NOVA', 'FCS', 'CAA', '#00205B', '#13B5EA', '#FFFFFF', { location: 'Villanova, PA' }),
  c('WM', 'William & Mary', 'Tribe', 'WM', 'FCS', 'CAA', '#115740', '#B9975B', '#FFD700', { location: 'Williamsburg, VA' }),

  // --- Missouri Valley Football Conference (10) ---
  c('ILST', 'Illinois State', 'Redbirds', 'ILST', 'FCS', 'Missouri Valley Football Conference', '#CE1126', '#000000', '#FFFFFF', { location: 'Normal, IL' }),
  c('INST', 'Indiana State', 'Sycamores', 'INST', 'FCS', 'Missouri Valley Football Conference', '#0F4DA8', '#FFFFFF', '#000000', { location: 'Terre Haute, IN' }),
  c('MURR', 'Murray State', 'Racers', 'MURR', 'FCS', 'Missouri Valley Football Conference', '#002144', '#F8B300', '#FFFFFF', { location: 'Murray, KY' }),
  c('UND', 'North Dakota', 'Fighting Hawks', 'UND', 'FCS', 'Missouri Valley Football Conference', '#009A44', '#000000', '#FFFFFF', { location: 'Grand Forks, ND' }),
  c('NDSU', 'North Dakota State', 'Bison', 'NDSU', 'FCS', 'Missouri Valley Football Conference', '#005643', '#FFC82E', '#FFFFFF', { location: 'Fargo, ND' }),
  c('UNI', 'Northern Iowa', 'Panthers', 'UNI', 'FCS', 'Missouri Valley Football Conference', '#4B116F', '#FFCC00', '#FFFFFF', { location: 'Cedar Falls, IA' }),
  c('SDAK', 'South Dakota', 'Coyotes', 'SDAK', 'FCS', 'Missouri Valley Football Conference', '#C8102E', '#000000', '#FFFFFF', { location: 'Vermillion, SD' }),
  c('SDST', 'South Dakota State', 'Jackrabbits', 'SDST', 'FCS', 'Missouri Valley Football Conference', '#0033A0', '#FFD100', '#FFFFFF', { location: 'Brookings, SD' }),
  c('SIU', 'Southern Illinois', 'Salukis', 'SIU', 'FCS', 'Missouri Valley Football Conference', '#720000', '#000000', '#FFFFFF', { location: 'Carbondale, IL' }),
  c('YSU', 'Youngstown State', 'Penguins', 'YSU', 'FCS', 'Missouri Valley Football Conference', '#C8102E', '#000000', '#FFFFFF', { location: 'Youngstown, OH' }),

  // --- Southern (SoCon) (9) ---
  c('CHAT', 'Chattanooga', 'Mocs', 'CHAT', 'FCS', 'Southern', '#00386B', '#E0AA0F', '#FFFFFF', { location: 'Chattanooga, TN' }),
  c('CIT', 'The Citadel', 'Bulldogs', 'CIT', 'FCS', 'Southern', '#1D4F91', '#FFFFFF', '#C6C6C6', { location: 'Charleston, SC' }),
  c('ETSU', 'East Tennessee State', 'Buccaneers', 'ETSU', 'FCS', 'Southern', '#041E42', '#FFC72C', '#FFFFFF', { location: 'Johnson City, TN' }),
  c('FUR', 'Furman', 'Paladins', 'FUR', 'FCS', 'Southern', '#582C83', '#FFFFFF', '#B08D57', { location: 'Greenville, SC' }),
  c('MER', 'Mercer', 'Bears', 'MER', 'FCS', 'Southern', '#F76900', '#000000', '#FFFFFF', { location: 'Macon, GA' }),
  c('SAM', 'Samford', 'Bulldogs', 'SAM', 'FCS', 'Southern', '#005DAA', '#DA2128', '#FFFFFF', { location: 'Birmingham, AL' }),
  c('VMI', 'VMI', 'Keydets', 'VMI', 'FCS', 'Southern', '#C8102E', '#FDD023', '#FFFFFF', { location: 'Lexington, VA' }),
  c('WCU', 'Western Carolina', 'Catamounts', 'WCU', 'FCS', 'Southern', '#592C82', '#B8A165', '#FFFFFF', { location: 'Cullowhee, NC' }),
  c('WOF', 'Wofford', 'Terriers', 'WOF', 'FCS', 'Southern', '#886B25', '#000000', '#FFFFFF', { location: 'Spartanburg, SC' }),

  // --- Southland (9) ---
  c('ETAM', 'East Texas A&M', 'Lions', 'ETAM', 'FCS', 'Southland', '#003C71', '#FFFFFF', '#000000', { location: 'Commerce, TX' }),
  c('HCU', 'Houston Christian', 'Huskies', 'HCU', 'FCS', 'Southland', '#003DA5', '#FF7F30', '#FFFFFF', { location: 'Houston, TX' }),
  c('UIW', 'Incarnate Word', 'Cardinals', 'UIW', 'FCS', 'Southland', '#CC0000', '#000000', '#FFFFFF', { location: 'San Antonio, TX' }),
  c('LAM', 'Lamar', 'Cardinals', 'LAM', 'FCS', 'Southland', '#CC0000', '#FFFFFF', '#000000', { location: 'Beaumont, TX' }),
  c('MCN', 'McNeese', 'Cowboys', 'MCN', 'FCS', 'Southland', '#00539B', '#F2A900', '#FFFFFF', { location: 'Lake Charles, LA' }),
  c('NICH', 'Nicholls', 'Colonels', 'NICH', 'FCS', 'Southland', '#A6093D', '#808285', '#FFFFFF', { location: 'Thibodaux, LA' }),
  c('NWST', 'Northwestern State', 'Demons', 'NWST', 'FCS', 'Southland', '#582C83', '#FFFFFF', '#000000', { location: 'Natchitoches, LA' }),
  c('SELA', 'Southeastern Louisiana', 'Lions', 'SELA', 'FCS', 'Southland', '#006241', '#B0966B', '#FFFFFF', { location: 'Hammond, LA' }),
  c('UTRGV', 'UT Rio Grande Valley', 'Vaqueros', 'UTRGV', 'FCS', 'Southland', '#FF5C39', '#00694E', '#FFFFFF', { location: 'Edinburg, TX' }),

  // --- Big South-OVC (9) ---
  c('CHSO', 'Charleston Southern', 'Buccaneers', 'CHSO', 'FCS', 'Big South-OVC', '#00447C', '#B3A369', '#FFFFFF', { location: 'Charleston, SC' }),
  c('EIU', 'Eastern Illinois', 'Panthers', 'EIU', 'FCS', 'Big South-OVC', '#00539B', '#98A4AE', '#FFFFFF', { location: 'Charleston, IL' }),
  c('GWEB', 'Gardner-Webb', 'Runnin\' Bulldogs', 'GWEB', 'FCS', 'Big South-OVC', '#BA0C2F', '#000000', '#FFFFFF', { location: 'Boiling Springs, NC' }),
  c('LIND', 'Lindenwood', 'Lions', 'LIND', 'FCS', 'Big South-OVC', '#000000', '#B58500', '#FFFFFF', { location: 'St. Charles, MO' }),
  c('SEMO', 'Southeast Missouri State', 'Redhawks', 'SEMO', 'FCS', 'Big South-OVC', '#C8102E', '#000000', '#FFFFFF', { location: 'Cape Girardeau, MO' }),
  c('TNST', 'Tennessee State', 'Tigers', 'TNST', 'FCS', 'Big South-OVC', '#00539B', '#FFFFFF', '#000000', { location: 'Nashville, TN' }),
  c('TNTC', 'Tennessee Tech', 'Golden Eagles', 'TNTC', 'FCS', 'Big South-OVC', '#4F2D7F', '#EAAA00', '#FFFFFF', { location: 'Cookeville, TN' }),
  c('UTM', 'UT Martin', 'Skyhawks', 'UTM', 'FCS', 'Big South-OVC', '#FF6600', '#002D62', '#FFFFFF', { location: 'Martin, TN' }),
  c('WIU', 'Western Illinois', 'Leathernecks', 'WIU', 'FCS', 'Big South-OVC', '#663366', '#FFC72C', '#FFFFFF', { location: 'Macomb, IL' }),

  // --- Patriot (8) ---
  c('BUCK', 'Bucknell', 'Bison', 'BUCK', 'FCS', 'Patriot', '#003865', '#FF6600', '#FFFFFF', { location: 'Lewisburg, PA' }),
  c('COLG', 'Colgate', 'Raiders', 'COLG', 'FCS', 'Patriot', '#821019', '#FFFFFF', '#000000', { location: 'Hamilton, NY' }),
  c('FOR', 'Fordham', 'Rams', 'FOR', 'FCS', 'Patriot', '#860038', '#FFFFFF', '#000000', { location: 'Bronx, NY' }),
  c('GTWN', 'Georgetown', 'Hoyas', 'GTWN', 'FCS', 'Patriot', '#041E42', '#63666A', '#FFFFFF', { location: 'Washington, DC' }),
  c('HC', 'Holy Cross', 'Crusaders', 'HC', 'FCS', 'Patriot', '#602D89', '#FFFFFF', '#000000', { location: 'Worcester, MA' }),
  c('LAF', 'Lafayette', 'Leopards', 'LAF', 'FCS', 'Patriot', '#800000', '#FFFFFF', '#000000', { location: 'Easton, PA' }),
  c('LEH', 'Lehigh', 'Mountain Hawks', 'LEH', 'FCS', 'Patriot', '#6E3219', '#A89968', '#FFFFFF', { location: 'Bethlehem, PA' }),
  c('RICH', 'Richmond', 'Spiders', 'RICH', 'FCS', 'Patriot', '#990000', '#12315B', '#FFFFFF', { location: 'Richmond, VA' }),

  // --- Ivy (8) ---
  c('BRWN', 'Brown', 'Bears', 'BRWN', 'FCS', 'Ivy', '#4E3629', '#ED1C24', '#B7B09C', { location: 'Providence, RI' }),
  c('CLMB', 'Columbia', 'Lions', 'CLMB', 'FCS', 'Ivy', '#9BCBEB', '#002B7F', '#FFFFFF', { location: 'New York, NY' }),
  c('COR', 'Cornell', 'Big Red', 'COR', 'FCS', 'Ivy', '#B31B1B', '#FFFFFF', '#222222', { location: 'Ithaca, NY' }),
  c('DART', 'Dartmouth', 'Big Green', 'DART', 'FCS', 'Ivy', '#00693E', '#FFFFFF', '#000000', { location: 'Hanover, NH' }),
  c('HARV', 'Harvard', 'Crimson', 'HARV', 'FCS', 'Ivy', '#A51C30', '#000000', '#FFFFFF', { location: 'Cambridge, MA' }),
  c('PENN', 'Pennsylvania', 'Quakers', 'PENN', 'FCS', 'Ivy', '#011F5B', '#990000', '#FFFFFF', { location: 'Philadelphia, PA' }),
  c('PRIN', 'Princeton', 'Tigers', 'PRIN', 'FCS', 'Ivy', '#FF6600', '#000000', '#FFFFFF', { location: 'Princeton, NJ' }),
  c('YALE', 'Yale', 'Bulldogs', 'YALE', 'FCS', 'Ivy', '#00356B', '#FFFFFF', '#000000', { location: 'New Haven, CT' }),

  // --- MEAC (6) ---
  c('DEST', 'Delaware State', 'Hornets', 'DEST', 'FCS', 'MEAC', '#E31837', '#003087', '#FFFFFF', { location: 'Dover, DE' }),
  c('HOW', 'Howard', 'Bison', 'HOW', 'FCS', 'MEAC', '#003A63', '#E51937', '#FFFFFF', { location: 'Washington, DC' }),
  c('MORG', 'Morgan State', 'Bears', 'MORG', 'FCS', 'MEAC', '#F7941E', '#002D72', '#FFFFFF', { location: 'Baltimore, MD' }),
  c('NORF', 'Norfolk State', 'Spartans', 'NORF', 'FCS', 'MEAC', '#007A53', '#F2C75C', '#FFFFFF', { location: 'Norfolk, VA' }),
  c('NCCU', 'North Carolina Central', 'Eagles', 'NCCU', 'FCS', 'MEAC', '#7A0019', '#808285', '#FFFFFF', { location: 'Durham, NC' }),
  c('SCST', 'South Carolina State', 'Bulldogs', 'SCST', 'FCS', 'MEAC', '#74232D', '#003087', '#FFFFFF', { location: 'Orangeburg, SC' }),

  // --- SWAC (12) ---
  c('AAMU', 'Alabama A&M', 'Bulldogs', 'AAMU', 'FCS', 'SWAC', '#660000', '#FFFFFF', '#000000', { location: 'Huntsville, AL' }),
  c('ALST', 'Alabama State', 'Hornets', 'ALST', 'FCS', 'SWAC', '#000000', '#B5A167', '#FFFFFF', { location: 'Montgomery, AL' }),
  c('ALCN', 'Alcorn State', 'Braves', 'ALCN', 'FCS', 'SWAC', '#4B2E83', '#B5A167', '#FFFFFF', { location: 'Lorman, MS' }),
  c('UAPB', 'Arkansas-Pine Bluff', 'Golden Lions', 'UAPB', 'FCS', 'SWAC', '#000000', '#F1B82D', '#FFFFFF', { location: 'Pine Bluff, AR' }),
  c('BCU', 'Bethune-Cookman', 'Wildcats', 'BCU', 'FCS', 'SWAC', '#7A0019', '#F1B82D', '#FFFFFF', { location: 'Daytona Beach, FL' }),
  c('FAMU', 'Florida A&M', 'Rattlers', 'FAMU', 'FCS', 'SWAC', '#F58025', '#009639', '#FFFFFF', { location: 'Tallahassee, FL' }),
  c('GRAM', 'Grambling State', 'Tigers', 'GRAM', 'FCS', 'SWAC', '#000000', '#FDB927', '#FFFFFF', { location: 'Grambling, LA' }),
  c('JKST', 'Jackson State', 'Tigers', 'JKST', 'FCS', 'SWAC', '#002D62', '#FFFFFF', '#000000', { location: 'Jackson, MS' }),
  c('MVSU', 'Mississippi Valley State', 'Delta Devils', 'MVSU', 'FCS', 'SWAC', '#006747', '#FFFFFF', '#000000', { location: 'Itta Bena, MS' }),
  c('PV', 'Prairie View A&M', 'Panthers', 'PV', 'FCS', 'SWAC', '#4F2D7F', '#FDB913', '#FFFFFF', { location: 'Prairie View, TX' }),
  c('SOU', 'Southern', 'Jaguars', 'SOU', 'FCS', 'SWAC', '#003DA5', '#B5A167', '#FFFFFF', { location: 'Baton Rouge, LA' }),
  c('TXSO', 'Texas Southern', 'Tigers', 'TXSO', 'FCS', 'SWAC', '#660000', '#999999', '#FFFFFF', { location: 'Houston, TX' }),

  // --- Pioneer (11) ---
  c('BUT', 'Butler', 'Bulldogs', 'BUT', 'FCS', 'Pioneer', '#13294B', '#FFFFFF', '#000000', { location: 'Indianapolis, IN' }),
  c('DAV', 'Davidson', 'Wildcats', 'DAV', 'FCS', 'Pioneer', '#C8102E', '#000000', '#FFFFFF', { location: 'Davidson, NC' }),
  c('DAY', 'Dayton', 'Flyers', 'DAY', 'FCS', 'Pioneer', '#C8102E', '#004B8D', '#FFFFFF', { location: 'Dayton, OH' }),
  c('DRKE', 'Drake', 'Bulldogs', 'DRKE', 'FCS', 'Pioneer', '#004477', '#FFFFFF', '#000000', { location: 'Des Moines, IA' }),
  c('MRST', 'Marist', 'Red Foxes', 'MRST', 'FCS', 'Pioneer', '#C8102E', '#000000', '#FFFFFF', { location: 'Poughkeepsie, NY' }),
  c('MORE', 'Morehead State', 'Eagles', 'MORE', 'FCS', 'Pioneer', '#003268', '#E1B72E', '#FFFFFF', { location: 'Morehead, KY' }),
  c('PRES', 'Presbyterian', 'Blue Hose', 'PRES', 'FCS', 'Pioneer', '#00519B', '#942139', '#FFFFFF', { location: 'Clinton, SC' }),
  c('USD', 'San Diego', 'Toreros', 'USD', 'FCS', 'Pioneer', '#003B70', '#75B2DD', '#FFFFFF', { location: 'San Diego, CA' }),
  c('STMN', 'St. Thomas', 'Tommies', 'STMN', 'FCS', 'Pioneer', '#582C83', '#98999B', '#FFFFFF', { location: 'St. Paul, MN' }),
  c('STET', 'Stetson', 'Hatters', 'STET', 'FCS', 'Pioneer', '#006747', '#FFFFFF', '#000000', { location: 'DeLand, FL' }),
  c('VALP', 'Valparaiso', 'Beacons', 'VALP', 'FCS', 'Pioneer', '#613318', '#B3A369', '#FFFFFF', { location: 'Valparaiso, IN' }),

  // --- UAC (United Athletic Conference) (10) ---
  c('ACU', 'Abilene Christian', 'Wildcats', 'ACU', 'FCS', 'UAC', '#4E2683', '#FFFFFF', '#000000', { location: 'Abilene, TX' }),
  c('APSU', 'Austin Peay', 'Governors', 'APSU', 'FCS', 'UAC', '#C41230', '#000000', '#FFFFFF', { location: 'Clarksville, TN' }),
  c('UCA', 'Central Arkansas', 'Bears', 'UCA', 'FCS', 'UAC', '#4F2D7F', '#808285', '#FFFFFF', { location: 'Conway, AR' }),
  c('EKU', 'Eastern Kentucky', 'Colonels', 'EKU', 'FCS', 'UAC', '#6A1B33', '#FFFFFF', '#000000', { location: 'Richmond, KY' }),
  c('UNA', 'North Alabama', 'Lions', 'UNA', 'FCS', 'UAC', '#4B2E83', '#B5A167', '#FFFFFF', { location: 'Florence, AL' }),
  c('SUU', 'Southern Utah', 'Thunderbirds', 'SUU', 'FCS', 'UAC', '#CC0000', '#000000', '#FFFFFF', { location: 'Cedar City, UT' }),
  c('SFA', 'Stephen F. Austin', 'Lumberjacks', 'SFA', 'FCS', 'UAC', '#582C83', '#FFFFFF', '#000000', { location: 'Nacogdoches, TX' }),
  c('TARL', 'Tarleton State', 'Texans', 'TARL', 'FCS', 'UAC', '#4F2D7F', '#FFFFFF', '#000000', { location: 'Stephenville, TX' }),
  c('UTU', 'Utah Tech', 'Trailblazers', 'UTU', 'FCS', 'UAC', '#BA0C2F', '#003058', '#FFFFFF', { location: 'St. George, UT' }),
  c('UWG', 'West Georgia', 'Wolves', 'UWG', 'FCS', 'UAC', '#002D62', '#C8102E', '#FFFFFF', { location: 'Carrollton, GA' }),

  // --- NEC (9) ---
  c('CCSU', 'Central Connecticut', 'Blue Devils', 'CCSU', 'FCS', 'NEC', '#003087', '#FFFFFF', '#000000', { location: 'New Britain, CT' }),
  c('DUQ', 'Duquesne', 'Dukes', 'DUQ', 'FCS', 'NEC', '#041E42', '#C8102E', '#FFFFFF', { location: 'Pittsburgh, PA' }),
  c('LIU', 'LIU', 'Sharks', 'LIU', 'FCS', 'NEC', '#00447C', '#B3A369', '#FFFFFF', { location: 'Brookville, NY' }),
  c('MERC', 'Mercyhurst', 'Lakers', 'MERC', 'FCS', 'NEC', '#00563F', '#0067B1', '#FFFFFF', { location: 'Erie, PA' }),
  c('NHV', 'New Haven', 'Chargers', 'NHV', 'FCS', 'NEC', '#004B8D', '#FFC72C', '#FFFFFF', { location: 'West Haven, CT' }),
  c('RMU', 'Robert Morris', 'Colonials', 'RMU', 'FCS', 'NEC', '#0033A0', '#C8102E', '#FFFFFF', { location: 'Moon Township, PA' }),
  c('SFPA', 'Saint Francis', 'Red Flash', 'SFPA', 'FCS', 'NEC', '#C8102E', '#000000', '#FFFFFF', { location: 'Loretto, PA' }),
  c('STON', 'Stonehill', 'Skyhawks', 'STON', 'FCS', 'NEC', '#4A0F2E', '#7A6E5D', '#FFFFFF', { location: 'Easton, MA' }),
  c('WAG', 'Wagner', 'Seahawks', 'WAG', 'FCS', 'NEC', '#004B2A', '#FFFFFF', '#000000', { location: 'Staten Island, NY' }),

  // --- FCS Independent (1) ---
  c('SHU', 'Sacred Heart', 'Pioneers', 'SHU', 'FCS', 'FCS Independent', '#C8102E', '#000000', '#FFFFFF', { location: 'Fairfield, CT', independent: true }),
]

// Texas ships as the initial demonstration org with the customer-provided
// longhorn as its configured primary logo. Every other team starts logo-less
// (neutral monogram) until an authorized asset is uploaded — never a fake logo.
const TEX = COLLEGE_TEAMS.find((t) => t.id === 'TEX')
if (TEX) TEX.assets.primaryLogoUrl = '/logos/texas-longhorn.png'

export const TEAMS_BY_ID: Record<string, TeamBrand> = Object.fromEntries(
  COLLEGE_TEAMS.map((team) => [team.id, team]),
)

export const DEFAULT_TEAM_ID = 'TEX'
