import { WhoopData } from '@/types';

const isSandbox = process.env.OURA_SANDBOX === 'true';
const ouraApiHost = isSandbox ? 'https://sandbox.api.ouraring.com' : 'https://api.ouraring.com';

export const OURA_CONFIG = {
  clientId: process.env.OURA_CLIENT_ID || '',
  clientSecret: process.env.OURA_CLIENT_SECRET || '',
  redirectUri: process.env.OURA_REDIRECT_URI || 'http://localhost:3000/api/oura/callback',
  authUrl: 'https://cloud.ouraring.com/oauth/authorize',
  tokenUrl: `${ouraApiHost}/oauth/token`,
  apiBase: `${ouraApiHost}/v2`,
  sandbox: isSandbox,
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

export async function fetchOuraDailySleep(accessToken: string) {
  const { start, end } = getDateRange(7);
  return ouraFetch(`/usercollection/daily_sleep?start_date=${start}&end_date=${end}`, accessToken);
}

// Raw sleep endpoint — returns exact sleep stage durations in seconds
export async function fetchOuraSleepSessions(accessToken: string) {
  const { start, end } = getDateRange(7);
  return ouraFetch(`/usercollection/sleep?start_date=${start}&end_date=${end}`, accessToken);
}

export async function fetchOuraActivity(accessToken: string) {
  const { start, end } = getDateRange(7);
  return ouraFetch(`/usercollection/daily_activity?start_date=${start}&end_date=${end}`, accessToken);
}

export async function fetchOuraHeartRate(accessToken: string) {
  const { start, end } = getDateRange(1);
  return ouraFetch(`/usercollection/heartrate?start_date=${start}&end_date=${end}`, accessToken);
}

export async function fetchOuraSpO2(accessToken: string) {
  const { start, end } = getDateRange(7);
  return ouraFetch(`/usercollection/daily_spo2?start_date=${start}&end_date=${end}`, accessToken);
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
  sleepSessions: any[],
  activityRecords: any[],
  spo2Records: any[] = [],
  heartRateRecords: any[] = []
): WhoopData {
  const latest = readinessRecords[readinessRecords.length - 1];
  const todayScore = latest?.score ?? 0;
  const todayColor = getRecoveryColor(todayScore);

  // Get real SpO2 from Oura's daily_spo2 endpoint
  const latestSpo2 = spo2Records[spo2Records.length - 1];
  const spo2Value = latestSpo2?.spo2_percentage?.average ?? 0;

  // Get resting HR from heart rate data (lowest bpm in recent readings)
  let restingHr = Math.round(latest?.contributors?.resting_heart_rate ?? 0);
  if (heartRateRecords.length > 0) {
    const bpmValues = heartRateRecords.map((hr: any) => hr.bpm).filter(Boolean);
    if (bpmValues.length > 0) {
      // Use the 10th percentile as resting HR approximation
      bpmValues.sort((a: number, b: number) => a - b);
      restingHr = bpmValues[Math.floor(bpmValues.length * 0.1)] || restingHr;
    }
  }

  const today = {
    recovery_score: todayScore,
    color: todayColor,
    resting_hr: restingHr,
    hrv: Math.round(latest?.contributors?.hrv_balance ?? 0),
    spo2: spo2Value > 0 ? Math.round(spo2Value) : 0,
    skin_temp: parseFloat((latest?.contributors?.body_temperature ?? 33.0).toFixed(1)),
  };

  const recovery = readinessRecords.map((r: any) => ({
    date: formatDate(r.day),
    score: r.score ?? 0,
    color: getRecoveryColor(r.score ?? 0),
  }));

  // Use raw sleep sessions for exact stage durations (in seconds)
  // Group sessions by day, take the longest (primary) session per day
  const sessionsByDay = new Map<string, any>();
  for (const s of sleepSessions) {
    const day = s.day;
    if (!day) continue;
    const existing = sessionsByDay.get(day);
    if (!existing || (s.total_sleep_duration ?? 0) > (existing.total_sleep_duration ?? 0)) {
      sessionsByDay.set(day, s);
    }
  }

  const sleep = Array.from(sessionsByDay.entries()).map(([day, s]) => {
    const toHrs = (sec: number) => parseFloat((sec / 3600).toFixed(1));
    const deepSec = s.deep_sleep_duration ?? 0;
    const remSec = s.rem_sleep_duration ?? 0;
    const lightSec = s.light_sleep_duration ?? 0;
    const totalSec = s.total_sleep_duration ?? (deepSec + remSec + lightSec);
    return {
      date: formatDate(day),
      total: toHrs(totalSec),
      deep: toHrs(deepSec),
      rem: toHrs(remSec),
      light: toHrs(lightSec),
      efficiency: s.efficiency ?? 0,
    };
  });

  // Compute avg/max HR from heart rate data per day
  const hrByDay = new Map<string, number[]>();
  for (const hr of heartRateRecords) {
    if (!hr.timestamp || !hr.bpm) continue;
    const day = hr.timestamp.slice(0, 10);
    if (!hrByDay.has(day)) hrByDay.set(day, []);
    hrByDay.get(day)!.push(hr.bpm);
  }

  const strain = activityRecords.map((a: any) => {
    const day = a.day;
    const dayHr = hrByDay.get(day) || [];
    const avgHr = dayHr.length > 0 ? Math.round(dayHr.reduce((s: number, v: number) => s + v, 0) / dayHr.length) : 0;
    const maxHr = dayHr.length > 0 ? Math.max(...dayHr) : 0;
    return {
      date: formatDate(day),
      strain: parseFloat(((a.score ?? 0) / 5).toFixed(1)), // Normalize to ~0-21 range
      avg_hr: avgHr,
      max_hr: maxHr,
    };
  });

  return { today, recovery, sleep, strain };
}
