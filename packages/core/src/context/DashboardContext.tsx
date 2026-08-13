import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import type {
  AppState,
  CultureGraphic,
  GameInfo,
  GameOverride,
  NflGame,
  PregameEvent,
  Quote,
  ScheduleTemplate,
  Settings,
  TeamLogo,
  TemplateKind,
} from '../types'
import { makeDefaultState } from '../product'
import { uid } from '../lib/id'
import { storage } from '../lib/storage'

// ---------------------------------------------------------------------------
// Central state store: useReducer + Context, persisted through the storage
// adapter, and synced across tabs/TVs via the adapter's subscribe().
// ---------------------------------------------------------------------------

type Action =
  | { type: 'HYDRATE'; state: AppState; external?: boolean }
  | { type: 'SET_GAME'; patch: Partial<GameInfo> }
  | { type: 'SET_EVENTS'; events: PregameEvent[] }
  | { type: 'ADD_EVENT'; event: PregameEvent }
  | { type: 'UPDATE_EVENT'; id: string; patch: Partial<PregameEvent> }
  | { type: 'DELETE_EVENT'; id: string }
  | { type: 'REORDER_EVENTS'; from: number; to: number }
  | { type: 'ACK_EVENT'; id: string }
  | { type: 'CLEAR_ACKS' }
  | { type: 'LOAD_TEMPLATE'; templateId: string }
  | { type: 'SAVE_TEMPLATE'; name: string; kind: TemplateKind; templateId?: string }
  | { type: 'DELETE_TEMPLATE'; templateId: string }
  | { type: 'ADD_GRAPHIC'; graphic: CultureGraphic }
  | { type: 'UPDATE_GRAPHIC'; id: string; patch: Partial<CultureGraphic> }
  | { type: 'DELETE_GRAPHIC'; id: string }
  | { type: 'REORDER_GRAPHICS'; from: number; to: number }
  | { type: 'ADD_QUOTE'; quote: Quote }
  | { type: 'UPDATE_QUOTE'; id: string; patch: Partial<Quote> }
  | { type: 'DELETE_QUOTE'; id: string }
  | { type: 'REORDER_QUOTES'; from: number; to: number }
  | { type: 'SET_SETTINGS'; patch: Partial<Settings> }
  | { type: 'SET_SEASON'; season: number }
  | { type: 'SET_GAME_OVERRIDE'; gameId: string; override: GameOverride }
  | { type: 'CLEAR_GAME_OVERRIDE'; gameId: string }
  | { type: 'IMPORT_GAMES'; games: NflGame[] }
  | { type: 'LOAD_GAME'; game: GameInfo }
  | { type: 'SET_TEAM_LOGO'; teamId: string; patch: Partial<TeamLogo> }
  | { type: 'REMOVE_TEAM_LOGO'; teamId: string }
  | { type: 'RESET' }

