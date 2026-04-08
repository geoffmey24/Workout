import { NextRequest, NextResponse } from 'next/server';
import { exchangeOuraCodeForToken } from '@/lib/oura-api';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');
    const storedState = req.cookies.get('oura_oauth_state')?.value;

    if (!code || !state || state !== storedState) {
      return NextResponse.redirect(new URL('/connect-error', req.url));
    }

    const tokens = await exchangeOuraCodeForToken(code);

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: Record<string, unknown>) { try { cookieStore.set({ name, value, ...options }); } catch {} },
          remove(name: string, options: Record<string, unknown>) { try { cookieStore.set({ name, value: '', ...options }); } catch {} },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
      await supabase.from('health_connections').upsert({
        user_id: user.id,
        provider: 'oura',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
      });
    }

    const response = NextResponse.redirect(new URL('/whoop?connected=oura', req.url));
    response.cookies.delete('oura_oauth_state');
    return response;
  } catch (error) {
    console.error('Oura OAuth error:', error);
    return NextResponse.redirect(new URL('/connect-error', req.url));
  }
}
