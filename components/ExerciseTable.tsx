'use client';

import { ExternalLink } from 'lucide-react';

interface ExerciseCardProps {
  name: string;
  details: string[];
}

function ExerciseCard({ name, details }: ExerciseCardProps) {
  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(name + ' exercise form')}`;
  const exrxUrl = `https://exrx.net/Lists/ExList/${encodeURIComponent(name.replace(/\s+/g, ''))}`;

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-semibold text-sm text-[#111827] truncate">{name}</span>
        <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-red-500 hover:text-red-600" title="Watch on YouTube">
          <ExternalLink size={12} />
        </a>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
        {details.map((detail, i) => (
          <span
            key={i}
            className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${
              detail.toLowerCase().includes('rpe')
                ? 'bg-orange-100 text-orange-700'
                : detail.toLowerCase().includes('rest') || detail.toLowerCase().includes('min') || detail.toLowerCase().includes('s')
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {detail}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Parse numbered exercise lines like "1. Bench Press — 4 x 8 — RPE 7-8 — Rest 3 min" */
export function parseExerciseCards(text: string): Array<{ type: 'text'; content: string } | { type: 'exercise'; name: string; details: string[] }> {
  const lines = text.split('\n');
  const parts: Array<{ type: 'text'; content: string } | { type: 'exercise'; name: string; details: string[] }> = [];
  let textBuffer: string[] = [];

  // Pattern: numbered list with em-dash or regular dash separated details
  // Matches: "1. Exercise Name — details — details" or "1. Exercise Name - details - details"
  // Also catches lines with pipe characters as fallback
  const exercisePattern = /^\d+\.\s+(.+?)(?:\s*[\u2014\u2013\-]\s+|\s*\|\s*)(.+)$/;
  // Fallback: lines with pipe characters (from old format)
  const pipePattern = /^(.+?)\s*\|\s*(.+)$/;
  // Simple numbered exercise with sets notation: "1. Exercise Name 4x8" or "1. Exercise Name — 4 x 8"
  const simplePattern = /^\d+\.\s+(.+?)[\s\u2014\u2013\-]+(\d+\s*[xX\u00d7]\s*\d+.*)$/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      textBuffer.push(line);
      continue;
    }

    let match = trimmed.match(exercisePattern);
    if (!match) match = trimmed.match(simplePattern);

    // Fallback: try pipe pattern (catches old [EXERCISE_TABLE] content)
    if (!match && trimmed.includes('|') && !trimmed.startsWith('#') && !trimmed.startsWith('[')) {
      const pipeMatch = trimmed.match(pipePattern);
      if (pipeMatch) {
        // Skip header-like rows (contain "Exercise", "Sets", "Reps" etc.)
        const firstPart = pipeMatch[1].trim().toLowerCase();
        if (['exercise', 'activity', 'movement'].some(h => firstPart === h)) {
          textBuffer.push(line);
          continue;
        }
        match = pipeMatch;
      }
    }

    if (match) {
      // Flush text buffer
      if (textBuffer.length > 0) {
        const text = textBuffer.join('\n').trim();
        if (text) parts.push({ type: 'text', content: text });
        textBuffer = [];
      }

      const name = match[1].trim().replace(/\*\*/g, '').replace(/^\d+\.\s*/, '');
      const rest = match[2];
      // Split remaining by em-dash, regular dash (surrounded by spaces), or pipe
      const details = rest.split(/\s*[\u2014\u2013]\s*|\s*\|\s*/)
        .map(d => d.trim())
        .filter(d => d.length > 0);

      parts.push({ type: 'exercise', name, details });
    } else {
      textBuffer.push(line);
    }
  }

  // Flush remaining text
  if (textBuffer.length > 0) {
    const text = textBuffer.join('\n').trim();
    if (text) parts.push({ type: 'text', content: text });
  }

  // If nothing was parsed, return entire text
  if (parts.length === 0 && text.trim()) {
    parts.push({ type: 'text', content: text });
  }

  return parts;
}

// Also strip any remaining [EXERCISE_TABLE] tags from old content
export function cleanExerciseTableTags(text: string): string {
  return text.replace(/\[\/?\s*EXERCISE_TABLE\s*\]/g, '');
}

export { ExerciseCard };
export default ExerciseCard;
