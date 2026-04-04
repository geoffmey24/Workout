'use client';

import ReactMarkdown from 'react-markdown';
import { Message } from '@/types';
import { PipeTable, ExerciseCard, parseExerciseContent } from './ExerciseTable';

function MarkdownContent({ text }: { text: string }) {
  return (
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
        table: ({ children }) => (
          <div className="mb-3 overflow-x-auto rounded-lg border border-[#e5e7eb] shadow-sm">
            <table className="w-full text-sm border-collapse min-w-[350px]">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-[#1e3a5f] text-white">{children}</thead>,
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => <tr className="even:bg-[#f8f9fa] odd:bg-white border-b border-[#e5e7eb] last:border-b-0">{children}</tr>,
        th: ({ children }) => <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap">{children}</th>,
        td: ({ children }) => <td className="px-3 py-2 text-[#374151] whitespace-nowrap">{children}</td>,
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-');
          if (isBlock) return <code className="block bg-gray-50 rounded-lg p-3 text-xs font-mono overflow-x-auto my-2">{children}</code>;
          return <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>;
        },
        pre: ({ children }) => <>{children}</>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-[#1e3a5f] text-white'
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
            {parseExerciseContent(message.content).map((part, i) => {
              if (part.type === 'table') return <PipeTable key={i} header={part.header} rows={part.rows} />;
              if (part.type === 'card') return <ExerciseCard key={i} name={part.name} details={part.details} />;
              return <MarkdownContent key={i} text={part.content} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
