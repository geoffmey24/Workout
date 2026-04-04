export interface ExerciseVideo {
  name: string;
  videoId: string;
  channel: string;
}

export const EXERCISE_VIDEOS: ExerciseVideo[] = [
  // ── Compound Lifts (15) ──────────────────────────────────────────────
  { name: "Barbell Back Squat", videoId: "bEv6CCg2BC8", channel: "Squat University" },
  { name: "Front Squat", videoId: "m4ytaCJZpl0", channel: "Jeff Nippard" },
  { name: "Conventional Deadlift", videoId: "op9kVnSso6Q", channel: "Jeff Nippard" },
  { name: "Sumo Deadlift", videoId: "9JNZyVfkKhc", channel: "Jeff Nippard" },
  { name: "Romanian Deadlift", videoId: "jEy_czb3RKA", channel: "Jeff Nippard" },
  { name: "Bench Press", videoId: "4Y2ZdHCOXok", channel: "Jeff Nippard" },
  { name: "Incline Bench Press", videoId: "8iPEnn-ltC8", channel: "Jeff Nippard" },
  { name: "Overhead Press", videoId: "QAQ64hK4Xxs", channel: "Jeff Nippard" },
  { name: "Barbell Row", videoId: "FWJR5Ve8bnQ", channel: "AthleanX" },
  { name: "Pendlay Row", videoId: "ZlRrIsoDpKg", channel: "AthleanX" },
  { name: "Pull-up", videoId: "eGo4IYlbE5g", channel: "Jeff Nippard" },
  { name: "Chin-up", videoId: "brhRXlOhsAM", channel: "Jeff Nippard" },
  { name: "Dip", videoId: "2z8JmcrW-As", channel: "AthleanX" },
  { name: "Hip Thrust", videoId: "SEdqd1n0cvg", channel: "Jeff Nippard" },
  { name: "Trap Bar Deadlift", videoId: "cf5bqQVOjhc", channel: "Jeff Nippard" },

  // ── Leg Exercises (12) ───────────────────────────────────────────────
  { name: "Leg Press", videoId: "IZxyjW7MPJQ", channel: "Jeff Nippard" },
  { name: "Bulgarian Split Squat", videoId: "2C-uNgKwPLE", channel: "Jeff Nippard" },
  { name: "Walking Lunges", videoId: "D7KaRcUTQeE", channel: "AthleanX" },
  { name: "Leg Extension", videoId: "YyvSfVjQeL0", channel: "Renaissance Periodization" },
  { name: "Leg Curl", videoId: "1Tq3QdYUuHs", channel: "Renaissance Periodization" },
  { name: "Calf Raise", videoId: "JbyjNymZOt0", channel: "Jeff Nippard" },
  { name: "Goblet Squat", videoId: "MeIiIdhvXT4", channel: "Mind Pump Media" },
  { name: "Step-up", videoId: "dQqApCGd5Ss", channel: "AthleanX" },
  { name: "Hack Squat", videoId: "0tn5K9NlCfo", channel: "Renaissance Periodization" },
  { name: "Good Morning", videoId: "YA-h3n9L4YU", channel: "Jeff Nippard" },
  { name: "Sissy Squat", videoId: "RjexvOAsVtI", channel: "Squat University" },
  { name: "Nordic Curl", videoId: "BfGFBMSfkHs", channel: "Squat University" },

  // ── Chest Exercises (8) ──────────────────────────────────────────────
  { name: "Dumbbell Bench Press", videoId: "VmB1G1K7v94", channel: "Jeff Nippard" },
  { name: "Incline Dumbbell Press", videoId: "8iPEnn-ltC8", channel: "Jeff Nippard" },
  { name: "Cable Fly", videoId: "Iwe6AmxVf7o", channel: "Jeff Nippard" },
  { name: "Dumbbell Fly", videoId: "eozdVDA78K0", channel: "AthleanX" },
  { name: "Push-up", videoId: "IODxDxX7oi4", channel: "AthleanX" },
  { name: "Decline Bench Press", videoId: "LfyQBUKR8SE", channel: "Jeff Nippard" },
  { name: "Chest Dip", videoId: "wjUmnZH528Y", channel: "AthleanX" },
  { name: "Landmine Press", videoId: "Dvlqa4VSkBc", channel: "Mind Pump Media" },

  // ── Back Exercises (10) ──────────────────────────────────────────────
  { name: "Lat Pulldown", videoId: "CAwf7n6Luuc", channel: "Jeff Nippard" },
  { name: "Seated Cable Row", videoId: "GZbfZ033f74", channel: "Jeff Nippard" },
  { name: "T-Bar Row", videoId: "j3Igk5nyZE4", channel: "AthleanX" },
  { name: "Dumbbell Row", videoId: "pYcpY20QaE8", channel: "Jeff Nippard" },
  { name: "Face Pull", videoId: "rep-qVOkqgk", channel: "AthleanX" },
  { name: "Straight Arm Pulldown", videoId: "AjCCGN2tU3Q", channel: "Renaissance Periodization" },
  { name: "Meadows Row", videoId: "H75im3p3hik", channel: "AthleanX" },
  { name: "Cable Row", videoId: "xQNrFHEMhI4", channel: "Renaissance Periodization" },
  { name: "Chest Supported Row", videoId: "H75im3p3hik", channel: "Jeff Nippard" },
  { name: "Rack Pull", videoId: "V2lAm_QLRWU", channel: "AthleanX" },

  // ── Shoulder Exercises (8) ───────────────────────────────────────────
  { name: "Lateral Raise", videoId: "3VcKaXpzqRo", channel: "Jeff Nippard" },
  { name: "Front Raise", videoId: "gzDe1TK45r4", channel: "Renaissance Periodization" },
  { name: "Rear Delt Fly", videoId: "EA7u4Q_8HQ0", channel: "Jeff Nippard" },
  { name: "Arnold Press", videoId: "6Z15_WdXmVw", channel: "Jeff Nippard" },
  { name: "Upright Row", videoId: "amCU-ziHITM", channel: "AthleanX" },
  { name: "Cable Lateral Raise", videoId: "PPrzBWZDOhA", channel: "Renaissance Periodization" },
  { name: "Seated Dumbbell Press", videoId: "qEwKCR5JCog", channel: "Jeff Nippard" },

  // ── Arm Exercises (10) ───────────────────────────────────────────────
  { name: "Barbell Curl", videoId: "kwG2ipFRgFo", channel: "Jeff Nippard" },
  { name: "Dumbbell Curl", videoId: "ykJmrZ5v0Oo", channel: "Jeff Nippard" },
  { name: "Hammer Curl", videoId: "TwD-YGVP4Bk", channel: "Jeff Nippard" },
  { name: "Preacher Curl", videoId: "fIWP-FRFNU0", channel: "Renaissance Periodization" },
  { name: "Tricep Pushdown", videoId: "2-LAMcpzODU", channel: "Jeff Nippard" },
  { name: "Skull Crusher", videoId: "d_KZxkY_0cM", channel: "Jeff Nippard" },
  { name: "Overhead Tricep Extension", videoId: "YbX7Wd8jQ-Q", channel: "AthleanX" },
  { name: "Close Grip Bench Press", videoId: "nEF0bv2FW94", channel: "Jeff Nippard" },
  { name: "EZ Bar Curl", videoId: "kwG2ipFRgFo", channel: "Jeff Nippard" },
  { name: "Cable Curl", videoId: "NFzTWp2qpiE", channel: "Renaissance Periodization" },

  // ── Core Exercises (7) ───────────────────────────────────────────────
  { name: "Plank", videoId: "ASdvN_XEl_c", channel: "AthleanX" },
  { name: "Ab Wheel Rollout", videoId: "rqiTPmK0MFY", channel: "AthleanX" },
  { name: "Cable Crunch", videoId: "AV5PmrJOcZQ", channel: "Renaissance Periodization" },
  { name: "Hanging Leg Raise", videoId: "hdng3Nm1x30", channel: "AthleanX" },
  { name: "Russian Twist", videoId: "wkD8rjkodUI", channel: "AthleanX" },
  { name: "Dead Bug", videoId: "4XLEnwUr1d8", channel: "Squat University" },
  { name: "Pallof Press", videoId: "AH_QZLm_0-s", channel: "Mind Pump Media" },

  // ── Conditioning (5) ─────────────────────────────────────────────────
  { name: "Kettlebell Swing", videoId: "YSxHifyI6s8", channel: "Mind Pump Media" },
  { name: "Battle Ropes", videoId: "sP_1TDAY9OY", channel: "AthleanX" },
  { name: "Box Jump", videoId: "hxrMm0YMKcA", channel: "Squat University" },
  { name: "Sled Push", videoId: "aAsgBGnqo_I", channel: "Mind Pump Media" },
  { name: "Farmers Walk", videoId: "rt17lmnaLSM", channel: "AthleanX" },
];

/**
 * Fuzzy match an exercise name against the lookup table using
 * case-insensitive substring matching in both directions.
 */
export function getVideoForExercise(
  exerciseName: string,
): { url: string; channel: string } | null {
  const query = exerciseName.toLowerCase().trim();

  const match = EXERCISE_VIDEOS.find((v) => {
    const name = v.name.toLowerCase();
    return name.includes(query) || query.includes(name);
  });

  if (!match) return null;

  return {
    url: `https://www.youtube.com/watch?v=${match.videoId}`,
    channel: match.channel,
  };
}

/**
 * Returns a direct YouTube video URL for a known exercise, or falls back
 * to a YouTube search URL for proper form guidance.
 */
export function getVideoUrl(exerciseName: string): string {
  const result = getVideoForExercise(exerciseName);
  if (result) return result.url;

  return `https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + " proper form")}`;
}
