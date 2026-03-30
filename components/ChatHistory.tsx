'use client';

import { useState, useEffect } from 'react';
import { Clock, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Conversation, getConversations, deleteConversation } from '@/lib/chat-history';

interface ChatHistoryProps {
  activeId: string | null;
  onSelect: (convo: Conversation) => void;
  onNew: () => void;
}

export default function ChatHistory({ activeId, onSelect, onNew }: ChatHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setConversations(getConversations());
  }, [activeId]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteConversation(id);
    setConversations(getConversations());
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (conversations.length === 0) return null;

  return (
    <div className="border-b border-[#262626]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-2 text-xs text-[#a3a3a3] hover:text-white"
      >
        <span className="flex items-center gap-1.5">
          <Clock size={12} />
          Chat History ({conversations.length})
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {expanded && (
        <div className="px-2 pb-2 space-y-1 max-h-48 overflow-y-auto">
          <button
            onClick={onNew}
            className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs text-[#a3a3a3] hover:bg-[#171717] hover:text-white"
          >
            <Plus size={12} /> New Chat
          </button>
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className={`flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs transition-colors ${
                activeId === c.id
                  ? 'bg-red-600/10 text-red-500 border border-red-600/30'
                  : 'text-[#a3a3a3] hover:bg-[#171717] hover:text-white'
              }`}
            >
              <span className="flex-1 text-left truncate">{c.title}</span>
              <span className="text-[10px] opacity-60 flex-shrink-0">{formatTime(c.updatedAt)}</span>
              <button
                onClick={(e) => handleDelete(e, c.id)}
                className="flex-shrink-0 p-0.5 rounded hover:bg-red-600/20 hover:text-red-500"
              >
                <Trash2 size={10} />
              </button>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
