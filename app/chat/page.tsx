'use client';

import { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import ChatHistory from '@/components/ChatHistory';
import LoadingDots from '@/components/LoadingDots';
import { Message, ContentBlock, ApiMessage } from '@/types';
import {
  Conversation,
  saveConversation,
  generateTitle,
  createConversation,
} from '@/lib/chat-history';

const SUGGESTIONS = [
  'How should I bench press?',
  'I have knee pain during squats',
  'What should I eat post-workout?',
  'Best warm-up for deadlifts?',
  'How much protein do I need?',
  'Help me fix my squat depth',
];

function ChatPageInner() {
  const searchParams = useSearchParams();
  const topic = searchParams.get('topic');

  const [convo, setConvo] = useState<Conversation>(createConversation);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (messages.length > 0) {
      const updated = {
        ...convo,
        messages,
        title: generateTitle(messages),
        updatedAt: Date.now(),
      };
      setConvo(updated);
      saveConversation(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    if (topic && messages.length === 0) {
      handleSend(topic);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  const handleSend = useCallback(async (text: string, image?: string, imageType?: string) => {
    const userMessage: Message = { role: 'user', content: text, image, imageType };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const allMessages = [...messages, userMessage];
      const apiMessages: ApiMessage[] = allMessages.map((msg) => {
        if (msg.role === 'user' && msg.image) {
          const blocks: ContentBlock[] = [
            { type: 'image', source: { type: 'base64', media_type: msg.imageType || 'image/jpeg', data: msg.image } },
            { type: 'text', text: msg.content },
          ];
          return { role: 'user' as const, content: blocks };
        }
        return { role: msg.role, content: msg.content };
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
  }, [messages]);

  const startNewChat = () => {
    setConvo(createConversation());
    setMessages([]);
  };

  const loadConversation = (c: Conversation) => {
    setConvo(c);
    setMessages(c.messages);
  };

  return (
    <div className="flex flex-col h-screen bg-[#f8f9fa]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3">
        <Link href="/" className="text-[#6b7280] hover:text-[#111827]">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-bold text-sm text-[#111827]">
            ELITE <span className="text-blue-600">COACH</span>
          </h1>
          <p className="text-xs text-[#6b7280]">AI Performance Coach</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={startNewChat}
            className="p-1.5 rounded-lg bg-gray-100 text-[#6b7280] hover:text-[#111827] hover:bg-gray-200 transition-colors"
            title="New Chat"
          >
            <Plus size={16} />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-600">Online</span>
          </div>
        </div>
      </div>

      <ChatHistory
        activeId={convo.id}
        onSelect={loadConversation}
        onNew={startNewChat}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-4">🏋️</div>
            <h2 className="text-lg font-bold mb-2 text-[#111827]">
              ELITE <span className="text-blue-600">COACH</span>
            </h2>
            <p className="text-sm text-[#6b7280] mb-6 max-w-xs">
              Your AI performance coach. Ask about training, nutrition, recovery, form — or upload a photo for analysis.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs text-[#6b7280] hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm"
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

      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-[#6b7280]">Loading...</div>}>
      <ChatPageInner />
    </Suspense>
  );
}
