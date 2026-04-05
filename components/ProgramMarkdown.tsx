'use client';

import ReactMarkdown from 'react-markdown';
import { PipeTable, ExerciseCard, parseExerciseContent } from './ExerciseTable';

export default function ProgramMarkdown({ content }: { content: string }) {
  const parts = parseExerciseContent(content);

  return (
    <div className="program-content text-sm">
      {parts.map((part, i) => {
        if (part.type === 'table') return <PipeTable key={i} header={part.header} rows={part.rows} />;
        if (part.type === 'card') return <ExerciseCard key={i} name={part.name} details={part.details} />;
        return (
          <div key={i}>
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-[#9ca3af]">{children}</p>,
                ol: ({ children }) => <ol className="mb-3 pl-5 list-decimal space-y-1">{children}</ol>,
                ul: ({ children }) => <ul className="mb-3 pl-5 list-disc space-y-1 text-[#9ca3af]">{children}</ul>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                h1: ({ children }) => <h1 className="font-extrabold text-lg mt-6 mb-3 text-white border-b border-[#2a2d35] pb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="font-bold text-base mt-5 mb-2 text-white">{children}</h2>,
                h3: ({ children }) => <h3 className="font-semibold text-sm mt-4 mb-2 text-[#1e40af]">{children}</h3>,
                strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                em: ({ children }) => <em className="text-[#9ca3af]">{children}</em>,
                hr: () => <hr className="my-4 border-[#2a2d35]" />,
                // Fallback for any markdown tables that slip through
                table: ({ children }) => (
                  <div className="mb-4 overflow-x-auto rounded-lg border border-[#2a2d35]">
                    <table className="w-full text-sm border-collapse min-w-[360px]">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-[#4f46e5] text-white">{children}</thead>,
                tbody: ({ children }) => <tbody>{children}</tbody>,
                tr: ({ children }) => <tr className="even:bg-[#0f1219] odd:bg-[#1a1d24] border-b border-[#2a2d35] last:border-b-0">{children}</tr>,
                th: ({ children }) => <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap">{children}</th>,
                td: ({ children }) => <td className="px-4 py-3 text-[#9ca3af] whitespace-nowrap">{children}</td>,
                code: ({ children, className }) => {
                  const isBlock = className?.includes('language-');
                  if (isBlock) return <code className="block bg-[#22252d] rounded-lg p-3 text-xs font-mono overflow-x-auto my-2">{children}</code>;
                  return <code className="bg-[#22252d] px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>;
                },
                pre: ({ children }) => <>{children}</>,
              }}
            >
              {part.content}
            </ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
}
