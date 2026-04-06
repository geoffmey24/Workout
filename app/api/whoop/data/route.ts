import { NextRequest, NextResponse } from 'next/server';
import {
  fetchWhoopRecovery,
  fetchWhoopSleep,
  fetchWhoopCycles,
  transformWhoopData,
  refreshAccessToken,
} from '@/lib/whoop-api';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { getClientIp, verifyOrigin, rateLimitResponse, errorResponse } from '@/lib/security';

export async function GET(req: NextRequest) {
  if (!verifyOrigin(req)) return errorResponse(403);
  const rl = checkRateLimit(getClientIp(req), RATE_LIMITS.health);
  if (!rl.allowed) return rateLimitResponse(rl);

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

  // Get tokens from database
  const { data: conn } = await supabase
    .from('health_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'whoop')
    .single();

  if (!conn) {
    return NextResponse.json({ data: null, source: 'none' });
  }

  let accessToken = conn.access_token;

  // Check if token expired, refresh if needed
  if (conn.expires_at && new Date(conn.expires_at) < new Date() && conn.refresh_token) {
    try {
      const tokens = await refreshAccessToken(conn.refresh_token);
      accessToken = tokens.access_token;
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
      await supabase.from('health_connections').update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
      }).eq('user_id', user.id).eq('provider', 'whoop');
    } catch {
      return NextResponse.json({ data: null, source: 'none', error: 'refresh_failed' });
    }
  }

  try {
    const [recovery, sleep, cycles] = await Promise.all([
      fetchWhoopRecovery(accessToken),
      fetchWhoopSleep(accessToken),
      fetchWhoopCycles(accessToken),
    ]);
    const data = transformWhoopData(recovery, sleep, cycles);
    return NextResponse.json({ data, source: 'live' });
  } catch (error) {
    console.error('WHOOP data fetch error:', error);
    return NextResponse.json({ data: null, source: 'none', error: 'fetch_failed' });
  }
}
