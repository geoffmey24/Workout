'use client';

import { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import LoadingDots from '@/components/LoadingDots';
import { Message, ContentBlock, ApiMessage } from '@/types';
import { useAuth } from '@/components/AuthProvider';
import { dbGetConversations, dbSaveConversation, dbDeleteConversation, DbConversation } from '@/lib/db';

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
  const { user } = useAuth();

  const [convoId, setConvoId] = useState(() => crypto.randomUUID());
  const [convoTitle, setConvoTitle] = useState('New Chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load conversations list
  useEffect(() => {
    if (!user) return;
    dbGetConversations(user.id).then(setConversations);
  }, [user]);

  // Auto-save conversation to Supabase
  useEffect(() => {
    if (!user || messages.length === 0) return;
    const title = messages.find(m => m.role === 'user')?.content.slice(0, 50) || 'New Chat';
    setConvoTitle(title);
    dbSaveConversation(user.id, {
      id: convoId,
      title,
      messages,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }).then(() => {
      dbGetConversations(user.id).then(setConversations);
    });
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

      // Add placeholder assistant message for streaming
      const placeholderIdx = allMessages.length;
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, stream: true }),
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
      // Final update to ensure complete text
      setMessages(prev => {
        const updated = [...prev];
        updated[placeholderIdx] = { role: 'assistant', content: fullText };
        return updated;
      });
    } catch (err) {
      console.error(err);
      setMessages(prev => {
        // Replace last message if it's an empty placeholder, otherwise append
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
    setConvoTitle('New Chat');
    setMessages([]);
    setHistoryOpen(false);
  };

  const loadConversation = (c: DbConversation) => {
    setConvoId(c.id);
    setConvoTitle(c.title);
    setMessages(c.messages as Message[]);
    setHistoryOpen(false);
  };

  const handleDeleteConvo = async (id: string) => {
    await dbDeleteConversation(id);
    if (user) setConversations(await dbGetConversations(user.id));
    if (id === convoId) startNewChat();
  };

  return (
    <div className="flex flex-col h-screen bg-[#f8f9fa]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3">
        <Link href="/" className="text-[#6b7280] hover:text-[#111827]"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="font-bold text-sm text-[#111827]">ELITE <span className="text-blue-600">COACH</span></h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={startNewChat} className="p-1.5 rounded-lg bg-gray-100 text-[#6b7280] hover:text-[#111827] hover:bg-gray-200 transition-colors" title="New Chat"><Plus size={16} /></button>
          <button onClick={() => setHistoryOpen(!historyOpen)} className="text-xs text-blue-600 font-medium">{historyOpen ? 'Close' : 'History'}</button>
        </div>
      </div>

      {/* History Panel */}
      {historyOpen && (
        <div className="border-b border-[#e5e7eb] bg-white px-4 py-3 max-h-48 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="text-xs text-[#9ca3af] text-center py-2">No past conversations</p>
          ) : conversations.map(c => (
            <div key={c.id} className={`flex items-center gap-2 py-1.5 ${c.id === convoId ? 'text-blue-600' : 'text-[#6b7280]'}`}>
              <button onClick={() => loadConversation(c)} className="flex-1 text-left text-xs truncate hover:text-[#111827]">{c.title}</button>
              <button onClick={() => handleDeleteConvo(c.id)} className="text-[10px] text-[#9ca3af] hover:text-red-500">delete</button>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-lg font-bold mb-2 text-[#111827]">ELITE <span className="text-blue-600">COACH</span></h2>
            <p className="text-sm text-[#6b7280] mb-6 max-w-xs">Ask about training, nutrition, recovery, form — or upload a photo for analysis.</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => handleSend(s)} className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs text-[#6b7280] hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm">{s}</button>
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
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-[#6b7280]">Loading...</div>}>
      <ChatPageInner />
    </Suspense>
  );
}
