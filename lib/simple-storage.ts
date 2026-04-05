// simple-storage.ts — the ONE source of truth for all localStorage access.
// Every key uses the "_v2" suffix to start clean and avoid conflicts
// with the ~20 broken/duplicate keys from previous implementations.
// ALL functions are synchronous. No db.ts, no async, no Supabase fallback.

const PROGRAMS_KEY = 'ec_programs_v2';
const ACTIVE_KEY = 'ec_active_program_v2';
const CHAT_KEY = 'ec_chat_history_v2';
const LOGS_KEY = 'ec_workout_logs_v2';
const STATS_KEY = 'ec_workout_stats_v2';
const BODY_KEY = 'ec_body_stats_v2';
const PROFILE_KEY = 'ec_profile_v2';
const DARK_MODE_KEY = 'ec_dark_mode_v2';
const SKIPPED_KEY = 'ec_skipped_days_v2';
const SELECTED_DAY_KEY = 'ec_selected_day_v2';
const EVENT_KEY = 'ec_event_v2';
const RECOVERY_KEY = 'ec_recovery_data_v2';
const DIAGNOSTIC_KEY = 'ec_diagnostic_v2';

// ── Generic helpers ───────────────────────────────────────

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('[simple-storage] write failed for', key, e);
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch { /* ignore */ }
}

// ── Programs ──────────────────────────────────────────────

export interface StoredProgram {
  id: string;
  title: string;
  answers: Record<string, string>;
  content: string;
  createdAt: number;
}

export function getPrograms(): StoredProgram[] {
  return read<StoredProgram[]>(PROGRAMS_KEY, []);
}

export function saveProgram(program: StoredProgram): StoredProgram {
  const programs = getPrograms();
  // Ensure unique id
  const filtered = programs.filter(p => p.id !== program.id);
  filtered.unshift(program);
  write(PROGRAMS_KEY, filtered.slice(0, 20));
  // Verify
  const verify = getPrograms();
  console.log('[simple-storage] saveProgram: saved. Total:', verify.length, 'ids:', verify.map(p => p.id).join(','));
  return program;
}

export function deleteProgram(id: string): void {
  const programs = getPrograms().filter(p => p.id !== id);
  write(PROGRAMS_KEY, programs);
  // If this was the active program, clear it
  const active = getActiveProgram();
  if (active && active.id === id) {
    clearActiveProgram();
  }
  console.log('[simple-storage] deleteProgram: deleted', id, 'remaining:', programs.length);
}

export function getActiveProgram(): StoredProgram | null {
  return read<StoredProgram | null>(ACTIVE_KEY, null);
}

export function setActiveProgram(program: StoredProgram): void {
  write(ACTIVE_KEY, program);
  console.log('[simple-storage] setActiveProgram:', program.id, program.title);
}

export function clearActiveProgram(): void {
  remove(ACTIVE_KEY);
  console.log('[simple-storage] clearActiveProgram');
}

// ── Chat History ──────────────────────────────────────────

export interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  imageType?: string;
}

export interface StoredConversation {
  id: string;
  title: string;
  messages: StoredMessage[];
  updatedAt: number;
}

export function getConversations(): StoredConversation[] {
  return read<StoredConversation[]>(CHAT_KEY, []);
}

export function saveConversation(convo: StoredConversation): void {
  const convos = getConversations();
  const idx = convos.findIndex(c => c.id === convo.id);
  if (idx >= 0) convos[idx] = convo;
  else convos.unshift(convo);
  write(CHAT_KEY, convos.slice(0, 30));
  console.log('[simple-storage] saveConversation:', convo.id, 'total:', convos.length);
}

export function deleteConversation(id: string): void {
  const convos = getConversations().filter(c => c.id !== id);
  write(CHAT_KEY, convos);
}

// ── Workout Logs ──────────────────────────────────────────

export interface WorkoutLog {
  exercise: string;
  weight: number;
  reps: number;
  sets: number;
  date: string;
  estimated1RM: number;
}

export function getWorkoutLogs(): WorkoutLog[] {
  return read<WorkoutLog[]>(LOGS_KEY, []);
}

