import { WhoopData } from '@/types';

export const OURA_CONFIG = {
  clientId: process.env.OURA_CLIENT_ID || '',
  clientSecret: process.env.OURA_CLIENT_SECRET || '',
  redirectUri: process.env.OURA_REDIRECT_URI || 'http://localhost:3000/api/oura/callback',
  authUrl: 'https://cloud.ouraring.com/oauth/authorize',
  tokenUrl: 'https://api.ouraring.com/oauth/token',
  apiBase: 'https://api.ouraring.com/v2',
};

export function getOuraAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: OURA_CONFIG.clientId,
    redirect_uri: OURA_CONFIG.redirectUri,
    response_type: 'code',
    scope: 'daily heartrate personal sleep workout',
    state,
  });
  return `${OURA_CONFIG.authUrl}?${params.toString()}`;
}

export async function exchangeOuraCodeForToken(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch(OURA_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: OURA_CONFIG.clientId,
      client_secret: OURA_CONFIG.clientSecret,
      redirect_uri: OURA_CONFIG.redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Oura token exchange failed: ${res.status}`);
  return res.json();
}

export async function refreshOuraToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch(OURA_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: OURA_CONFIG.clientId,
      client_secret: OURA_CONFIG.clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`Oura token refresh failed: ${res.status}`);
  return res.json();
}

async function ouraFetch(endpoint: string, accessToken: string) {
  const res = await fetch(`${OURA_CONFIG.apiBase}${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Oura API error: ${res.status}`);
  return res.json();
}

function getDateRange(days: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export async function fetchOuraReadiness(accessToken: string) {
  const { start, end } = getDateRange(7);
  return ouraFetch(`/usercollection/daily_readiness?start_date=${start}&end_date=${end}`, accessToken);
}

export async function fetchOuraSleep(accessToken: string) {
  const { start, end } = getDateRange(7);
  return ouraFetch(`/usercollection/daily_sleep?start_date=${start}&end_date=${end}`, accessToken);
}

export async function fetchOuraActivity(accessToken: string) {
  const { start, end } = getDateRange(7);
  return ouraFetch(`/usercollection/daily_activity?start_date=${start}&end_date=${end}`, accessToken);
}

export async function fetchOuraHeartRate(accessToken: string) {
  const { start, end } = getDateRange(1);
  return ouraFetch(`/usercollection/heartrate?start_date=${start}&end_date=${end}`, accessToken);
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

export function transformOuraData(
  readinessRecords: any[],
  sleepRecords: any[],
  activityRecords: any[]
): WhoopData {
  const latest = readinessRecords[readinessRecords.length - 1];
  const todayScore = latest?.score ?? 0;
  const todayColor = getRecoveryColor(todayScore);

  const today = {
    recovery_score: todayScore,
    color: todayColor,
    resting_hr: Math.round(latest?.contributors?.resting_heart_rate ?? 0),
    hrv: Math.round(latest?.contributors?.hrv_balance ?? 0),
    spo2: 97, // Oura Gen3 reports SpO2 in separate endpoint
    skin_temp: parseFloat((latest?.contributors?.body_temperature ?? 33.0).toFixed(1)),
  };

  const recovery = readinessRecords.map((r: any) => ({
    date: formatDate(r.day),
    score: r.score ?? 0,
    color: getRecoveryColor(r.score ?? 0),
  }));

  const sleep = sleepRecords.map((s: any) => {
    const total = (s.contributors?.total_sleep ?? 28800) / 3600;
    return {
      date: formatDate(s.day),
      total: parseFloat(total.toFixed(1)),
      deep: parseFloat(((s.contributors?.deep_sleep ?? 0) / 100 * total).toFixed(1)),
      rem: parseFloat(((s.contributors?.rem_sleep ?? 0) / 100 * total).toFixed(1)),
      light: parseFloat(((100 - (s.contributors?.deep_sleep ?? 0) - (s.contributors?.rem_sleep ?? 0)) / 100 * total).toFixed(1)),
      efficiency: s.contributors?.efficiency ?? 85,
    };
  });

  const strain = activityRecords.map((a: any) => ({
    date: formatDate(a.day),
    strain: parseFloat(((a.score ?? 0) / 5).toFixed(1)), // Normalize to ~0-21 range
    avg_hr: 0,
    max_hr: 0,
  }));

  return { today, recovery, sleep, strain };
}
