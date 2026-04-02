import { createClient } from './supabase';
import { SavedProgram } from './program-history';

function getSupabase() {
  return createClient();
}

// ── Saved Programs ──────────────────────────────────────

export async function dbGetSavedPrograms(userId: string): Promise<SavedProgram[]> {
  const { data } = await getSupabase()
    .from('saved_programs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (!data) return [];
  return data.map(row => ({
    id: row.id,
    title: row.title,
    answers: row.answers || {},
    content: row.content,
    createdAt: new Date(row.created_at).getTime(),
  }));
}

export async function dbSaveProgram(userId: string, program: SavedProgram): Promise<void> {
  await getSupabase().from('saved_programs').insert({
    id: program.id,
    user_id: userId,
    title: program.title,
    answers: program.answers,
    content: program.content,
  });
}

export async function dbDeleteProgram(programId: string): Promise<void> {
  await getSupabase().from('saved_programs').delete().eq('id', programId);
}

export async function dbGetActiveProgram(userId: string): Promise<SavedProgram | null> {
  const { data } = await getSupabase()
    .from('saved_programs')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    answers: data.answers || {},
    content: data.content,
    createdAt: new Date(data.created_at).getTime(),
  };
}

export async function dbSetActiveProgram(userId: string, programId: string): Promise<void> {
  // Clear previous active
  await getSupabase()
    .from('saved_programs')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true);
  // Set new active
  await getSupabase()
    .from('saved_programs')
    .update({ is_active: true })
    .eq('id', programId);
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
  const { data } = await getSupabase()
    .from('chat_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(20);
  if (!data) return [];
  return data.map(row => ({
    id: row.id,
    title: row.title || 'New Chat',
    messages: row.messages || [],
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  }));
}

export async function dbSaveConversation(userId: string, convo: DbConversation): Promise<void> {
  await getSupabase().from('chat_conversations').upsert({
    id: convo.id,
    user_id: userId,
    title: convo.title,
    messages: convo.messages,
    updated_at: new Date().toISOString(),
  });
}

export async function dbDeleteConversation(convoId: string): Promise<void> {
  await getSupabase().from('chat_conversations').delete().eq('id', convoId);
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
  const { data } = await getSupabase()
    .from('workout_stats')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (!data) return DEFAULT_STATS;
  return {
    completedWorkouts: data.completed_workouts || {},
    streak: data.streak || 0,
    longestStreak: data.longest_streak || 0,
    totalWorkouts: data.total_workouts || 0,
    lastWorkoutDate: data.last_workout_date,
  };
}

export async function dbSaveWorkoutStats(userId: string, stats: DbWorkoutStats): Promise<void> {
  await getSupabase().from('workout_stats').upsert({
    user_id: userId,
    completed_workouts: stats.completedWorkouts,
    streak: stats.streak,
    longest_streak: stats.longestStreak,
    total_workouts: stats.totalWorkouts,
    last_workout_date: stats.lastWorkoutDate,
    updated_at: new Date().toISOString(),
  });
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

  // Keep only last 90 days
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
  await getSupabase().from('health_connections').delete().eq('user_id', userId).eq('provider', provider);
}
