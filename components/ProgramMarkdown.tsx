'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ProgramMarkdown({ content }: { content: string }) {
  return (
    <div className="program-content text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-[#374151]">{children}</p>,
          ol: ({ children }) => <ol className="mb-3 pl-5 list-decimal space-y-1">{children}</ol>,
          ul: ({ children }) => <ul className="mb-3 pl-5 list-disc space-y-1 text-[#374151]">{children}</ul>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          h1: ({ children }) => <h1 className="font-extrabold text-lg mt-6 mb-3 text-[#111827] border-b border-[#e5e7eb] pb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="font-bold text-base mt-5 mb-2 text-[#111827]">{children}</h2>,
          h3: ({ children }) => <h3 className="font-semibold text-sm mt-4 mb-2 text-[#1e40af]">{children}</h3>,
          strong: ({ children }) => <strong className="font-bold text-[#111827]">{children}</strong>,
          em: ({ children }) => <em className="text-[#6b7280]">{children}</em>,
          hr: () => <hr className="my-4 border-[#e5e7eb]" />,
          table: ({ children }) => (
            <div className="mb-4 overflow-x-auto -mx-1 rounded-lg border border-[#e5e7eb] shadow-sm">
              <table className="w-full text-sm border-collapse min-w-[400px]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#1e3a5f] text-white">
              {children}
            </thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="even:bg-[#f8f9fa] odd:bg-white border-b border-[#e5e7eb] last:border-b-0">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2.5 text-[#374151] whitespace-nowrap">
              {children}
            </td>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-');
            if (isBlock) {
              return <code className="block bg-gray-50 rounded-lg p-3 text-xs font-mono overflow-x-auto my-2">{children}</code>;
            }
            return <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>;
          },
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
