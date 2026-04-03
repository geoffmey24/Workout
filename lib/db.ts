import { createClient } from './supabase';
import { SavedProgram } from './program-history';

function getSupabase() {
  return createClient();
}

// Check if Supabase is properly configured
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!url && !url.includes('your-project');
}

// ── localStorage helpers for fallback ──────────────────
const LS_PROGRAMS_KEY = 'elite-coach-saved-programs';
const LS_ACTIVE_KEY = 'elite-coach-active-program-id';
const LS_STATS_KEY = 'elite-coach-workout-stats';
const LS_CONVOS_KEY = 'elite-coach-conversations';

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function lsSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('[lsSet] Failed to write', key, e);
    // If quota exceeded, try to clear old data and retry
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      try {
        localStorage.removeItem('elite-coach-skipped-days');
        localStorage.setItem(key, JSON.stringify(value));
        console.log('[lsSet] Retry succeeded after clearing old data');
      } catch { /* truly full */ }
    }
  }
}

// ── Saved Programs ──────────────────────────────────────

export async function dbGetSavedPrograms(userId: string): Promise<SavedProgram[]> {
  console.log('[dbGetSavedPrograms] fetching for user:', userId, 'supabase configured:', isSupabaseConfigured());
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabase()
        .from('saved_programs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error && data && data.length > 0) {
        console.log('[dbGetSavedPrograms] got', data.length, 'from Supabase');
        return data.map(row => ({
          id: row.id,
          title: row.title,
          answers: row.answers || {},
          content: row.content,
          createdAt: new Date(row.created_at).getTime(),
          isActive: row.is_active || false,
        }));
      }
      console.log('[dbGetSavedPrograms] Supabase returned empty or error:', error?.message);
    } catch (e) {
      console.log('[dbGetSavedPrograms] Supabase exception, falling through:', e);
    }
  }

  // localStorage fallback
  const programs: SavedProgram[] = lsGet(LS_PROGRAMS_KEY, []);
  const activeId = lsGet<string | null>(LS_ACTIVE_KEY, null);
  console.log('[dbGetSavedPrograms] localStorage has', programs.length, 'programs, activeId:', activeId);
  return programs.map(p => ({ ...p, isActive: p.id === activeId }));
}

export async function dbSaveProgram(userId: string, program: SavedProgram): Promise<void> {
  console.log('[dbSaveProgram] saving program:', program.id, program.title, 'for user:', userId);
  if (isSupabaseConfigured()) {
    try {
      const { error } = await getSupabase().from('saved_programs').insert({
        id: program.id,
        user_id: userId,
        title: program.title,
        answers: program.answers,
        content: program.content,
      });
      if (!error) {
        console.log('[dbSaveProgram] saved to Supabase successfully');
        return;
      }
      console.warn('[dbSaveProgram] Supabase save failed, using localStorage:', error.message);
    } catch (e) {
      console.warn('[dbSaveProgram] Supabase exception, falling through to localStorage:', e);
    }
  }

  // localStorage fallback
  console.log('[dbSaveProgram] saving to localStorage');
  const programs: SavedProgram[] = lsGet(LS_PROGRAMS_KEY, []);
  programs.unshift(program);
  lsSet(LS_PROGRAMS_KEY, programs.slice(0, 20));
  // Verify the save worked
  const verify = lsGet<SavedProgram[]>(LS_PROGRAMS_KEY, []);
  console.log('[dbSaveProgram] localStorage now has', verify.length, 'programs, ids:', verify.map(p => p.id));
}

