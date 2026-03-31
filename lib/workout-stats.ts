const STORAGE_KEY = 'elite-coach-workout-stats';

export interface WorkoutStats {
  completedWorkouts: Record<string, string[]>; // date -> array of day ids completed
  streak: number;
  longestStreak: number;
  totalWorkouts: number;
  lastWorkoutDate: string | null;
}

function getDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getWorkoutStats(): WorkoutStats {
  if (typeof window === 'undefined') {
    return { completedWorkouts: {}, streak: 0, longestStreak: 0, totalWorkouts: 0, lastWorkoutDate: null };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { completedWorkouts: {}, streak: 0, longestStreak: 0, totalWorkouts: 0, lastWorkoutDate: null };
  } catch {
    return { completedWorkouts: {}, streak: 0, longestStreak: 0, totalWorkouts: 0, lastWorkoutDate: null };
  }
}

function saveStats(stats: WorkoutStats): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function recordWorkoutCompletion(dayId: number): WorkoutStats {
  const stats = getWorkoutStats();
  const today = getDateKey();
  const dayStr = String(dayId);

  // Initialize today's array if needed
  if (!stats.completedWorkouts[today]) {
    stats.completedWorkouts[today] = [];
  }

  // Don't double-count
  if (stats.completedWorkouts[today].includes(dayStr)) {
    return stats;
  }

  stats.completedWorkouts[today].push(dayStr);
  stats.totalWorkouts += 1;

  // Calculate streak
  stats.streak = calculateStreak(stats.completedWorkouts);
  if (stats.streak > stats.longestStreak) {
    stats.longestStreak = stats.streak;
  }
  stats.lastWorkoutDate = today;

  // Keep only last 90 days of data
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  for (const date of Object.keys(stats.completedWorkouts)) {
    if (date < cutoffStr) delete stats.completedWorkouts[date];
  }

  saveStats(stats);
  return stats;
}

function calculateStreak(completedWorkouts: Record<string, string[]>): number {
  let streak = 0;
  const d = new Date();

  for (let i = 0; i < 365; i++) {
    const key = d.toISOString().slice(0, 10);
    if (completedWorkouts[key] && completedWorkouts[key].length > 0) {
      streak++;
    } else if (i > 0) {
      // Allow today to be skipped (streak counts from yesterday back)
      break;
    }
    d.setDate(d.getDate() - 1);
  }

  return streak;
}

export function getWeeklyStats(): { workoutsThisWeek: number; daysActive: number } {
  const stats = getWorkoutStats();
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));

  let workoutsThisWeek = 0;
  let daysActive = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const dayWorkouts = stats.completedWorkouts[key];
    if (dayWorkouts && dayWorkouts.length > 0) {
      workoutsThisWeek += dayWorkouts.length;
      daysActive++;
    }
  }

  return { workoutsThisWeek, daysActive };
}
