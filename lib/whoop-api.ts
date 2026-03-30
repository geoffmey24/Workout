import { WhoopData } from '@/types';

// WHOOP API Configuration
// Register your app at https://developer.whoop.com to get these credentials
export const WHOOP_CONFIG = {
  clientId: process.env.WHOOP_CLIENT_ID || '',
  clientSecret: process.env.WHOOP_CLIENT_SECRET || '',
  redirectUri: process.env.WHOOP_REDIRECT_URI || 'http://localhost:3000/api/whoop/callback',
  authUrl: 'https://api.prod.whoop.com/oauth/oauth2/auth',
  tokenUrl: 'https://api.prod.whoop.com/oauth/oauth2/token',
  apiBase: 'https://api.prod.whoop.com/developer',
  scopes: ['offline', 'read:recovery', 'read:sleep', 'read:workout', 'read:cycles', 'read:profile', 'read:body_measurement'],
};

export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: WHOOP_CONFIG.clientId,
    redirect_uri: WHOOP_CONFIG.redirectUri,
    response_type: 'code',
    scope: WHOOP_CONFIG.scopes.join(' '),
    state,
  });
  return `${WHOOP_CONFIG.authUrl}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch(WHOOP_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: WHOOP_CONFIG.clientId,
      client_secret: WHOOP_CONFIG.clientSecret,
      redirect_uri: WHOOP_CONFIG.redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch(WHOOP_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: WHOOP_CONFIG.clientId,
      client_secret: WHOOP_CONFIG.clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  return res.json();
}

// Fetch data from WHOOP API
async function whoopFetch(endpoint: string, accessToken: string) {
  const res = await fetch(`${WHOOP_CONFIG.apiBase}${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`WHOOP API error: ${res.status}`);
  return res.json();
}

export async function fetchWhoopProfile(accessToken: string) {
  return whoopFetch('/v2/user/profile/basic', accessToken);
}

export async function fetchWhoopRecovery(accessToken: string, limit = 7) {
  const data = await whoopFetch(`/v2/recovery?limit=${limit}`, accessToken);
  return data.records || [];
}

export async function fetchWhoopSleep(accessToken: string, limit = 7) {
  const data = await whoopFetch(`/v2/activity/sleep?limit=${limit}`, accessToken);
  return data.records || [];
}

export async function fetchWhoopWorkouts(accessToken: string, limit = 7) {
  const data = await whoopFetch(`/v2/activity/workout?limit=${limit}`, accessToken);
  return data.records || [];
}

export async function fetchWhoopCycles(accessToken: string, limit = 7) {
  const data = await whoopFetch(`/v2/cycle?limit=${limit}`, accessToken);
  return data.records || [];
}

function getRecoveryColor(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 67) return 'green';
  if (score >= 34) return 'yellow';
  return 'red';
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

// Transform raw WHOOP API responses into our app's WhoopData format
export function transformWhoopData(
  recoveryRecords: any[],
  sleepRecords: any[],
  cycleRecords: any[]
): WhoopData {
  // Latest recovery is "today"
  const latest = recoveryRecords[0];
  const todayScore = latest?.score?.recovery_score ?? 0;
  const todayColor = getRecoveryColor(todayScore);

  const today = {
    recovery_score: Math.round(todayScore),
    color: todayColor,
    resting_hr: Math.round(latest?.score?.resting_heart_rate ?? 0),
    hrv: Math.round(latest?.score?.hrv_rmssd_milli ?? 0),
    spo2: Math.round(latest?.score?.spo2_percentage ?? 97),
    skin_temp: parseFloat((latest?.score?.skin_temp_celsius ?? 33.0).toFixed(1)),
  };

  // v2 API uses cycle.start for timestamps; fall back to created_at

  const recovery = recoveryRecords.map((r: any) => ({
    date: formatDate(r.cycle?.start || r.created_at || new Date().toISOString()),
    score: Math.round(r.score?.recovery_score ?? 0),
    color: getRecoveryColor(r.score?.recovery_score ?? 0),
  })).reverse();

  const sleep = sleepRecords.map((s: any) => {
    const stages = s.score?.stage_summary || {};
    const totalMs = stages.total_in_bed_time_milli || 0;
    const toHrs = (ms: number) => parseFloat((ms / 3600000).toFixed(1));
    return {
      date: formatDate(s.start || s.created_at || new Date().toISOString()),
      total: toHrs(totalMs),
      deep: toHrs(stages.total_slow_wave_sleep_time_milli || 0),
      rem: toHrs(stages.total_rem_sleep_time_milli || 0),
      light: toHrs(stages.total_light_sleep_time_milli || 0),
      efficiency: Math.round(s.score?.sleep_efficiency_percentage ?? 0),
    };
  }).reverse();

  const strain = cycleRecords.map((c: any) => ({
    date: formatDate(c.start || c.created_at || new Date().toISOString()),
    strain: parseFloat((c.score?.strain ?? 0).toFixed(1)),
    avg_hr: Math.round(c.score?.average_heart_rate ?? 0),
    max_hr: Math.round(c.score?.max_heart_rate ?? 0),
  })).reverse();

  return { today, recovery, sleep, strain };
}
