import { NextRequest, NextResponse } from 'next/server';
import { exchangeOuraCodeForToken } from '@/lib/oura-api';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const storedState = req.cookies.get('oura_oauth_state')?.value;

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(new URL('/whoop?error=oura_auth_failed', req.url));
  }

  try {
    const tokens = await exchangeOuraCodeForToken(code);

    const response = NextResponse.redirect(new URL('/whoop?connected=oura', req.url));
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
    response.cookies.delete('oura_oauth_state');
    return response;
  } catch (error) {
    console.error('Oura OAuth error:', error);
    return NextResponse.redirect(new URL('/whoop?error=oura_token_failed', req.url));
  }
}
