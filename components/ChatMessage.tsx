'use client';

import ReactMarkdown from 'react-markdown';
import { Message } from '@/types';

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-white border border-[#e5e7eb] text-[#111827] shadow-sm'
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
            <ReactMarkdown
              components={{
                // Clean rendering: paragraphs as simple text
                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                // Numbered lists for form cues
                ol: ({ children }) => <ol className="mb-2 pl-5 list-decimal space-y-1">{children}</ol>,
                ul: ({ children }) => <ul className="mb-2 pl-5 list-disc space-y-1">{children}</ul>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                // Headers only for programs/structured content
                h1: ({ children }) => <h2 className="font-bold text-base mt-3 mb-1">{children}</h2>,
                h2: ({ children }) => <h3 className="font-bold text-sm mt-3 mb-1">{children}</h3>,
                h3: ({ children }) => <h4 className="font-semibold text-sm mt-2 mb-1">{children}</h4>,
                // Clean bold/italic
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em>{children}</em>,
                // Tables for programs
                table: ({ children }) => (
                  <div className="overflow-x-auto mb-2">
                    <table className="w-full border-collapse text-xs">{children}</table>
                  </div>
                ),
                th: ({ children }) => <th className="border border-[#e5e7eb] bg-gray-50 px-2 py-1.5 text-left font-semibold">{children}</th>,
                td: ({ children }) => <td className="border border-[#e5e7eb] px-2 py-1.5">{children}</td>,
                // Code blocks (rare but clean)
                code: ({ children, className }) => {
                  const isBlock = className?.includes('language-');
                  if (isBlock) {
                    return <code className="block bg-gray-50 rounded-lg p-3 text-xs font-mono overflow-x-auto my-2">{children}</code>;
                  }
                  return <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>;
                },
                pre: ({ children }) => <>{children}</>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
