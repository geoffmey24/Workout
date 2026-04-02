const STORAGE_KEY = 'elite-coach-saved-programs';
const MAX_PROGRAMS = 10;

export interface SavedProgram {
  id: string;
  title: string;
  answers: Record<string, string>;
  content: string;
  createdAt: number;
  isActive?: boolean;
}

export function getSavedPrograms(): SavedProgram[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveProgram(program: SavedProgram): void {
  const programs = getSavedPrograms();
  programs.unshift(program);
  const trimmed = programs.slice(0, MAX_PROGRAMS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function deleteProgram(id: string): void {
  const programs = getSavedPrograms().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
}
