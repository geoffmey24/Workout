import { NextResponse } from 'next/server';
import { getOuraAuthorizationUrl } from '@/lib/oura-api';
import crypto from 'crypto';

export async function GET() {
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
}
