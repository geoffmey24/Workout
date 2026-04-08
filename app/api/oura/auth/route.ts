import { NextRequest, NextResponse } from 'next/server';
import { getOuraAuthorizationUrl, OURA_CONFIG } from '@/lib/oura-api';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    if (!OURA_CONFIG.clientId) {
      return NextResponse.redirect(new URL('/connect-error', request.url));
    }

    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = getOuraAuthorizationUrl(state);

    const response = NextResponse.redirect(authUrl);
    response.cookies.set('oura_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
    });
    return response;
  } catch (error) {
    console.error('Oura auth error:', error);
    return NextResponse.redirect(new URL('/connect-error', request.url));
  }
}
