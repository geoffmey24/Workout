import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RateLimitResult } from './rate-limit';

// ── Request Verification ─────────────────────────────────

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
].filter(Boolean) as string[];

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function verifyOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  // Allow requests with no origin (same-origin, server-side, curl in dev)
  if (!origin && !referer) return true;

  // Check origin
  if (origin) {
    if (ALLOWED_ORIGINS.some(o => o && origin.startsWith(o))) return true;
    // Allow same-host
    const reqHost = req.headers.get('host');
    try {
      const originHost = new URL(origin).host;
      if (reqHost && originHost === reqHost) return true;
    } catch { /* invalid origin */ }
    return false;
  }

  // Check referer as fallback
  if (referer) {
    if (ALLOWED_ORIGINS.some(o => o && referer.startsWith(o))) return true;
    const reqHost = req.headers.get('host');
    try {
      const refHost = new URL(referer).host;
      if (reqHost && refHost === reqHost) return true;
    } catch { /* invalid referer */ }
  }

  return true; // Allow if neither origin nor referer — don't block legitimate requests
}

// ── Rate Limit Response ──────────────────────────────────

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please wait and try again.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds),
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}

// ── Input Sanitization ───────────────────────────────────

export function sanitizeString(input: string): string {
  return input
    .replace(/<\s*\/?\s*script\b[^>]*>/gi, '') // Strip script tags
    .replace(/<\s*\/?\s*iframe\b[^>]*>/gi, '')  // Strip iframe tags
    .replace(/<\s*\/?\s*object\b[^>]*>/gi, '')  // Strip object tags
    .replace(/<\s*\/?\s*embed\b[^>]*>/gi, '')   // Strip embed tags
    .replace(/<\s*\/?\s*form\b[^>]*>/gi, '');   // Strip form tags
}

export function sanitizeMessageContent(content: string | unknown[]): string | unknown[] {
  if (typeof content === 'string') {
    return sanitizeString(content);
  }
  if (Array.isArray(content)) {
    return content.map(block => {
      if (typeof block === 'object' && block !== null) {
        const b = block as Record<string, unknown>;
        if (b.type === 'text' && typeof b.text === 'string') {
          return { ...b, text: sanitizeString(b.text) };
        }
      }
      return block;
    });
  }
  return content;
}

// ── Validate JSON POST body ──────────────────────────────

export async function parseJsonBody(req: NextRequest, maxSizeBytes = 1_048_576): Promise<{ data: unknown; error?: string }> {
  const contentType = req.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return { data: null, error: 'Content-Type must be application/json' };
  }

  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > maxSizeBytes) {
    return { data: null, error: 'Request body too large' };
  }

  try {
    const data = await req.json();
    return { data };
  } catch {
    return { data: null, error: 'Invalid JSON body' };
  }
}

// ── Standard Error Responses ─────────────────────────────

export function errorResponse(status: number, message?: string): NextResponse {
  const messages: Record<number, string> = {
    400: 'Invalid request',
    401: 'Unauthorized',
    403: 'Forbidden',
    429: 'Too many requests',
    500: 'Something went wrong',
  };
  return NextResponse.json(
    { error: message || messages[status] || 'Something went wrong' },
    { status }
  );
}
