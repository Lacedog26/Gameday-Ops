// Server-driven version gate. Asks the backend whether the running build is
// current and returns whether to show a "please update" prompt. There is no
// OTA, so this is how a future release can nudge users onto a newer build.
//
// Fail-OPEN everywhere: any error, missing config, or web resolves to 'ok'.
// A backend hiccup must NEVER lock a user out of the app.

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export type UpdateStatus = 'ok' | 'suggest' | 'block';

export interface AppVersionStatus {
  status: UpdateStatus;
  storeUrl: string;
}

// The running build number, read from the config embedded at build time
// (same source App.tsx already trusts for the OneSignal app id). iOS uses
// ios.buildNumber (string), Android uses android.versionCode (int). Returns
// null on web / when unavailable → caller treats as 'ok'.
function currentBuild(): number | null {
  const cfg = Constants.expoConfig;
  if (!cfg) return null;
  if (Platform.OS === 'ios') {
    const n = cfg.ios?.buildNumber ? parseInt(String(cfg.ios.buildNumber), 10) : NaN;
    return Number.isFinite(n) ? n : null;
  }
  if (Platform.OS === 'android') {
    const v = cfg.android?.versionCode;
    const n = typeof v === 'number' ? v : v ? parseInt(String(v), 10) : NaN;
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function checkAppVersion(): Promise<AppVersionStatus> {
  const fallback: AppVersionStatus = { status: 'ok', storeUrl: '' };
  if (Platform.OS === 'web') return fallback;

  const build = currentBuild();
  if (build === null) return fallback;

  try {
    const { data, error } = await supabase.rpc('get_app_version_status', {
      p_platform: Platform.OS,
      p_build: build,
    });
    if (error || !data) return fallback;
    const row = data as { status?: UpdateStatus; store_url?: string };
    const status: UpdateStatus =
      row.status === 'block' || row.status === 'suggest' ? row.status : 'ok';
    return { status, storeUrl: row.store_url ?? '' };
  } catch {
    return fallback;
  }
}
