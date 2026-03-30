'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import LoadingDots from '@/components/LoadingDots';
import Navigation from '@/components/Navigation';
import { Message, ContentBlock, ApiMessage } from '@/types';
import { WORKOUTS, DAYS } from '@/lib/workout-data';
import { MOCK_WHOOP_DATA } from '@/lib/whoop-data';

const SUGGESTIONS = [
  'Check my form on this exercise',
  'I have knee pain during squats',
  'Build me a 4-day program',
  'What should I eat post-workout?',
  'Explain creatine supplementation',
  "Modify today's workout for low recovery",
];

function buildWhoopContext(): string {
  const t = MOCK_WHOOP_DATA.today;
  return `\n\n[WHOOP DATA] Recovery: ${t.recovery_score}% (${t.color}), Resting HR: ${t.resting_hr}, HRV: ${t.hrv}ms, SpO2: ${t.spo2}%, Skin Temp: ${t.skin_temp}°C`;
}

function buildDayContext(dayId: number): string {
  const day = DAYS.find((d) => d.id === dayId);
  const workout = WORKOUTS[dayId];
  if (!day || !workout) return '';
  let ctx = `\n\n[TODAY'S WORKOUT: ${day.name} - ${day.subtitle}]\n`;
  workout.sections.forEach((s) => {
    ctx += `\n${s.title}:\n`;
    s.exercises.forEach((e) => {
      ctx += `- ${e.name}: ${e.sets}x${e.reps} (rest: ${e.rest})\n`;
    });
  });
  return ctx;
}

function ChatPageInner() {
  const searchParams = useSearchParams();
  const topic = searchParams.get('topic');

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-send context message if navigated with a topic
  useEffect(() => {
    if (topic && messages.length === 0) {
      const dayMatch = topic.match(/day(\d+)/);
      if (dayMatch) {
        const dayId = parseInt(dayMatch[1]);
        const day = DAYS.find((d) => d.id === dayId);
        if (day) {
          handleSend(`Let's go through ${day.name}: ${day.subtitle}. Give me a quick overview and any tips based on my recovery.`);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  const handleSend = async (text: string, image?: string, imageType?: string) => {
    const userMessage: Message = { role: 'user', content: text, image, imageType };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      // Build API messages with context
      const contextSuffix = buildWhoopContext() + (topic?.match(/day(\d+)/) ? buildDayContext(parseInt(topic.match(/day(\d+)/)![1])) : '');

      const apiMessages: ApiMessage[] = [...messages, userMessage].map((msg, idx) => {
        if (msg.role === 'user' && msg.image) {
          const blocks: ContentBlock[] = [
            { type: 'image', source: { type: 'base64', media_type: msg.imageType || 'image/jpeg', data: msg.image } },
            { type: 'text', text: msg.content + (idx === messages.length ? contextSuffix : '') },
          ];
          return { role: 'user' as const, content: blocks };
        }
        const content = idx === messages.length ? msg.content + contextSuffix : msg.content;
        return { role: msg.role, content };
      });

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "I'm having trouble connecting right now. Please check your API key in `.env.local` and try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#262626] bg-[#0a0a0a] px-4 py-3">
        <Link href="/" className="text-[#a3a3a3] hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-bold text-sm">
            ELITE <span className="text-red-500">COACH</span>
          </h1>
          <p className="text-xs text-[#a3a3a3]">AI Performance Coach</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-500">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-4">🏋️</div>
            <h2 className="text-lg font-bold mb-2">
              ELITE <span className="text-red-500">COACH</span>
            </h2>
            <p className="text-sm text-[#a3a3a3] mb-6 max-w-xs">
              Your AI performance coach. Ask about training, nutrition, recovery, form — or upload a photo for analysis.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="rounded-full border border-[#262626] bg-[#171717] px-3 py-1.5 text-xs text-[#a3a3a3] hover:border-red-600/50 hover:text-white transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {loading && <LoadingDots />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-[#a3a3a3]">Loading...</div>}>
      <ChatPageInner />
    </Suspense>
  );
}
