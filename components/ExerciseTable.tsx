'use client';

interface ExerciseTableProps {
  header: string[];
  rows: string[][];
}

export function ExerciseTable({ header, rows }: ExerciseTableProps) {
  return (
    <div className="mb-4 overflow-x-auto rounded-lg border border-[#e5e7eb] shadow-sm">
      <table className="w-full text-sm border-collapse min-w-[360px]">
        <thead>
          <tr className="bg-[#1e3a5f]">
            {header.map((h, i) => (
              <th
                key={i}
                className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className={`${ri % 2 === 0 ? 'bg-white' : 'bg-[#f8f9fa]'} border-b border-[#e5e7eb] last:border-b-0`}
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-4 py-3 whitespace-nowrap ${ci === 0 ? 'font-medium text-[#111827]' : 'text-[#374151]'}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Parse [EXERCISE_TABLE]...[/EXERCISE_TABLE] blocks from text */
export function parseExerciseTables(text: string): Array<{ type: 'text'; content: string } | { type: 'table'; header: string[]; rows: string[][] }> {
  const parts: Array<{ type: 'text'; content: string } | { type: 'table'; header: string[]; rows: string[][] }> = [];
  const regex = /\[EXERCISE_TABLE\]\s*\n([\s\S]*?)\[\/EXERCISE_TABLE\]/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Text before the table
    if (match.index > lastIdx) {
      const before = text.slice(lastIdx, match.index).trim();
      if (before) parts.push({ type: 'text', content: before });
    }

    // Parse the table content
    const tableContent = match[1].trim();
    const lines = tableContent.split('\n').map(l => l.trim()).filter(Boolean);

    if (lines.length >= 2) {
      const header = lines[0].split('|').map(c => c.trim());
      const rows = lines.slice(1).map(line =>
        line.split('|').map(c => c.trim())
      );
      parts.push({ type: 'table', header, rows });
    }

    lastIdx = match.index + match[0].length;
  }

  // Remaining text after last table
  if (lastIdx < text.length) {
    const remaining = text.slice(lastIdx).trim();
    if (remaining) parts.push({ type: 'text', content: remaining });
  }

  // If no tables found, return entire text as one part
  if (parts.length === 0 && text.trim()) {
    parts.push({ type: 'text', content: text });
  }

  return parts;
}
