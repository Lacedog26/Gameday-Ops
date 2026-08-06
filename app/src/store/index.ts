import { configureStore } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import appReducer from './appSlice';

const STORAGE_KEY = 'oc_app_state';
// Bump when the persisted AppState shape changes incompatibly. A payload
// written by an older app version with a different schema is discarded
// (falls back to initialState) rather than spread verbatim into the store,
// which could otherwise render a malformed nested field and crash on upgrade.
const PERSIST_VERSION = 1;

export const store = configureStore({
  reducer: {
    app: appReducer,
  },
});

// Persist on every state change
let debounceTimer: ReturnType<typeof setTimeout>;
store.subscribe(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const { todayChallenge, ...persistable } = store.getState().app;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ _v: PERSIST_VERSION, ...persistable }),
    ).catch(console.error);
  }, 300);
});

export async function loadPersistedState() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const { _v, ...rest } = parsed ?? {};
      // A pre-versioning payload (no _v) is the CURRENT (v1) shape, so accept
      // it — treating legacy as v1 means existing users keep their streak /
      // onboarded flag on this upgrade. Only discard when an explicit version
      // is present and differs (a future incompatible bump).
      const version = typeof _v === 'number' ? _v : 1;
      if (version !== PERSIST_VERSION) return null;
      return rest;
    }
  } catch (e) {
    console.error('Failed to load persisted state:', e);
  }
  return null;
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
