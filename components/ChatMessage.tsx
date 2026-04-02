'use client';

import ReactMarkdown from 'react-markdown';
import { Message } from '@/types';

// Convert markdown table rows into clean bullet-point exercise lines
function cleanRawTables(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let inTable = false;
  let headers: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect separator rows like |---|---|---|
    if (/^\|[\s\-:]+\|/.test(trimmed) && trimmed.replace(/[\s\-:|]/g, '') === '') {
      inTable = true;
      continue;
    }

    // Detect table rows (lines starting and ending with |)
    if (/^\|.*\|$/.test(trimmed)) {
      const cells = trimmed.split('|').slice(1, -1).map(c => c.trim()).filter(Boolean);

      if (!inTable) {
        // This is a header row — store headers for context
        headers = cells;
        inTable = true;
        continue;
      }

      // Data row — format as a clean bullet point
      if (cells.length > 0) {
        // Try to create "Exercise — sets x reps, rest" format
        const parts = cells.filter(c => c && c !== '-' && c !== '—');
        result.push(`• ${parts.join(' — ')}`);
      }
      continue;
    }

    // End of table
    if (inTable && !trimmed.startsWith('|')) {
      inTable = false;
      headers = [];
    }

    result.push(line);
  }

  return result.join('\n');
}

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
                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                ol: ({ children }) => <ol className="mb-2 pl-5 list-decimal space-y-1">{children}</ol>,
                ul: ({ children }) => <ul className="mb-2 pl-5 list-disc space-y-1">{children}</ul>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                h1: ({ children }) => <h2 className="font-bold text-base mt-3 mb-1">{children}</h2>,
                h2: ({ children }) => <h3 className="font-bold text-sm mt-3 mb-1">{children}</h3>,
                h3: ({ children }) => <h4 className="font-semibold text-sm mt-2 mb-1">{children}</h4>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em>{children}</em>,
                // Render tables as clean bullet lists (fallback if Claude still generates tables)
                table: ({ children }) => <div className="mb-2">{children}</div>,
                thead: () => null,
                tbody: ({ children }) => <>{children}</>,
                tr: ({ children }) => {
                  // Extract cell text content and join as a bullet line
                  const cells: string[] = [];
                  const childArr = Array.isArray(children) ? children : [children];
                  childArr.forEach((child: any) => {
                    if (child?.props?.children) {
                      const text = typeof child.props.children === 'string'
                        ? child.props.children
                        : String(child.props.children);
                      if (text && text.trim()) cells.push(text.trim());
                    }
                  });
                  if (cells.length === 0) return null;
                  return <p className="mb-1 leading-relaxed">• {cells.join(' — ')}</p>;
                },
                th: ({ children }) => <span>{children}</span>,
                td: ({ children }) => <span>{children}</span>,
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
              {cleanRawTables(message.content)}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