function move<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice()
  if (from < 0 || from >= next.length || to < 0 || to >= next.length) return next
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return action.state

    case 'SET_GAME':
      return { ...state, game: { ...state.game, ...action.patch } }

    case 'SET_EVENTS':
      return { ...state, activeEvents: action.events }

    case 'ADD_EVENT':
      return { ...state, activeEvents: [...state.activeEvents, action.event] }

    case 'UPDATE_EVENT':
      return {
        ...state,
        activeEvents: state.activeEvents.map((e) =>
          e.id === action.id ? { ...e, ...action.patch } : e,
        ),
      }

    case 'DELETE_EVENT':
      return {
        ...state,
        activeEvents: state.activeEvents.filter((e) => e.id !== action.id),
      }

    case 'REORDER_EVENTS':
      return { ...state, activeEvents: move(state.activeEvents, action.from, action.to) }

    case 'ACK_EVENT':
      return {
        ...state,
        activeEvents: state.activeEvents.map((e) =>
          e.id === action.id ? { ...e, acknowledgedAt: Date.now() } : e,
        ),
      }

    case 'CLEAR_ACKS':
      return {
        ...state,
        activeEvents: state.activeEvents.map((e) => ({ ...e, acknowledgedAt: null })),
      }

    case 'LOAD_TEMPLATE': {
      const tpl = state.templates.find((t) => t.id === action.templateId)
      if (!tpl) return state
      // Fresh ids + cleared acks so the loaded schedule is independent.
      const events = tpl.events.map((e) => ({ ...e, id: uid('evt'), acknowledgedAt: null }))
      return { ...state, activeEvents: events }
    }

    case 'SAVE_TEMPLATE': {
      const snapshot = state.activeEvents.map((e) => ({ ...e, acknowledgedAt: null }))
      if (action.templateId) {
        return {
          ...state,
          templates: state.templates.map((t) =>
            t.id === action.templateId
              ? { ...t, name: action.name, kind: action.kind, events: snapshot, updatedAt: Date.now() }
              : t,
          ),
        }
      }
      const tpl: ScheduleTemplate = {
        id: uid('tpl'),
        name: action.name,
        kind: action.kind,
        events: snapshot,
        builtIn: false,
        updatedAt: Date.now(),
      }
      return { ...state, templates: [...state.templates, tpl] }
    }

    case 'DELETE_TEMPLATE':
      return {
        ...state,
        templates: state.templates.filter((t) => t.id !== action.templateId),
      }

    case 'ADD_GRAPHIC':
      return { ...state, graphics: [...state.graphics, action.graphic] }

    case 'UPDATE_GRAPHIC':
      return {
        ...state,
        graphics: state.graphics.map((g) =>
          g.id === action.id ? { ...g, ...action.patch } : g,
        ),
      }

    case 'DELETE_GRAPHIC':
      return { ...state, graphics: state.graphics.filter((g) => g.id !== action.id) }

    case 'REORDER_GRAPHICS': {
      const reordered = move(
        [...state.graphics].sort((a, b) => a.order - b.order),
        action.from,
        action.to,
      ).map((g, i) => ({ ...g, order: i }))
      return { ...state, graphics: reordered }
    }

    case 'ADD_QUOTE':
      return { ...state, quotes: [...state.quotes, action.quote] }

    case 'UPDATE_QUOTE':
      return {
        ...state,
        quotes: state.quotes.map((q) => (q.id === action.id ? { ...q, ...action.patch } : q)),
      }

    case 'DELETE_QUOTE':
      return { ...state, quotes: state.quotes.filter((q) => q.id !== action.id) }

    case 'REORDER_QUOTES': {
      const reordered = move(
        [...state.quotes].sort((a, b) => a.order - b.order),
        action.from,
        action.to,
      ).map((q, i) => ({ ...q, order: i }))
      return { ...state, quotes: reordered }
    }

    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.patch } }

    case 'SET_SEASON':
      return { ...state, season: action.season }

    case 'SET_GAME_OVERRIDE':
      return {
        ...state,
        gameOverrides: { ...state.gameOverrides, [action.gameId]: action.override },
      }

    case 'CLEAR_GAME_OVERRIDE': {
      const next = { ...state.gameOverrides }
      delete next[action.gameId]
      return { ...state, gameOverrides: next }
    }

    case 'IMPORT_GAMES': {
      // Replace custom games for the imported (team, season) pairs; keep others.
      const affected = new Set(action.games.map((g) => `${g.teamId}:${g.season}`))
      const kept = state.customGames.filter((g) => !affected.has(`${g.teamId}:${g.season}`))
      return { ...state, customGames: [...kept, ...action.games] }
    }

    case 'LOAD_GAME':
      // Loading a scheduled game sets the active board + clears prior acks so
      // the new game starts fresh. Timing recalculates from the new kickoff.
      return {
        ...state,
        game: { ...state.game, ...action.game },
        activeEvents: state.activeEvents.map((e) => ({ ...e, acknowledgedAt: null })),
      }

    case 'SET_TEAM_LOGO': {
      const existing = state.teamLogos[action.teamId] ?? { url: '', zoom: 1, offsetY: 0 }
      return {
        ...state,
        teamLogos: { ...state.teamLogos, [action.teamId]: { ...existing, ...action.patch } },
      }
    }

    case 'REMOVE_TEAM_LOGO': {
      const next = { ...state.teamLogos }
      delete next[action.teamId]
      return { ...state, teamLogos: next }
    }

    case 'RESET':
      return makeDefaultState()

    default:
      return state
  }
}

