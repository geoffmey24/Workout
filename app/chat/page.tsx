'use client';

import { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import MaterialIcon from '@/components/MaterialIcon';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import LoadingDots from '@/components/LoadingDots';
import { Message, ContentBlock, ApiMessage } from '@/types';
import {
  getConversations,
  saveConversation,
  deleteConversation,
  StoredConversation,
  StoredMessage,
  migrateOldData,
} from '@/lib/simple-storage';
import { getSystemPrompt } from '@/lib/system-prompt';

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

  const [convoId, setConvoId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    migrateOldData();
    const loaded = getConversations();
    console.log('[ChatPage] loaded', loaded.length, 'conversations');
    setConversations(loaded);
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    const title = messages.find(m => m.role === 'user')?.content.slice(0, 50) || 'New Chat';

    const storedMessages: StoredMessage[] = messages.map(m => ({
      role: m.role,
      content: m.content,
      image: m.image,
      imageType: m.imageType,
    }));

    const updated: StoredConversation = {
      id: convoId,
      title,
      messages: storedMessages,
      updatedAt: Date.now(),
    };
    saveConversation(updated);
    setConversations(getConversations());
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
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const allMessages = [...messages, userMessage];
      const apiMessages: ApiMessage[] = allMessages.map(msg => {
        if (msg.role === 'user' && msg.image) {
          const blocks: ContentBlock[] = [
            { type: 'image', source: { type: 'base64', media_type: msg.imageType || 'image/jpeg', data: msg.image } },
            { type: 'text', text: msg.content },
          ];
          return { role: 'user' as const, content: blocks };
        }
        return { role: msg.role, content: msg.content };
      });

      const placeholderIdx = allMessages.length;
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, stream: true, systemPrompt: getSystemPrompt() }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

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
            const { text: chunk } = JSON.parse(jsonStr);
            if (chunk) {
              fullText += chunk;
              setMessages(prev => {
                const updated = [...prev];
                updated[placeholderIdx] = { role: 'assistant', content: fullText };
                return updated;
              });
            }
          } catch { /* skip */ }
        }
      }

      if (!fullText) throw new Error('Empty response');
      setMessages(prev => {
        const updated = [...prev];
        updated[placeholderIdx] = { role: 'assistant', content: fullText };
        return updated;
      });
    } catch (err) {
      console.error(err);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.content) {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: "I'm having trouble connecting right now. Please check your API key and try again." };
          return updated;
        }
        return [...prev, { role: 'assistant', content: "I'm having trouble connecting right now. Please check your API key and try again." }];
      });
    } finally {
      setLoading(false);
    }
  }, [messages]);

  const startNewChat = () => {
    setConvoId(crypto.randomUUID());
    setMessages([]);
    setHistoryOpen(false);
  };

  const loadConversation = (c: StoredConversation) => {
    setConvoId(c.id);
    setMessages(c.messages);
    setHistoryOpen(false);
  };

  const handleDeleteConvo = (id: string) => {
    deleteConversation(id);
    setConversations(getConversations());
    if (id === convoId) startNewChat();
  };

  return (
    <div className="flex flex-col h-screen bg-surface">
      {/* Header — glass morphism */}
      <div className="fixed top-0 w-full z-50 h-16 bg-slate-50/80 backdrop-blur-md flex items-center gap-3 px-4 border-b border-outline-variant/10">
        <Link href="/" className="text-secondary hover:text-on-surface">
          <MaterialIcon icon="arrow_back" size={20} />
        </Link>
        <div>
          <h1 className="font-bold text-sm font-headline text-on-surface">ELITE <span className="text-primary">COACH</span></h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={startNewChat} className="p-1.5 rounded-xl bg-surface-container-low text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors" title="New Chat">
            <MaterialIcon icon="add" size={16} />
          </button>
          <button onClick={() => setHistoryOpen(!historyOpen)} className="text-xs text-primary font-medium font-label">{historyOpen ? 'Close' : `History (${conversations.length})`}</button>
          <Link href="/settings" className="text-secondary hover:text-on-surface">
            <MaterialIcon icon="settings" size={16} />
          </Link>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-16" />

      {/* History Panel */}
      {historyOpen && (
        <div className="border-b border-outline-variant/10 bg-surface-container-lowest px-4 py-3 max-h-48 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="text-xs text-secondary text-center py-2">No past conversations</p>
          ) : conversations.map(c => (
            <div key={c.id} className={`flex items-center gap-2 py-1.5 ${c.id === convoId ? 'text-primary' : 'text-secondary'}`}>
              <button onClick={() => loadConversation(c)} className="flex-1 text-left text-xs truncate hover:text-on-surface">{c.title}</button>
              <button onClick={() => handleDeleteConvo(c.id)} className="text-on-surface-variant hover:text-red-500 p-0.5">
                <MaterialIcon icon="delete" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-lg font-bold font-headline mb-2 text-on-surface">ELITE <span className="text-primary">COACH</span></h2>
            <p className="text-sm text-secondary mb-6 max-w-xs">Ask about training, nutrition, recovery, form — or upload a photo for analysis.</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => handleSend(s)} className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs text-secondary hover:border-primary/50 hover:text-primary transition-colors">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => <ChatMessage key={i} message={msg} />)}
        {loading && <LoadingDots />}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-secondary">Loading...</div>}>
      <ChatPageInner />
    </Suspense>
  );
}