export function addWorkoutLog(entry: WorkoutLog): void {
  const logs = getWorkoutLogs();
  logs.push(entry);
  write(LOGS_KEY, logs.slice(-500));
}

export function getLastLog(exercise: string): WorkoutLog | null {
  const logs = getWorkoutLogs();
  const lower = exercise.toLowerCase();
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].exercise.toLowerCase() === lower) return logs[i];
  }
  return null;
}

export function getPersonalRecords(): Record<string, WorkoutLog> {
  const logs = getWorkoutLogs();
  const prs: Record<string, WorkoutLog> = {};
  for (const log of logs) {
    const key = log.exercise.toLowerCase();
    if (!prs[key] || log.estimated1RM > prs[key].estimated1RM) {
      prs[key] = log;
    }
  }
  return prs;
}

// ── Workout Stats (completions, streaks) ──────────────────

export interface WorkoutStats {
  completions: { date: string; dayName: string; timestamp: number }[];
}

function getStatsObj(): WorkoutStats {
  return read<WorkoutStats>(STATS_KEY, { completions: [] });
}

export function recordWorkoutCompletion(dayName: string): void {
  const stats = getStatsObj();
  stats.completions.push({
    date: new Date().toISOString().slice(0, 10),
    dayName,
    timestamp: Date.now(),
  });
  // Keep last 200
  if (stats.completions.length > 200) {
    stats.completions = stats.completions.slice(-200);
  }
  write(STATS_KEY, stats);
}

export function getCompletions(): WorkoutStats['completions'] {
  return getStatsObj().completions;
}

