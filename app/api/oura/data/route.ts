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
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  // Get user from Supabase
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: any) { try { cookieStore.set({ name, value, ...options }); } catch {} },
        remove(name: string, options: any) { try { cookieStore.set({ name, value: '', ...options }); } catch {} },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ data: null, source: 'none' });
  }

  const { data: conn } = await supabase
    .from('health_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'oura')
    .single();

  if (!conn) {
    return NextResponse.json({ data: null, source: 'none' });
  }

  let accessToken = conn.access_token;

  // Refresh if expired
  if (conn.expires_at && new Date(conn.expires_at) < new Date() && conn.refresh_token) {
    try {
      const tokens = await refreshOuraToken(conn.refresh_token);
      accessToken = tokens.access_token;
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
      await supabase.from('health_connections').update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
      }).eq('user_id', user.id).eq('provider', 'oura');
    } catch {
      return NextResponse.json({ data: null, source: 'none', error: 'refresh_failed' });
    }
  }

  try {
    const [readiness, sleepSessions, activity, heartRate, spo2] = await Promise.all([
      fetchOuraReadiness(accessToken),
      fetchOuraSleepSessions(accessToken),
      fetchOuraActivity(accessToken),
      fetchOuraHeartRate(accessToken).catch(() => ({ data: [] })),
      fetchOuraSpO2(accessToken).catch(() => ({ data: [] })),
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
