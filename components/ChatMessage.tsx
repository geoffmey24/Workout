'use client';

import ReactMarkdown from 'react-markdown';
import { Message } from '@/types';

function extractSvgBlocks(text: string): { parts: Array<{ type: 'text' | 'svg'; content: string }> } {
  const parts: Array<{ type: 'text' | 'svg'; content: string }> = [];
  const svgRegex = /```svg\s*\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = svgRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'svg', content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return { parts: parts.length > 0 ? parts : [{ type: 'text', content: text }] };
}

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-red-600 text-white'
            : 'bg-[#171717] border border-[#262626] text-[#f5f5f5]'
        }`}
      >
        {message.image && (
          <img
            src={`data:${message.imageType};base64,${message.image}`}
            alt="Uploaded"
            className="mb-2 max-h-48 rounded-lg object-cover"
          />
        )}
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="chat-message text-sm">
            {extractSvgBlocks(message.content).parts.map((part, i) =>
              part.type === 'svg' ? (
                <div
                  key={i}
                  className="svg-diagram"
                  dangerouslySetInnerHTML={{ __html: part.content }}
                />
              ) : (
                <ReactMarkdown key={i}>{part.content}</ReactMarkdown>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
