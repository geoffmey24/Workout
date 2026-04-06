'use client';

import { useState, useEffect } from 'react';
import MaterialIcon from './MaterialIcon';
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
    <div className="border-b border-outline-variant/10">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-2 text-xs text-secondary hover:text-on-surface"
      >
        <span className="flex items-center gap-1.5">
          <MaterialIcon icon="schedule" size={12} />
          Chat History ({conversations.length})
        </span>
        <MaterialIcon icon={expanded ? 'expand_less' : 'expand_more'} size={14} />
      </button>
      {expanded && (
        <div className="px-2 pb-2 space-y-1 max-h-48 overflow-y-auto">
          <button
            onClick={onNew}
            className="flex items-center gap-2 w-full rounded-xl px-3 py-2 text-xs text-secondary hover:bg-surface-container-low hover:text-on-surface"
          >
            <MaterialIcon icon="add" size={12} /> New Chat
          </button>
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className={`flex items-center gap-2 w-full rounded-xl px-3 py-2 text-xs transition-colors ${
                activeId === c.id
                  ? 'bg-blue-100/50 text-primary border border-blue-200'
                  : 'text-secondary hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              <span className="flex-1 text-left truncate">{c.title}</span>
              <span className="text-[10px] opacity-60 flex-shrink-0">{formatTime(c.updatedAt)}</span>
              <button
                onClick={(e) => handleDelete(e, c.id)}
                className="flex-shrink-0 p-0.5 rounded hover:bg-red-50 hover:text-red-500"
              >
                <MaterialIcon icon="delete" size={10} />
              </button>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
