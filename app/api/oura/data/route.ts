import { NextRequest, NextResponse } from 'next/server';
import {
  fetchOuraReadiness,
  fetchOuraSleep,
  fetchOuraActivity,
  transformOuraData,
  refreshOuraToken,
} from '@/lib/oura-api';

export async function GET(req: NextRequest) {
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
    const [readiness, sleep, activity] = await Promise.all([
      fetchOuraReadiness(accessToken!),
      fetchOuraSleep(accessToken!),
      fetchOuraActivity(accessToken!),
    ]);

    const data = transformOuraData(
      readiness.data || [],
      sleep.data || [],
      activity.data || []
    );
    return NextResponse.json({ data, source: 'live' });
  } catch (error) {
    console.error('Oura data fetch error:', error);
    return NextResponse.json({ data: null, source: 'none', error: 'fetch_failed' });
  }
}
