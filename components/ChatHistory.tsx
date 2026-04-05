'use client';

import { useState, useEffect } from 'react';
import { Clock, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { StoredConversation, getConversations, deleteConversation } from '@/lib/simple-storage';

interface ChatHistoryProps {
  activeId: string | null;
  onSelect: (convo: StoredConversation) => void;
  onNew: () => void;
}

export default function ChatHistory({ activeId, onSelect, onNew }: ChatHistoryProps) {
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
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
    <div className="border-b border-[#2a2d35]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-2 text-xs text-[#9ca3af] hover:text-white"
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
            className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs text-[#9ca3af] hover:bg-[#22252d] hover:text-white"
          >
            <Plus size={12} /> New Chat
          </button>
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className={`flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs transition-colors ${
                activeId === c.id
                  ? 'bg-[#4f46e5]/10 text-[#a5b4fc] border border-blue-200'
                  : 'text-[#9ca3af] hover:bg-[#22252d] hover:text-white'
              }`}
            >
              <span className="flex-1 text-left truncate">{c.title}</span>
              <span className="text-[10px] opacity-60 flex-shrink-0">{formatTime(c.updatedAt)}</span>
              <button
                onClick={(e) => handleDelete(e, c.id)}
                className="flex-shrink-0 p-0.5 rounded hover:bg-[#ef4444]/10 hover:text-[#ef4444]"
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