export async function dbDeleteProgram(programId: string): Promise<void> {
  console.log('[dbDeleteProgram] deleting program:', programId);
  if (isSupabaseConfigured()) {
    try {
      const { error } = await getSupabase().from('saved_programs').delete().eq('id', programId);
      if (!error) {
        console.log('[dbDeleteProgram] deleted from Supabase');
        const programs: SavedProgram[] = lsGet(LS_PROGRAMS_KEY, []);
        lsSet(LS_PROGRAMS_KEY, programs.filter(p => p.id !== programId));
        const activeId = lsGet<string | null>(LS_ACTIVE_KEY, null);
        if (activeId === programId) lsSet(LS_ACTIVE_KEY, null);
        return;
      }
      console.warn('[dbDeleteProgram] Supabase delete error:', error.message);
    } catch (e) {
      console.warn('[dbDeleteProgram] Supabase exception:', e);
    }
  }

  // localStorage fallback
  const programs: SavedProgram[] = lsGet(LS_PROGRAMS_KEY, []);
  const filtered = programs.filter(p => p.id !== programId);
  console.log('[dbDeleteProgram] localStorage: had', programs.length, 'now', filtered.length);
  lsSet(LS_PROGRAMS_KEY, filtered);
  const activeId = lsGet<string | null>(LS_ACTIVE_KEY, null);
  if (activeId === programId) {
    console.log('[dbDeleteProgram] clearing active program');
    lsSet(LS_ACTIVE_KEY, null);
  }
}

export async function dbGetActiveProgram(userId: string): Promise<SavedProgram | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabase()
        .from('saved_programs')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)
        .single();
      if (!error && data) {
        return {
          id: data.id,
          title: data.title,
          answers: data.answers || {},
          content: data.content,
          createdAt: new Date(data.created_at).getTime(),
        };
      }
    } catch { /* fall through */ }
  }

  // localStorage fallback
  const activeId = lsGet<string | null>(LS_ACTIVE_KEY, null);
  if (!activeId) return null;
  const programs: SavedProgram[] = lsGet(LS_PROGRAMS_KEY, []);
  return programs.find(p => p.id === activeId) || null;
}

export async function dbSetActiveProgram(userId: string, programId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await getSupabase()
        .from('saved_programs')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);
      const { error } = await getSupabase()
        .from('saved_programs')
        .update({ is_active: true })
        .eq('id', programId);
      if (!error) {
        lsSet(LS_ACTIVE_KEY, programId);
        return;
      }
    } catch { /* fall through */ }
  }

  // localStorage fallback
  lsSet(LS_ACTIVE_KEY, programId);
}

// ── Chat Conversations ──────────────────────────────────

export interface DbConversation {
  id: string;
  title: string;
  messages: any[];
  createdAt: number;
  updatedAt: number;
}

export async function dbGetConversations(userId: string): Promise<DbConversation[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabase()
        .from('chat_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(20);
      if (!error && data) {
        return data.map(row => ({
          id: row.id,
          title: row.title || 'New Chat',
          messages: row.messages || [],
          createdAt: new Date(row.created_at).getTime(),
          updatedAt: new Date(row.updated_at).getTime(),
        }));
      }
    } catch { /* fall through */ }
  }

  return lsGet<DbConversation[]>(LS_CONVOS_KEY, []);
}

export async function dbSaveConversation(userId: string, convo: DbConversation): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await getSupabase().from('chat_conversations').upsert({
        id: convo.id,
        user_id: userId,
        title: convo.title,
        messages: convo.messages,
        updated_at: new Date().toISOString(),
      });
      if (!error) {
        // Also save to localStorage as backup
        const convos: DbConversation[] = lsGet(LS_CONVOS_KEY, []);
        const idx = convos.findIndex(c => c.id === convo.id);
        if (idx >= 0) convos[idx] = convo;
        else convos.unshift(convo);
        lsSet(LS_CONVOS_KEY, convos.slice(0, 20));
        return;
      }
    } catch { /* fall through */ }
  }

  // localStorage fallback
  const convos: DbConversation[] = lsGet(LS_CONVOS_KEY, []);
  const idx = convos.findIndex(c => c.id === convo.id);
  if (idx >= 0) convos[idx] = convo;
  else convos.unshift(convo);
  lsSet(LS_CONVOS_KEY, convos.slice(0, 20));
}

