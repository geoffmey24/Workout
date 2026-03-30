import { NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/whoop-api';
import crypto from 'crypto';

export async function GET() {
  const state = crypto.randomBytes(16).toString('hex');
  const authUrl = getAuthorizationUrl(state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('whoop_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });
  return response;
}
