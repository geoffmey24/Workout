import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { getClientIp, verifyOrigin, rateLimitResponse, errorResponse } from '@/lib/security';

export async function POST(req: NextRequest) {
  if (!verifyOrigin(req)) return errorResponse(403);
  const rl = checkRateLimit(getClientIp(req), RATE_LIMITS.health);
  if (!rl.allowed) return rateLimitResponse(rl);

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
  if (user) {
    await supabase.from('health_connections').delete().eq('user_id', user.id).eq('provider', 'whoop');
  }

  return NextResponse.json({ success: true });
}
