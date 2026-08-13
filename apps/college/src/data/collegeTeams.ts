import type { TeamBrand } from '@gamedayops/core'

// ---------------------------------------------------------------------------
// GameDayOps College Football — team universe.
//
// This is a DEMONSTRATION SUBSET spanning FBS (multiple conferences + an
// Independent) and FCS (incl. an HBCU/SWAC program) so the level → conference →
// team selector and search can be exercised end-to-end. The full FBS + FCS
// universe is loaded in Phase 3 via the CollegeFootballData importer.
//
// Only public identity facts are encoded here (school, nickname, conference,
// team colors). NO trademarked logo artwork is bundled — every team carries an
// empty logo asset slot that an authorized customer fills via Admin → Team Logo.
// Conferences are free-form strings (realignment-safe), never a fixed union.
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
  division: '', // most modern college conferences no longer use divisions
  subdivision,
  school,
  independent: opts.independent,
  colors: { primary, secondary, accent, text: opts.text ?? '#FFFFFF' },
  assets: { primaryLogoUrl: '', secondaryLogoUrl: '', wordmarkUrl: '', backgroundAssetUrl: '' },
})

export const COLLEGE_TEAMS: TeamBrand[] = [
  // --- FBS · SEC ---
  c('TEX', 'Texas', 'Longhorns', 'TEX', 'FBS', 'SEC', '#BF5700', '#FFFFFF', '#333F48', { location: 'Austin, TX' }),
  c('OU', 'Oklahoma', 'Sooners', 'OU', 'FBS', 'SEC', '#841617', '#FDF9D8', '#FFFFFF', { location: 'Norman, OK' }),
  c('GA', 'Georgia', 'Bulldogs', 'UGA', 'FBS', 'SEC', '#BA0C2F', '#000000', '#FFFFFF', { location: 'Athens, GA' }),
  c('ALA', 'Alabama', 'Crimson Tide', 'ALA', 'FBS', 'SEC', '#9E1B32', '#828A8F', '#FFFFFF', { location: 'Tuscaloosa, AL' }),
  c('LSU', 'LSU', 'Tigers', 'LSU', 'FBS', 'SEC', '#461D7C', '#FDD023', '#FFFFFF', { location: 'Baton Rouge, LA' }),
  c('TENN', 'Tennessee', 'Volunteers', 'TENN', 'FBS', 'SEC', '#FF8200', '#FFFFFF', '#58595B', { location: 'Knoxville, TN' }),
  c('TAMU', 'Texas A&M', 'Aggies', 'TAMU', 'FBS', 'SEC', '#500000', '#FFFFFF', '#998542', { location: 'College Station, TX' }),
  // --- FBS · Big Ten ---
  c('OSU', 'Ohio State', 'Buckeyes', 'OSU', 'FBS', 'Big Ten', '#BB0000', '#666666', '#FFFFFF', { location: 'Columbus, OH' }),
  c('MICH', 'Michigan', 'Wolverines', 'MICH', 'FBS', 'Big Ten', '#00274C', '#FFCB05', '#FFFFFF', { location: 'Ann Arbor, MI' }),
  c('PSU', 'Penn State', 'Nittany Lions', 'PSU', 'FBS', 'Big Ten', '#041E42', '#FFFFFF', '#96BEE6', { location: 'University Park, PA' }),
  c('ORE', 'Oregon', 'Ducks', 'ORE', 'FBS', 'Big Ten', '#154733', '#FEE123', '#FFFFFF', { location: 'Eugene, OR' }),
  c('USC', 'USC', 'Trojans', 'USC', 'FBS', 'Big Ten', '#990000', '#FFCC00', '#FFFFFF', { location: 'Los Angeles, CA' }),
  // --- FBS · Big 12 ---
  c('TTU', 'Texas Tech', 'Red Raiders', 'TTU', 'FBS', 'Big 12', '#CC0000', '#000000', '#FFFFFF', { location: 'Lubbock, TX' }),
  c('BAY', 'Baylor', 'Bears', 'BAY', 'FBS', 'Big 12', '#154734', '#FFB81C', '#FFFFFF', { location: 'Waco, TX' }),
  c('KSU', 'Kansas State', 'Wildcats', 'KSU', 'FBS', 'Big 12', '#512888', '#D1D1D1', '#FFFFFF', { location: 'Manhattan, KS' }),
  // --- FBS · ACC ---
  c('CLEM', 'Clemson', 'Tigers', 'CLEM', 'FBS', 'ACC', '#F56600', '#522D80', '#FFFFFF', { location: 'Clemson, SC' }),
  c('FSU', 'Florida State', 'Seminoles', 'FSU', 'FBS', 'ACC', '#782F40', '#CEB888', '#FFFFFF', { location: 'Tallahassee, FL' }),
  c('MIA', 'Miami', 'Hurricanes', 'MIAF', 'FBS', 'ACC', '#F47321', '#005030', '#FFFFFF', { location: 'Coral Gables, FL' }),
  // --- FBS · Independent ---
  c('ND', 'Notre Dame', 'Fighting Irish', 'ND', 'FBS', 'FBS Independent', '#0C2340', '#C99700', '#FFFFFF', { location: 'Notre Dame, IN', independent: true }),
  // --- FCS · Missouri Valley Football Conference ---
  c('NDSU', 'North Dakota State', 'Bison', 'NDSU', 'FCS', 'Missouri Valley Football Conference', '#009639', '#FFC72C', '#FFFFFF', { location: 'Fargo, ND' }),
  c('SDSU', 'South Dakota State', 'Jackrabbits', 'SDSU', 'FCS', 'Missouri Valley Football Conference', '#0033A0', '#FFD100', '#FFFFFF', { location: 'Brookings, SD' }),
  // --- FCS · SWAC (HBCU) ---
  c('JKST', 'Jackson State', 'Tigers', 'JKST', 'FCS', 'SWAC', '#12264B', '#B3A369', '#FFFFFF', { location: 'Jackson, MS' }),
  // --- FCS · Big Sky ---
  c('MONT', 'Montana', 'Grizzlies', 'MONT', 'FCS', 'Big Sky', '#75001F', '#A2AAAD', '#FFFFFF', { location: 'Missoula, MT' }),
]

// Texas ships as the initial demonstration organization. Its primary logo is a
// clearly-labeled placeholder; an authorized customer uploads official artwork.
const TEX = COLLEGE_TEAMS.find((t) => t.id === 'TEX')
if (TEX) TEX.assets.primaryLogoUrl = '/logos/texas-longhorn.svg'

export const TEAMS_BY_ID: Record<string, TeamBrand> = Object.fromEntries(
  COLLEGE_TEAMS.map((t) => [t.id, t]),
)

export const DEFAULT_TEAM_ID = 'TEX'
