'use client';

import MaterialIcon from './MaterialIcon';
import { getVideoUrl, getVideoForExercise } from '@/lib/exercise-videos';

// ── Styled HTML Table (primary renderer for pipe-separated data) ──

interface PipeTableProps {
  header: string[];
  rows: string[][];
}

function PipeTable({ header, rows }: PipeTableProps) {
  return (
    <div className="mb-4 overflow-x-auto rounded-xl border border-outline-variant">
      <table className="w-full text-sm border-collapse min-w-[360px]">
        <thead>
          <tr className="bg-primary text-white">
            {header.map((h, i) => (
              <th
                key={i}
                className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap"
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
              className={`${ri % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface'} border-b border-outline-variant last:border-b-0`}
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-4 py-3 whitespace-nowrap ${ci === 0 ? 'font-medium text-on-surface' : 'text-secondary'}`}
                >
                  {ci === 0 ? (() => {
                    const video = getVideoForExercise(cell);
                    return (
                      <span className="inline-flex items-center gap-1.5">
                        {cell}
                        <a
                          href={getVideoUrl(cell)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-500 hover:text-red-600 shrink-0"
                          title={video ? `Watch on ${video.channel}` : 'Search on YouTube'}
                        >
                          <MaterialIcon icon="play_circle" size={14} />
                        </a>
                      </span>
                    );
                  })() : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Exercise Card (fallback for non-pipe formats) ──

interface ExerciseCardProps {
  name: string;
  details: string[];
}

function ExerciseCard({ name, details }: ExerciseCardProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-semibold text-sm text-on-surface truncate">{name}</span>
        <a
          href={getVideoUrl(name)}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-red-500 hover:text-red-600"
          title={getVideoForExercise(name) ? `Watch on ${getVideoForExercise(name)!.channel}` : 'Search on YouTube'}
        >
          <MaterialIcon icon="play_circle" size={14} />
        </a>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
        {details.map((detail, i) => (
          <span
            key={i}
            className={`inline-block rounded-xl px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${
              detail.toLowerCase().includes('rpe')
                ? 'bg-orange-100 text-orange-700'
                : detail.toLowerCase().includes('rest') || detail.toLowerCase().includes('min') || detail.toLowerCase().includes('s')
                ? 'bg-blue-50 text-primary'
                : 'bg-surface-container-low text-secondary'
            }`}
          >
            {detail}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Parser: detect pipe-tables, numbered exercise lists, or plain text ──

type ParsedPart =
  | { type: 'text'; content: string }
  | { type: 'table'; header: string[]; rows: string[][] }
  | { type: 'card'; name: string; details: string[] };

export function parseExerciseContent(text: string): ParsedPart[] {
  // Clean old tags
  const cleaned = text.replace(/\[\/?\s*EXERCISE_TABLE\s*\]/g, '');
  const lines = cleaned.split('\n');
  const parts: ParsedPart[] = [];
  let textBuffer: string[] = [];
  let pipeBuffer: string[] = [];

  function flushText() {
    if (textBuffer.length > 0) {
      const t = textBuffer.join('\n').trim();
      if (t) parts.push({ type: 'text', content: t });
      textBuffer = [];
    }
  }

  function flushPipeTable() {
    if (pipeBuffer.length < 2) {
      if (pipeBuffer.length > 0) textBuffer.push(...pipeBuffer);
      pipeBuffer = [];
      return;
    }
    flushText();

    const dataLines = pipeBuffer.filter(l => !/^\s*\|?\s*[-:]+(\s*\|\s*[-:]+)+\s*\|?\s*$/.test(l));
    if (dataLines.length < 2) {
      textBuffer.push(...pipeBuffer);
      pipeBuffer = [];
      return;
    }

    const parseLine = (line: string) =>
      line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());

    const header = parseLine(dataLines[0]);
    const rows = dataLines.slice(1).map(parseLine);
    parts.push({ type: 'table', header, rows });
    pipeBuffer = [];
  }

  const hasPipe = (line: string) => {
    const trimmed = line.trim();
    return trimmed.includes('|') && !/^[-:|s]+$/.test(trimmed) && !trimmed.startsWith('#') && !trimmed.startsWith('[');
  };

  const numberedExercisePattern = /^\d+\.\s+(.+?)\s*[\u2014\u2013\-]\s+(.+)$/;

  for (const line of lines) {
    const trimmed = line.trim();

    if (hasPipe(trimmed)) {
      pipeBuffer.push(trimmed);
      continue;
    }

    if (pipeBuffer.length > 0) {
      flushPipeTable();
    }

    const numberedMatch = trimmed.match(numberedExercisePattern);
    if (numberedMatch) {
      flushText();
      const name = numberedMatch[1].replace(/\*\*/g, '').trim();
      const rest = numberedMatch[2];
      const details = rest.split(/\s*[\u2014\u2013]\s*/).map(d => d.trim()).filter(d => d.length > 0);
      parts.push({ type: 'card', name, details });
      continue;
    }

    textBuffer.push(line);
  }

  if (pipeBuffer.length > 0) flushPipeTable();
  flushText();

  if (parts.length === 0 && text.trim()) {
    parts.push({ type: 'text', content: text });
  }

  return parts;
}

// ── Renderer component ──

export function ExerciseRenderer({ parts }: { parts: ParsedPart[] }) {
  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'table') return <PipeTable key={i} header={part.header} rows={part.rows} />;
        if (part.type === 'card') return <ExerciseCard key={i} name={part.name} details={part.details} />;
        return null;
      })}
    </>
  );
}

export { PipeTable, ExerciseCard };
export type { ParsedPart };