export function getStreak(): number {
  const completions = getCompletions();
  if (completions.length === 0) return 0;
  const dates = Array.from(new Set(completions.map(c => c.date))).sort().reverse();
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const key = d.toISOString().slice(0, 10);
    if (dates.includes(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function getWeekCompletionCount(): number {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const mondayStr = monday.toISOString().slice(0, 10);
  return getCompletions().filter(c => c.date >= mondayStr).length;
}

export function getWeekVolume(): number {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const mondayStr = monday.toISOString().slice(0, 10);
  return getWorkoutLogs()
    .filter(l => l.date >= mondayStr)
    .reduce((sum, l) => sum + l.weight * l.reps * l.sets, 0);
}

export function isTodayCompleted(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return getCompletions().some(c => c.date === today);
}

// ── Body Stats ────────────────────────────────────────────

export interface BodyStat {
  date: string;
  weight?: number;
  bodyFat?: number;
  measurements?: Record<string, number>;
  notes?: string;
}

export function getBodyStats(): BodyStat[] {
  return read<BodyStat[]>(BODY_KEY, []);
}

export function saveBodyStat(entry: BodyStat): void {
  const stats = getBodyStats();
  const idx = stats.findIndex(s => s.date === entry.date);
  if (idx >= 0) stats[idx] = entry;
  else stats.push(entry);
  stats.sort((a, b) => a.date.localeCompare(b.date));
  write(BODY_KEY, stats.slice(-365));
}

export function deleteBodyStat(date: string): void {
  const stats = getBodyStats().filter(s => s.date !== date);
  write(BODY_KEY, stats);
}

// ── User Profile ──────────────────────────────────────────

export interface UserProfile {
  name: string;
  onboardingComplete: boolean;
  is_pro: boolean;
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
  primaryGoal?: string;
  injuries?: string;
  dislikedExercises?: string[];
  sport?: string;
  preferredDuration?: string;
  equipmentAvailable?: string;
  coachNotes?: string;
}

export function getProfile(): UserProfile | null {
  const p = read<UserProfile | null>(PROFILE_KEY, null);
  if (p && p.is_pro === undefined) p.is_pro = false;
  return p;
}

export function saveProfile(profile: UserProfile): void {
  if (profile.is_pro === undefined) profile.is_pro = false;
  write(PROFILE_KEY, profile);
}

export function isPro(): boolean {
  return getProfile()?.is_pro ?? false;
}

// ── Dark Mode ─────────────────────────────────────────────

export function getDarkMode(): boolean {
  return read<boolean>(DARK_MODE_KEY, false);
}

export function setDarkMode(dark: boolean): void {
  write(DARK_MODE_KEY, dark);
}

// ── Skipped Days ──────────────────────────────────────────

export function getSkippedDays(): { day: string; date: string }[] {
  return read<{ day: string; date: string }[]>(SKIPPED_KEY, []);
}

export function addSkippedDay(day: string): void {
  const today = new Date().toISOString().slice(0, 10);
  const skipped = getSkippedDays();
  skipped.push({ day, date: today });
  write(SKIPPED_KEY, skipped.slice(-20));
}

// ── Selected Day Index ────────────────────────────────────

export function getSelectedDayIdx(): number | null {
  const val = read<number | null>(SELECTED_DAY_KEY, null);
  return val;
}

export function setSelectedDayIdx(idx: number): void {
  write(SELECTED_DAY_KEY, idx);
}

export function clearSelectedDayIdx(): void {
  remove(SELECTED_DAY_KEY);
}

// ── Event / Goal Countdown ────────────────────────────────

export interface TrainingEvent {
  name: string;
  date: string; // ISO date string
}

export function getEvent(): TrainingEvent | null {
  return read<TrainingEvent | null>(EVENT_KEY, null);
}

export function saveEvent(event: TrainingEvent): void {
  write(EVENT_KEY, event);
}

export function clearEvent(): void {
  remove(EVENT_KEY);
}

export function getWeeksUntilEvent(): number | null {
  const event = getEvent();
  if (!event) return null;
  const eventDate = new Date(event.date);
  const now = new Date();
  const diff = eventDate.getTime() - now.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
}

// ── Recovery Data (from Whoop/Oura) ──────────────────────

export interface RecoveryData {
  score: number; // 0-100
  hrv?: number;
  avgHrv?: number;
  sleepHours?: number;
  source: 'whoop' | 'oura' | 'manual';
  date: string;
}

export function getLatestRecovery(): RecoveryData | null {
  const data = read<RecoveryData[]>(RECOVERY_KEY, []);
  if (data.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  // Return today's or most recent
  return data.find(d => d.date === today) || data[data.length - 1] || null;
}

export function saveRecoveryData(entry: RecoveryData): void {
  const data = read<RecoveryData[]>(RECOVERY_KEY, []);
  const idx = data.findIndex(d => d.date === entry.date);
  if (idx >= 0) data[idx] = entry;
  else data.push(entry);
  write(RECOVERY_KEY, data.slice(-30));
}

// ── Strength Diagnostic ──────────────────────────────────

export interface DiagnosticEntry {
  exercise: string;
  workingWeight: number;
  reps: number;
  rpe: number;
  rawEstimated1RM: number;
  adjusted1RM: number;
  bwRatio: number;
  level: string;
  estimated1RM: number; // kept for backward compat (= adjusted1RM)
}

export interface StrengthDiagnostic {
  bodyWeight: number;
  bodyWeightUnit: 'lbs' | 'kg';
  entries: DiagnosticEntry[];
  overallLevel: string;
  date: string;
}

export function getDiagnostic(): StrengthDiagnostic | null {
  return read<StrengthDiagnostic | null>(DIAGNOSTIC_KEY, null);
}

export function saveDiagnostic(diagnostic: StrengthDiagnostic): void {
  write(DIAGNOSTIC_KEY, diagnostic);
}

export function clearDiagnostic(): void {
  remove(DIAGNOSTIC_KEY);
}

// ── Diagnostic Skip ──────────────────────────────────────

const DIAGNOSTIC_SKIP_KEY = 'ec_diagnostic_skipped_v2';

export function getDiagnosticSkipped(): { skipped: boolean; lastReminder?: string } {
  return read<{ skipped: boolean; lastReminder?: string }>(DIAGNOSTIC_SKIP_KEY, { skipped: false });
}

export function setDiagnosticSkipped(): void {
  write(DIAGNOSTIC_SKIP_KEY, { skipped: true, lastReminder: new Date().toISOString().slice(0, 10) });
}

export function updateDiagnosticReminderDate(): void {
  const data = getDiagnosticSkipped();
  write(DIAGNOSTIC_SKIP_KEY, { ...data, lastReminder: new Date().toISOString().slice(0, 10) });
}

export function clearDiagnosticSkipped(): void {
  remove(DIAGNOSTIC_SKIP_KEY);
}

// ── getDiagnosticOrActual: self-correcting weight system ──

export function getDiagnosticOrActual(exerciseName: string): { weight: number; reps: number; estimated1RM: number; source: 'log' | 'diagnostic' } | null {
  // 1. Check workout logs for latest logged weight
  const lastLog = getLastLog(exerciseName);
  if (lastLog && lastLog.weight > 0) {
    return {
      weight: lastLog.weight,
      reps: lastLog.reps,
      estimated1RM: lastLog.estimated1RM || calculate1RM(lastLog.weight, lastLog.reps),
      source: 'log',
    };
  }
  // 2. Fall back to diagnostic estimate
  const diag = getDiagnostic();
  if (diag) {
    const entry = diag.entries.find(e => e.exercise.toLowerCase() === exerciseName.toLowerCase());
    if (entry) {
      return {
        weight: entry.workingWeight,
        reps: entry.reps,
        estimated1RM: entry.adjusted1RM || entry.estimated1RM,
        source: 'diagnostic',
      };
    }
  }
  // 3. No data
  return null;
}

// ── Strength Level Classification ────────────────────────

export function getStrengthLevel(exercise: string, bwRatio: number): string {
  const e = exercise.toLowerCase();
  if (e.includes('bench') && !e.includes('incline') && !e.includes('close')) {
    if (bwRatio < 0.5) return 'Beginner';
    if (bwRatio < 0.75) return 'Novice';
    if (bwRatio < 1.0) return 'Intermediate';
    if (bwRatio < 1.25) return 'Advanced';
    return 'Elite';
  }
  if (e.includes('squat') && !e.includes('front') && !e.includes('goblet') && !e.includes('split')) {
    if (bwRatio < 0.75) return 'Beginner';
    if (bwRatio < 1.0) return 'Novice';
    if (bwRatio < 1.5) return 'Intermediate';
    if (bwRatio < 2.0) return 'Advanced';
    return 'Elite';
  }
  if (e.includes('deadlift') && !e.includes('romanian') && !e.includes('rdl')) {
    if (bwRatio < 1.0) return 'Beginner';
    if (bwRatio < 1.25) return 'Novice';
    if (bwRatio < 1.75) return 'Intermediate';
    if (bwRatio < 2.5) return 'Advanced';
    return 'Elite';
  }
  if (e.includes('overhead press') || e.includes('ohp') || e.includes('military press')) {
    if (bwRatio < 0.35) return 'Beginner';
    if (bwRatio < 0.55) return 'Novice';
    if (bwRatio < 0.75) return 'Intermediate';
    if (bwRatio < 1.0) return 'Advanced';
    return 'Elite';
  }
  if (e.includes('row') && (e.includes('barbell') || e.includes('bb'))) {
    if (bwRatio < 0.5) return 'Beginner';
    if (bwRatio < 0.75) return 'Novice';
    if (bwRatio < 1.0) return 'Intermediate';
    if (bwRatio < 1.25) return 'Advanced';
    return 'Elite';
  }
  // For dumbbell exercises, use same ratios as bench but double the weight
  if (e.includes('dumbbell') || e.includes('db') || e.includes('goblet')) {
    const adjRatio = bwRatio * 2; // double for comparison
    if (adjRatio < 0.5) return 'Beginner';
    if (adjRatio < 0.75) return 'Novice';
    if (adjRatio < 1.0) return 'Intermediate';
    if (adjRatio < 1.25) return 'Advanced';
    return 'Elite';
  }
  // Default: use bench press scale
  if (bwRatio < 0.5) return 'Beginner';
  if (bwRatio < 0.75) return 'Novice';
  if (bwRatio < 1.0) return 'Intermediate';
  if (bwRatio < 1.25) return 'Advanced';
  return 'Elite';
}

export function getRpeFactor(rpe: number): number {
  if (rpe <= 7) return 1.08;
  if (rpe === 8) return 1.04;
  if (rpe === 9) return 1.01;
  return 1.0; // RPE 10
}

// ── 1RM Calculation ───────────────────────────────────────

export function calculate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

// ── Migration: pull old data forward on first load ────────

export function migrateOldData(): void {
  // Only run once
  if (read<boolean>('ec_migrated_v2', false)) return;

  // Try to pull programs from any old key
  const oldKeys = ['ec_saved_programs', 'elite-coach-saved-programs'];
  for (const key of oldKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const programs = JSON.parse(raw);
        if (Array.isArray(programs) && programs.length > 0 && getPrograms().length === 0) {
          write(PROGRAMS_KEY, programs);
          console.log('[migration] pulled', programs.length, 'programs from', key);
        }
      }
    } catch { /* skip */ }
  }

  // Try to pull active program
  const activeKeys = ['ec_active_program_id', 'elite-coach-active-program-id', 'elite-coach-active-program'];
  for (const key of activeKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw && !getActiveProgram()) {
        const val = JSON.parse(raw);
        // Could be an ID string or a full program object
        if (typeof val === 'string') {
          // It's an ID — find the program
          const programs = getPrograms();
          const found = programs.find(p => p.id === val);
          if (found) setActiveProgram(found);
        } else if (val && val.content) {
          // It's a full program object
          setActiveProgram(val);
        }
        if (getActiveProgram()) {
          console.log('[migration] pulled active program from', key);
          break;
        }
      }
    } catch { /* skip */ }
  }

  // Try to pull chat history
  const chatKeys = ['ec_chat_history', 'elite_coach_chat_history', 'elite-coach-chat-history', 'elite-coach-conversations'];
  for (const key of chatKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw && getConversations().length === 0) {
        const convos = JSON.parse(raw);
        if (Array.isArray(convos) && convos.length > 0) {
          write(CHAT_KEY, convos);
          console.log('[migration] pulled', convos.length, 'conversations from', key);
        }
      }
    } catch { /* skip */ }
  }

  // Pull body stats
  try {
    const raw = localStorage.getItem('elite-coach-body-stats');
    if (raw && getBodyStats().length === 0) {
      const stats = JSON.parse(raw);
      if (Array.isArray(stats) && stats.length > 0) {
        write(BODY_KEY, stats);
        console.log('[migration] pulled', stats.length, 'body stats');
      }
    }
  } catch { /* skip */ }

  // Pull profile
  try {
    const raw = localStorage.getItem('elite-coach-user-profile');
    if (raw && !getProfile()) {
      write(PROFILE_KEY, JSON.parse(raw));
      console.log('[migration] pulled profile');
    }
  } catch { /* skip */ }

  // Pull dark mode
  try {
    const raw = localStorage.getItem('elite-coach-dark-mode');
    if (raw) write(DARK_MODE_KEY, JSON.parse(raw));
  } catch { /* skip */ }

  // Pull workout logs
  try {
    const raw = localStorage.getItem('ec_workout_logs');
    if (raw && getWorkoutLogs().length === 0) {
      const logs = JSON.parse(raw);
      if (Array.isArray(logs) && logs.length > 0) {
        // Normalize field names
        const normalized = logs.map((l: Record<string, unknown>) => ({
          exercise: l.exercise || l.exerciseName || '',
          weight: l.weight || 0,
          reps: l.reps || 0,
          sets: l.sets || 1,
          date: l.date || '',
          estimated1RM: l.estimated1RM || l.estimated1rm || 0,
        }));
        write(LOGS_KEY, normalized);
        console.log('[migration] pulled', normalized.length, 'workout logs');
      }
    }
  } catch { /* skip */ }

  // Pull completions
  try {
    const raw = localStorage.getItem('ec_workout_completions');
    if (raw && getCompletions().length === 0) {
      const completions = JSON.parse(raw);
      if (Array.isArray(completions) && completions.length > 0) {
        write(STATS_KEY, { completions });
        console.log('[migration] pulled', completions.length, 'completions');
      }
    }
  } catch { /* skip */ }

  write('ec_migrated_v2', true);
  console.log('[migration] complete');
}
