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
                p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-secondary">{children}</p>,
                ol: ({ children }) => <ol className="mb-3 pl-5 list-decimal space-y-1">{children}</ol>,
                ul: ({ children }) => <ul className="mb-3 pl-5 list-disc space-y-1 text-secondary">{children}</ul>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                h1: ({ children }) => <h1 className="font-extrabold text-lg font-headline mt-6 mb-3 text-on-surface border-b border-outline-variant pb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="font-bold text-base font-headline mt-5 mb-2 text-on-surface">{children}</h2>,
                h3: ({ children }) => <h3 className="font-semibold text-sm font-headline mt-4 mb-2 text-primary">{children}</h3>,
                strong: ({ children }) => <strong className="font-bold text-on-surface">{children}</strong>,
                em: ({ children }) => <em className="text-secondary">{children}</em>,
                hr: () => <hr className="my-4 border-outline-variant" />,
                table: ({ children }) => (
                  <div className="mb-4 overflow-x-auto rounded-xl border border-outline-variant">
                    <table className="w-full text-sm border-collapse min-w-[360px]">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-primary text-white">{children}</thead>,
                tbody: ({ children }) => <tbody>{children}</tbody>,
                tr: ({ children }) => <tr className="even:bg-surface odd:bg-surface-container-lowest border-b border-outline-variant last:border-b-0">{children}</tr>,
                th: ({ children }) => <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap">{children}</th>,
                td: ({ children }) => <td className="px-4 py-3 text-secondary whitespace-nowrap">{children}</td>,
                code: ({ children, className }) => {
                  const isBlock = className?.includes('language-');
                  if (isBlock) return <code className="block bg-surface-container-low rounded-xl p-3 text-xs font-mono overflow-x-auto my-2">{children}</code>;
                  return <code className="bg-surface-container-low px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>;
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
