import type { TeamBrand } from '../types'

// ---------------------------------------------------------------------------
// All 32 current NFL clubs as configurable brand data.
//
// Names, conferences, divisions, and team colors are public identity facts.
// LOGOS AND TRADEMARKED MARKS ARE NOT BUNDLED — every team carries empty asset
// URL fields (primaryLogoUrl, etc.) that an authorized customer uploads through
// the Team Brand Assets area. Nothing here redistributes protected artwork.
//
// Colors drive the white-label theme (see ThemeProvider). `text` is the on-team
// text color; the dark background ramp is derived from `primary` at runtime.
// ---------------------------------------------------------------------------

const t = (
  id: string,
  location: string,
  nickname: string,
  abbr: string,
  conference: 'AFC' | 'NFC',
  division: 'East' | 'North' | 'South' | 'West',
  primary: string,
  secondary: string,
  accent: string,
): TeamBrand => ({
  id,
  name: `${location} ${nickname}`,
  location,
  nickname,
  shortName: nickname,
  abbr,
  conference,
  division,
  colors: { primary, secondary, accent, text: '#FFFFFF' },
  assets: {
    primaryLogoUrl: '',
    secondaryLogoUrl: '',
    wordmarkUrl: '',
    backgroundAssetUrl: '',
  },
})

export const NFL_TEAMS: TeamBrand[] = [
  // AFC East
  t('BUF', 'Buffalo', 'Bills', 'BUF', 'AFC', 'East', '#00338D', '#C60C30', '#FFFFFF'),
  t('MIA', 'Miami', 'Dolphins', 'MIA', 'AFC', 'East', '#008E97', '#FC4C02', '#FFFFFF'),
  t('NE', 'New England', 'Patriots', 'NE', 'AFC', 'East', '#002244', '#C60C30', '#B0B7BC'),
  t('NYJ', 'New York', 'Jets', 'NYJ', 'AFC', 'East', '#115740', '#F7F7F7', '#B0B7BC'),
  // AFC North
  t('BAL', 'Baltimore', 'Ravens', 'BAL', 'AFC', 'North', '#241773', '#9E7C0C', '#C8102E'),
  t('CIN', 'Cincinnati', 'Bengals', 'CIN', 'AFC', 'North', '#FB4F14', '#FFFFFF', '#B0B7BC'),
  t('CLE', 'Cleveland', 'Browns', 'CLE', 'AFC', 'North', '#4B2E17', '#FF3C00', '#FFFFFF'),
  t('PIT', 'Pittsburgh', 'Steelers', 'PIT', 'AFC', 'North', '#101820', '#FFB612', '#C60C30'),
  // AFC South
  t('HOU', 'Houston', 'Texans', 'HOU', 'AFC', 'South', '#03202F', '#A71930', '#FFFFFF'),
  t('IND', 'Indianapolis', 'Colts', 'IND', 'AFC', 'South', '#002C5F', '#A2AAAD', '#FFFFFF'),
  t('JAX', 'Jacksonville', 'Jaguars', 'JAX', 'AFC', 'South', '#006778', '#D7A22A', '#FFFFFF'),
  t('TEN', 'Tennessee', 'Titans', 'TEN', 'AFC', 'South', '#0C2340', '#4B92DB', '#C8102E'),
  // AFC West
  t('DEN', 'Denver', 'Broncos', 'DEN', 'AFC', 'West', '#002244', '#FB4F14', '#FFFFFF'),
  t('KC', 'Kansas City', 'Chiefs', 'KC', 'AFC', 'West', '#E31837', '#FFB81C', '#FFFFFF'),
  t('LV', 'Las Vegas', 'Raiders', 'LV', 'AFC', 'West', '#0B0B0B', '#A5ACAF', '#FFFFFF'),
  t('LAC', 'Los Angeles', 'Chargers', 'LAC', 'AFC', 'West', '#0080C6', '#FFC20E', '#FFFFFF'),
  // NFC East
  t('DAL', 'Dallas', 'Cowboys', 'DAL', 'NFC', 'East', '#003594', '#869397', '#FFFFFF'),
  t('NYG', 'New York', 'Giants', 'NYG', 'NFC', 'East', '#0B2265', '#A71930', '#FFFFFF'),
  t('PHI', 'Philadelphia', 'Eagles', 'PHI', 'NFC', 'East', '#004C54', '#A5ACAF', '#FFFFFF'),
  t('WAS', 'Washington', 'Commanders', 'WAS', 'NFC', 'East', '#5A1414', '#FFB612', '#FFFFFF'),
  // NFC North
  t('CHI', 'Chicago', 'Bears', 'CHI', 'NFC', 'North', '#0B162A', '#C83803', '#FFFFFF'),
  t('DET', 'Detroit', 'Lions', 'DET', 'NFC', 'North', '#0076B6', '#B0B7BC', '#FFFFFF'),
  t('GB', 'Green Bay', 'Packers', 'GB', 'NFC', 'North', '#203731', '#FFB612', '#FFFFFF'),
  t('MIN', 'Minnesota', 'Vikings', 'MIN', 'NFC', 'North', '#4F2683', '#FFC62F', '#FFFFFF'),
  // NFC South
  t('ATL', 'Atlanta', 'Falcons', 'ATL', 'NFC', 'South', '#A71930', '#A5ACAF', '#FFFFFF'),
  t('CAR', 'Carolina', 'Panthers', 'CAR', 'NFC', 'South', '#0085CA', '#BFC0BF', '#FFFFFF'),
  t('NO', 'New Orleans', 'Saints', 'NO', 'NFC', 'South', '#101820', '#D3BC8D', '#FFFFFF'),
  t('TB', 'Tampa Bay', 'Buccaneers', 'TB', 'NFC', 'South', '#D50A0A', '#FF7900', '#B1BABF'),
  // NFC West
  t('ARI', 'Arizona', 'Cardinals', 'ARI', 'NFC', 'West', '#97233F', '#FFB612', '#FFFFFF'),
  t('LAR', 'Los Angeles', 'Rams', 'LAR', 'NFC', 'West', '#003594', '#FFD100', '#FFFFFF'),
  t('SF', 'San Francisco', '49ers', 'SF', 'NFC', 'West', '#AA0000', '#B3995D', '#FFFFFF'),
  t('SEA', 'Seattle', 'Seahawks', 'SEA', 'NFC', 'West', '#002244', '#69BE28', '#A5ACAF'),
]

export const TEAMS_BY_ID: Record<string, TeamBrand> = Object.fromEntries(
  NFL_TEAMS.map((team) => [team.id, team]),
)

export const DEFAULT_TEAM_ID = 'BUF'

export function getTeam(id: string | undefined | null): TeamBrand {
  return (id && TEAMS_BY_ID[id]) || TEAMS_BY_ID[DEFAULT_TEAM_ID]
}

/** Teams grouped by conference + division, for admin selectors. */
export function teamsByDivision(): { label: string; teams: TeamBrand[] }[] {
  const order: Array<[('AFC' | 'NFC'), ('East' | 'North' | 'South' | 'West')]> = [
    ['AFC', 'East'], ['AFC', 'North'], ['AFC', 'South'], ['AFC', 'West'],
    ['NFC', 'East'], ['NFC', 'North'], ['NFC', 'South'], ['NFC', 'West'],
  ]
  return order.map(([conf, div]) => ({
    label: `${conf} ${div}`,
    teams: NFL_TEAMS.filter((x) => x.conference === conf && x.division === div),
  }))
}
