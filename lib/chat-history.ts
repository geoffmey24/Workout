import { Message } from '@/types';

const STORAGE_KEY = 'elite-coach-chat-history';
const MAX_CONVERSATIONS = 20;

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export function getConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveConversation(convo: Conversation): void {
  const convos = getConversations();
  const idx = convos.findIndex((c) => c.id === convo.id);
  if (idx >= 0) {
    convos[idx] = convo;
  } else {
    convos.unshift(convo);
  }
  // Keep only recent conversations
  const trimmed = convos.slice(0, MAX_CONVERSATIONS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function deleteConversation(id: string): void {
  const convos = getConversations().filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convos));
}

export function generateTitle(messages: Message[]): string {
  const firstUserMsg = messages.find((m) => m.role === 'user');
  if (!firstUserMsg) return 'New Chat';
  const text = firstUserMsg.content.slice(0, 50);
  return text.length < firstUserMsg.content.length ? text + '...' : text;
}

export function createConversation(): Conversation {
  return {
    id: crypto.randomUUID(),
    title: 'New Chat',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
