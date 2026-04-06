import { NextRequest, NextResponse } from 'next/server';
import { SYSTEM_PROMPT } from '@/lib/system-prompt';
import { ApiMessage } from '@/types';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import {
  getClientIp, verifyOrigin, rateLimitResponse,
  parseJsonBody, sanitizeMessageContent, errorResponse,
} from '@/lib/security';

const MAX_MESSAGES = 100;
const MAX_MESSAGE_LENGTH = 50_000;
const MAX_SYSTEM_PROMPT_LENGTH = 10_000;

function validateMessages(messages: unknown): messages is ApiMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) return false;
  if (messages.length > MAX_MESSAGES) return false;
  for (const msg of messages) {
    if (typeof msg !== 'object' || msg === null) return false;
    const m = msg as Record<string, unknown>;
    if (m.role !== 'user' && m.role !== 'assistant') return false;
    if (typeof m.content === 'string') {
      if (m.content.length > MAX_MESSAGE_LENGTH) return false;
    } else if (Array.isArray(m.content)) {
      for (const block of m.content) {
        if (typeof block !== 'object' || block === null) return false;
        const b = block as Record<string, unknown>;
        if (b.type === 'text' && typeof b.text === 'string' && b.text.length > MAX_MESSAGE_LENGTH) return false;
      }
    } else {
      return false;
    }
  }
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Origin check
    if (!verifyOrigin(req)) {
      return errorResponse(403, 'Forbidden');
    }

    // 2. Rate limiting
    const ip = getClientIp(req);
    const rl = checkRateLimit(ip, RATE_LIMITS.chat);
    if (!rl.allowed) {
      return rateLimitResponse(rl);
    }

    // 3. Parse and validate body
    const { data, error: parseError } = await parseJsonBody(req);
    if (parseError || !data) {
      return errorResponse(400, parseError || 'Invalid request');
    }

    const body = data as Record<string, unknown>;

    // 4. Validate API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return errorResponse(500);
    }

    // 5. Validate messages
    if (!validateMessages(body.messages)) {
      return errorResponse(400, 'Invalid messages format');
    }

    // 6. Validate optional fields
    const stream = typeof body.stream === 'boolean' ? body.stream : false;
    let systemPrompt = SYSTEM_PROMPT;
    if (typeof body.systemPrompt === 'string') {
      if (body.systemPrompt.length > MAX_SYSTEM_PROMPT_LENGTH) {
        return errorResponse(400, 'System prompt too long');
      }
      systemPrompt = body.systemPrompt;
    }

    // 7. Sanitize message content
    const sanitizedMessages = (body.messages as ApiMessage[]).map(msg => ({
      ...msg,
      content: sanitizeMessageContent(msg.content),
    }));

    // 8. Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: sanitizedMessages,
        stream,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      return errorResponse(response.status >= 500 ? 502 : response.status);
    }

    // Non-streaming response
    if (!stream) {
      const responseData = await response.json();
      const text = responseData.content
        ?.filter((block: { type: string }) => block.type === 'text')
        .map((block: { text: string }) => block.text)
        .join('');
      return NextResponse.json({ response: text });
    }

    // Streaming response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') continue;

              try {
                const event = JSON.parse(jsonStr);
                if (event.type === 'content_block_delta' && event.delta?.text) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
                }
              } catch {
                // skip malformed JSON
              }
            }
          }
        } catch (err) {
          console.error('Stream read error:', err);
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Chat API error:', err);
    return errorResponse(500);
  }
}
