import { NextRequest, NextResponse } from 'next/server';
import {
  fetchWhoopRecovery,
  fetchWhoopSleep,
  fetchWhoopCycles,
  transformWhoopData,
  refreshAccessToken,
} from '@/lib/whoop-api';
import { MOCK_WHOOP_DATA } from '@/lib/whoop-data';

export async function GET(req: NextRequest) {
  let accessToken = req.cookies.get('whoop_access_token')?.value;
  const refreshToken = req.cookies.get('whoop_refresh_token')?.value;

  // If no tokens, return mock data with a flag
  if (!accessToken && !refreshToken) {
    return NextResponse.json({ data: MOCK_WHOOP_DATA, source: 'mock' });
  }

  // Try to refresh if access token is missing but refresh token exists
  if (!accessToken && refreshToken) {
    try {
      const tokens = await refreshAccessToken(refreshToken);
      accessToken = tokens.access_token;

      const response = NextResponse.json({ data: null, source: 'live' });
      response.cookies.set('whoop_access_token', tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: tokens.expires_in,
      });
      response.cookies.set('whoop_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 3600,
      });
    } catch {
      return NextResponse.json({ data: MOCK_WHOOP_DATA, source: 'mock', error: 'refresh_failed' });
    }
  }

  try {
    const [recovery, sleep, cycles] = await Promise.all([
      fetchWhoopRecovery(accessToken!),
      fetchWhoopSleep(accessToken!),
      fetchWhoopCycles(accessToken!),
    ]);

    const data = transformWhoopData(recovery, sleep, cycles);
    return NextResponse.json({ data, source: 'live' });
  } catch (error) {
    console.error('WHOOP data fetch error:', error);
    return NextResponse.json({ data: MOCK_WHOOP_DATA, source: 'mock', error: 'fetch_failed' });
  }
}
