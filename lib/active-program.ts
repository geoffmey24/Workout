import { SavedProgram } from './program-history';

const STORAGE_KEY = 'elite-coach-active-program';

export function getActiveProgram(): SavedProgram | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setActiveProgram(program: SavedProgram): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(program));
}

export function clearActiveProgram(): void {
  localStorage.removeItem(STORAGE_KEY);
}
