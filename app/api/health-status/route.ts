import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    whoop: !!process.env.WHOOP_CLIENT_ID,
    oura: !!process.env.OURA_CLIENT_ID,
  });
}