interface DashboardContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
  /** True until the initial load from storage has completed. */
  hydrated: boolean
  /** Convenience action creators. */
  actions: {
    setGame: (patch: Partial<GameInfo>) => void
    setEvents: (events: PregameEvent[]) => void
    addEvent: (event: Omit<PregameEvent, 'id'>) => void
    updateEvent: (id: string, patch: Partial<PregameEvent>) => void
    deleteEvent: (id: string) => void
    reorderEvents: (from: number, to: number) => void
    ackEvent: (id: string) => void
    clearAcks: () => void
    loadTemplate: (templateId: string) => void
    saveTemplate: (name: string, kind: TemplateKind, templateId?: string) => void
    deleteTemplate: (templateId: string) => void
    addGraphic: (graphic: Omit<CultureGraphic, 'id'>) => void
    updateGraphic: (id: string, patch: Partial<CultureGraphic>) => void
    deleteGraphic: (id: string) => void
    reorderGraphics: (from: number, to: number) => void
    addQuote: (quote: Omit<Quote, 'id'>) => void
    updateQuote: (id: string, patch: Partial<Quote>) => void
    deleteQuote: (id: string) => void
    reorderQuotes: (from: number, to: number) => void
    setSettings: (patch: Partial<Settings>) => void
    setSeason: (season: number) => void
    setGameOverride: (gameId: string, override: GameOverride) => void
    clearGameOverride: (gameId: string) => void
    importGames: (games: NflGame[]) => void
    loadGame: (game: GameInfo) => void
    setTeamLogo: (teamId: string, patch: Partial<TeamLogo>) => void
    removeTeamLogo: (teamId: string) => void
    reset: () => void
  }
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, makeDefaultState)
  const hydratedRef = useRef(false)
  const skipPersistRef = useRef(true) // don't persist the very first render
  const [, forceHydrated] = useReducer((c) => c + 1, 0)

  // Initial load from storage.
  useEffect(() => {
    let cancelled = false
    storage.load().then((loaded) => {
      if (cancelled) return
      if (loaded) {
        const migrated = migrate(loaded)
        skipPersistRef.current = true
        dispatch({ type: 'HYDRATE', state: migrated, external: true })
        // Persist the migrated result so version bumps and one-time cleanups
        // (e.g. removing the seeded duplicate quotes) stick without an edit.
        if (migrated.version !== loaded.version) storage.save(migrated)
      } else {
        // First run on this machine: persist the seeded default immediately so
        // every TV/tab shares one schedule from the very first load. `state`
        // here is the initial default from makeDefaultState().
        // eslint-disable-next-line react-hooks/exhaustive-deps
        storage.save(state)
      }
      hydratedRef.current = true
      forceHydrated()
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Cross-tab / cross-TV sync: apply external changes without re-persisting.
  useEffect(() => {
    return storage.subscribe((incoming) => {
      skipPersistRef.current = true
      dispatch({ type: 'HYDRATE', state: incoming, external: true })
    })
  }, [])

  // Persist on every local change (skips hydrations to avoid write loops).
  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false
      return
    }
    storage.save(state)
  }, [state])

  const actions = useMemo<DashboardContextValue['actions']>(
    () => ({
      setGame: (patch) => dispatch({ type: 'SET_GAME', patch }),
      setEvents: (events) => dispatch({ type: 'SET_EVENTS', events }),
      addEvent: (event) => dispatch({ type: 'ADD_EVENT', event: { ...event, id: uid('evt') } }),
      updateEvent: (id, patch) => dispatch({ type: 'UPDATE_EVENT', id, patch }),
      deleteEvent: (id) => dispatch({ type: 'DELETE_EVENT', id }),
      reorderEvents: (from, to) => dispatch({ type: 'REORDER_EVENTS', from, to }),
      ackEvent: (id) => dispatch({ type: 'ACK_EVENT', id }),
      clearAcks: () => dispatch({ type: 'CLEAR_ACKS' }),
      loadTemplate: (templateId) => dispatch({ type: 'LOAD_TEMPLATE', templateId }),
      saveTemplate: (name, kind, templateId) =>
        dispatch({ type: 'SAVE_TEMPLATE', name, kind, templateId }),
      deleteTemplate: (templateId) => dispatch({ type: 'DELETE_TEMPLATE', templateId }),
      addGraphic: (graphic) => dispatch({ type: 'ADD_GRAPHIC', graphic: { ...graphic, id: uid('gfx') } }),
      updateGraphic: (id, patch) => dispatch({ type: 'UPDATE_GRAPHIC', id, patch }),
      deleteGraphic: (id) => dispatch({ type: 'DELETE_GRAPHIC', id }),
      reorderGraphics: (from, to) => dispatch({ type: 'REORDER_GRAPHICS', from, to }),
      addQuote: (quote) => dispatch({ type: 'ADD_QUOTE', quote: { ...quote, id: uid('qt') } }),
      updateQuote: (id, patch) => dispatch({ type: 'UPDATE_QUOTE', id, patch }),
      deleteQuote: (id) => dispatch({ type: 'DELETE_QUOTE', id }),
      reorderQuotes: (from, to) => dispatch({ type: 'REORDER_QUOTES', from, to }),
      setSettings: (patch) => dispatch({ type: 'SET_SETTINGS', patch }),
      setSeason: (season) => dispatch({ type: 'SET_SEASON', season }),
      setGameOverride: (gameId, override) => dispatch({ type: 'SET_GAME_OVERRIDE', gameId, override }),
      clearGameOverride: (gameId) => dispatch({ type: 'CLEAR_GAME_OVERRIDE', gameId }),
      importGames: (games) => dispatch({ type: 'IMPORT_GAMES', games }),
      loadGame: (game) => dispatch({ type: 'LOAD_GAME', game }),
      setTeamLogo: (teamId, patch) => dispatch({ type: 'SET_TEAM_LOGO', teamId, patch }),
      removeTeamLogo: (teamId) => dispatch({ type: 'REMOVE_TEAM_LOGO', teamId }),
      reset: () => dispatch({ type: 'RESET' }),
    }),
    [],
  )

  const value = useMemo<DashboardContextValue>(
    () => ({ state, dispatch, hydrated: hydratedRef.current, actions }),
    [state, actions],
  )

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

/** Forward-compatible migration hook for older persisted documents. */
function migrate(loaded: AppState): AppState {
  const base = makeDefaultState()
  // Heal older bundled-asset paths that have since been replaced with the
  // official team artwork, so boards saved before the swap update themselves.
  const assetRemap: Record<string, { src: string; matte?: 'none' | 'light' }> = {
    '/culture/they-have-to-play-us.svg': { src: '/culture/they-have-to-play-us.png' },
    '/culture/put-the-ball-down.svg': { src: '/culture/put-the-ball-down.png', matte: 'light' },
  }
  const graphics = (loaded.graphics ?? base.graphics).map((g) =>
    assetRemap[g.src] ? { ...g, ...assetRemap[g.src] } : g,
  )

  let quotes = loaded.quotes ?? base.quotes
  // One-time (v1 -> v2): the first release seeded text quotes that duplicated
  // the image logos. Strip those exact seeded duplicates once. Gated on version
  // so quotes the user types later (even the same text) are never touched.
  if ((loaded.version ?? 1) < 2) {
    const dupes = new Set(['PUT THE BALL DOWN.', 'THEY HAVE TO PLAY US.'])
    quotes = quotes.filter((q) => !dupes.has(q.text.trim().toUpperCase()))
  }

  return {
    ...base,
    ...loaded,
    version: 2,
    game: { ...base.game, ...loaded.game },
    settings: { ...base.settings, ...loaded.settings },
    graphics,
    quotes,
    // Schedule Center fields (added later) — seed on older saved boards.
    season: loaded.season ?? base.season,
    gameOverrides: loaded.gameOverrides ?? base.gameOverrides,
    customGames: loaded.customGames ?? base.customGames,
    teamLogos: loaded.teamLogos ?? base.teamLogos,
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used within a DashboardProvider')
  return ctx
}
