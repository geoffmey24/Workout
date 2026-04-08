import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl, WHOOP_CONFIG } from '@/lib/whoop-api';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    if (!WHOOP_CONFIG.clientId) {
      return NextResponse.redirect(new URL('/connect-error', request.url));
    }

    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = getAuthorizationUrl(state);

    const response = NextResponse.redirect(authUrl);
    response.cookies.set('whoop_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
    });
    return response;
  } catch (error) {
    console.error('Whoop auth error:', error);
    return NextResponse.redirect(new URL('/connect-error', request.url));
  }
}
