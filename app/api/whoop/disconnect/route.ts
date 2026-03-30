import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('whoop_access_token');
  response.cookies.delete('whoop_refresh_token');
  return response;
}