export async function dbDeleteConversation(convoId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await getSupabase().from('chat_conversations').delete().eq('id', convoId);
    } catch { /* fall through */ }
  }
  const convos: DbConversation[] = lsGet(LS_CONVOS_KEY, []);
  lsSet(LS_CONVOS_KEY, convos.filter(c => c.id !== convoId));
}

// ── Workout Stats ──────────────────────────────────────

export interface DbWorkoutStats {
  completedWorkouts: Record<string, string[]>;
  streak: number;
  longestStreak: number;
  totalWorkouts: number;
  lastWorkoutDate: string | null;
}

const DEFAULT_STATS: DbWorkoutStats = {
  completedWorkouts: {},
  streak: 0,
  longestStreak: 0,
  totalWorkouts: 0,
  lastWorkoutDate: null,
};

export async function dbGetWorkoutStats(userId: string): Promise<DbWorkoutStats> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabase()
        .from('workout_stats')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (!error && data) {
        return {
          completedWorkouts: data.completed_workouts || {},
          streak: data.streak || 0,
          longestStreak: data.longest_streak || 0,
          totalWorkouts: data.total_workouts || 0,
          lastWorkoutDate: data.last_workout_date,
        };
      }
    } catch { /* fall through */ }
  }

  return lsGet<DbWorkoutStats>(LS_STATS_KEY, DEFAULT_STATS);
}

export async function dbSaveWorkoutStats(userId: string, stats: DbWorkoutStats): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await getSupabase().from('workout_stats').upsert({
        user_id: userId,
        completed_workouts: stats.completedWorkouts,
        streak: stats.streak,
        longest_streak: stats.longestStreak,
        total_workouts: stats.totalWorkouts,
        last_workout_date: stats.lastWorkoutDate,
        updated_at: new Date().toISOString(),
      });
    } catch { /* fall through */ }
  }

  lsSet(LS_STATS_KEY, stats);
}

