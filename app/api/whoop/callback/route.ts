import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/whoop-api';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const storedState = req.cookies.get('whoop_oauth_state')?.value;

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(new URL('/whoop?error=auth_failed', req.url));
  }

  try {
    const tokens = await exchangeCodeForToken(code);

    // Store tokens in httpOnly cookies (for MVP; use a DB in production)
    const response = NextResponse.redirect(new URL('/whoop?connected=true', req.url));
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
      maxAge: 30 * 24 * 3600, // 30 days
    });
    response.cookies.delete('whoop_oauth_state');
    return response;
  } catch (error) {
    console.error('WHOOP OAuth error:', error);
    return NextResponse.redirect(new URL('/whoop?error=token_failed', req.url));
  }
}
