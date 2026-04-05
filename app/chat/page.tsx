'use client';

import { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Settings } from 'lucide-react';
import Link from 'next/link';
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

  // Migrate old data and load conversations on mount
  useEffect(() => {
    migrateOldData();
    const loaded = getConversations();
    console.log('[ChatPage] loaded', loaded.length, 'conversations');
    setConversations(loaded);
  }, []);

  // Save conversation after every message change
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
    <div className="flex flex-col h-screen bg-[#0f1219]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#2a2d35] bg-[#1a1d24] px-4 py-3">
        <Link href="/" className="text-[#9ca3af] hover:text-white"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="font-bold text-sm text-white">ELITE <span className="text-[#a5b4fc]">COACH</span></h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={startNewChat} className="p-1.5 rounded-lg bg-[#22252d] text-[#9ca3af] hover:text-white hover:bg-gray-200 transition-colors" title="New Chat"><Plus size={16} /></button>
          <button onClick={() => setHistoryOpen(!historyOpen)} className="text-xs text-[#a5b4fc] font-medium">{historyOpen ? 'Close' : `History (${conversations.length})`}</button>
          <Link href="/settings" className="text-[#9ca3af] hover:text-white"><Settings size={16} /></Link>
        </div>
      </div>

      {/* History Panel */}
      {historyOpen && (
        <div className="border-b border-[#2a2d35] bg-[#1a1d24] px-4 py-3 max-h-48 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="text-xs text-[#6b7280] text-center py-2">No past conversations</p>
          ) : conversations.map(c => (
            <div key={c.id} className={`flex items-center gap-2 py-1.5 ${c.id === convoId ? 'text-[#a5b4fc]' : 'text-[#9ca3af]'}`}>
              <button onClick={() => loadConversation(c)} className="flex-1 text-left text-xs truncate hover:text-white">{c.title}</button>
              <button onClick={() => handleDeleteConvo(c.id)} className="text-[#6b7280] hover:text-[#ef4444] p-0.5"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-lg font-bold mb-2 text-white">ELITE <span className="text-[#a5b4fc]">COACH</span></h2>
            <p className="text-sm text-[#9ca3af] mb-6 max-w-xs">Ask about training, nutrition, recovery, form — or upload a photo for analysis.</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => handleSend(s)} className="rounded-full border border-[#2a2d35] bg-[#1a1d24] px-3 py-1.5 text-xs text-[#9ca3af] hover:border-[#a5b4fc]/50 hover:text-[#a5b4fc] transition-colors">{s}</button>
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
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-[#9ca3af]">Loading...</div>}>
      <ChatPageInner />
    </Suspense>
  );
}