function calculateStreak(completedWorkouts: Record<string, string[]>): number {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const key = d.toISOString().slice(0, 10);
    if (completedWorkouts[key] && completedWorkouts[key].length > 0) {
      streak++;
    } else if (i > 0) {
      break;
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export async function dbRecordWorkout(userId: string, dayId: number): Promise<DbWorkoutStats> {
  const stats = await dbGetWorkoutStats(userId);
  const today = new Date().toISOString().slice(0, 10);
  const dayStr = String(dayId);
  if (!stats.completedWorkouts[today]) stats.completedWorkouts[today] = [];
  if (stats.completedWorkouts[today].includes(dayStr)) return stats;

  stats.completedWorkouts[today].push(dayStr);
  stats.totalWorkouts += 1;
  stats.streak = calculateStreak(stats.completedWorkouts);
  if (stats.streak > stats.longestStreak) stats.longestStreak = stats.streak;
  stats.lastWorkoutDate = today;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  for (const date of Object.keys(stats.completedWorkouts)) {
    if (date < cutoffStr) delete stats.completedWorkouts[date];
  }

  await dbSaveWorkoutStats(userId, stats);
  return stats;
}

export function dbGetWeeklyStats(stats: DbWorkoutStats): { workoutsThisWeek: number; daysActive: number } {
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

// ── Health Connections ──────────────────────────────────

export async function dbGetHealthConnection(userId: string, provider: string) {
  if (!isSupabaseConfigured()) return null;
  const { data } = await getSupabase()
    .from('health_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();
  return data;
}

export async function dbSaveHealthConnection(
  userId: string,
  provider: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  await getSupabase().from('health_connections').upsert({
    user_id: userId,
    provider,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
  });
}

export async function dbDeleteHealthConnection(userId: string, provider: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await getSupabase().from('health_connections').delete().eq('user_id', userId).eq('provider', provider);
}

// ── Exercise Weight Tracking ──────────────────────────────

const LS_EXERCISE_LOG_KEY = 'elite-coach-exercise-log';

export interface ExerciseLogEntry {
  exercise: string;
  date: string;
  weight: number;
  reps: number;
  sets: number;
}

export function dbGetExerciseLog(): ExerciseLogEntry[] {
  return lsGet<ExerciseLogEntry[]>(LS_EXERCISE_LOG_KEY, []);
}

export function dbSaveExerciseLogEntry(entry: ExerciseLogEntry): void {
  const log = dbGetExerciseLog();
  log.push(entry);
  // Keep last 500 entries
  lsSet(LS_EXERCISE_LOG_KEY, log.slice(-500));
}

export function dbGetLastEntry(exercise: string): ExerciseLogEntry | null {
  const log = dbGetExerciseLog();
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i].exercise.toLowerCase() === exercise.toLowerCase()) return log[i];
  }
  return null;
}

export function dbGetExerciseHistory(exercise: string): ExerciseLogEntry[] {
  return dbGetExerciseLog().filter(e => e.exercise.toLowerCase() === exercise.toLowerCase());
}

export function dbGetPersonalRecords(): Record<string, ExerciseLogEntry> {
  const log = dbGetExerciseLog();
  const prs: Record<string, ExerciseLogEntry> = {};
  for (const entry of log) {
    const key = entry.exercise.toLowerCase();
    if (!prs[key] || entry.weight > prs[key].weight) {
      prs[key] = entry;
    }
  }
  return prs;
}

// ── Body Stats Tracking ──────────────────────────────────

const LS_BODY_STATS_KEY = 'elite-coach-body-stats';

export interface BodyStatEntry {
  date: string;
  weight?: number;
  bodyFat?: number;
  measurements?: Record<string, number>;
  notes?: string;
}

export function dbGetBodyStats(): BodyStatEntry[] {
  return lsGet<BodyStatEntry[]>(LS_BODY_STATS_KEY, []);
}

export function dbSaveBodyStat(entry: BodyStatEntry): void {
  const stats = dbGetBodyStats();
  // Replace if same date exists
  const idx = stats.findIndex(s => s.date === entry.date);
  if (idx >= 0) stats[idx] = entry;
  else stats.push(entry);
  stats.sort((a, b) => a.date.localeCompare(b.date));
  lsSet(LS_BODY_STATS_KEY, stats.slice(-365));
}

export function dbDeleteBodyStat(date: string): void {
  const stats = dbGetBodyStats();
  lsSet(LS_BODY_STATS_KEY, stats.filter(s => s.date !== date));
}

// ── Workout Notes ──────────────────────────────────────

const LS_WORKOUT_NOTES_KEY = 'elite-coach-workout-notes';

export interface WorkoutNote {
  date: string;
  dayName: string;
  note: string;
}

export function dbGetWorkoutNotes(): WorkoutNote[] {
  return lsGet<WorkoutNote[]>(LS_WORKOUT_NOTES_KEY, []);
}

export function dbSaveWorkoutNote(note: WorkoutNote): void {
  const notes = dbGetWorkoutNotes();
  notes.push(note);
  lsSet(LS_WORKOUT_NOTES_KEY, notes.slice(-100));
}

// ── User Profile / Onboarding ──────────────────────────

const LS_USER_PROFILE_KEY = 'elite-coach-user-profile';

export interface UserProfile {
  name: string;
  onboardingComplete: boolean;
}

export function dbGetUserProfile(): UserProfile | null {
  return lsGet<UserProfile | null>(LS_USER_PROFILE_KEY, null);
}

export function dbSaveUserProfile(profile: UserProfile): void {
  lsSet(LS_USER_PROFILE_KEY, profile);
}

// ── Dark Mode ──────────────────────────────────────────

const LS_DARK_MODE_KEY = 'elite-coach-dark-mode';

export function dbGetDarkMode(): boolean {
  return lsGet<boolean>(LS_DARK_MODE_KEY, false);
}

export function dbSetDarkMode(dark: boolean): void {
  lsSet(LS_DARK_MODE_KEY, dark);
}
