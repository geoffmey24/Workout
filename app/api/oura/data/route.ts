import { NextRequest, NextResponse } from 'next/server';
import {
  fetchOuraReadiness,
  fetchOuraSleepSessions,
  fetchOuraActivity,
  fetchOuraHeartRate,
  fetchOuraSpO2,
  transformOuraData,
  refreshOuraToken,
  OURA_CONFIG,
} from '@/lib/oura-api';
import { OURA_SANDBOX_DATA } from '@/lib/oura-sandbox-data';

export async function GET(req: NextRequest) {
  // Sandbox mode: return realistic sample data when no credentials configured
  const useSandbox = process.env.OURA_SANDBOX === 'true' && !OURA_CONFIG.clientId;
  if (useSandbox) {
    return NextResponse.json({ data: OURA_SANDBOX_DATA, source: 'sandbox' });
  }

  let accessToken = req.cookies.get('oura_access_token')?.value;
  const refreshToken = req.cookies.get('oura_refresh_token')?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.json({ data: null, source: 'none' });
  }

  if (!accessToken && refreshToken) {
    try {
      const tokens = await refreshOuraToken(refreshToken);
      accessToken = tokens.access_token;

      const response = NextResponse.json({ data: null, source: 'refreshing' });
      response.cookies.set('oura_access_token', tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: tokens.expires_in,
      });
      response.cookies.set('oura_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 3600,
      });
    } catch {
      return NextResponse.json({ data: null, source: 'none', error: 'refresh_failed' });
    }
  }

  try {
    const [readiness, sleepSessions, activity, heartRate, spo2] = await Promise.all([
      fetchOuraReadiness(accessToken!),
      fetchOuraSleepSessions(accessToken!),
      fetchOuraActivity(accessToken!),
      fetchOuraHeartRate(accessToken!).catch(() => ({ data: [] })),
      fetchOuraSpO2(accessToken!).catch(() => ({ data: [] })),
    ]);

    const data = transformOuraData(
      readiness.data || [],
      sleepSessions.data || [],
      activity.data || [],
      spo2.data || [],
      heartRate.data || []
    );
    return NextResponse.json({ data, source: 'live' });
  } catch (error) {
    console.error('Oura data fetch error:', error);
    return NextResponse.json({ data: null, source: 'none', error: 'fetch_failed' });
  }
}
