import { WorkoutDay } from '@/types';

export const DAYS: WorkoutDay[] = [
  { id: 1, name: 'Day 1', subtitle: 'Lower + Plyos + Rotation', time: '60-75 min', icon: '🦵' },
  { id: 2, name: 'Day 2', subtitle: 'Upper Strength/Power + Bag', time: '60-75 min', icon: '💪' },
  { id: 3, name: 'Day 3', subtitle: 'VO2 Max + Mobility', time: '60-75 min', icon: '🫀' },
  { id: 4, name: 'Day 4', subtitle: 'Mixed Power + Fighter Circuit', time: '60-75 min', icon: '🥊' },
  { id: 5, name: 'Recovery', subtitle: 'Active recovery & mobility', time: '45-60 min', icon: '🧘' },
];

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
}

export interface WorkoutSection {
  title: string;
  exercises: Exercise[];
}

export const WORKOUTS: Record<number, { sections: WorkoutSection[] }> = {
  1: {
    sections: [
      {
        title: 'Warm-up (10 min)',
        exercises: [
          { name: 'Assault Bike', sets: 1, reps: '5 min easy', rest: '-' },
          { name: 'Dynamic Patterns', sets: 1, reps: '3 min', rest: '-' },
          { name: 'BOSU Balance Drills', sets: 1, reps: '2 min', rest: '-' },
        ],
      },
      {
        title: 'Plyometrics',
        exercises: [
          { name: 'Hurdle Hops', sets: 3, reps: '5', rest: '90s' },
          { name: 'Lateral Bounds', sets: 3, reps: '5 each', rest: '90s' },
          { name: 'Med Ball Chest Passes', sets: 3, reps: '8', rest: '75s' },
          { name: 'Rotational Throws', sets: 3, reps: '6 each', rest: '75s' },
          { name: 'Overhead Slams', sets: 3, reps: '8', rest: '60s' },
        ],
      },
      {
        title: 'Strength',
        exercises: [
          { name: 'Slant Board Smith Squats', sets: 4, reps: '8 @ RPE 8', rest: '2-3 min' },
          { name: 'Bulgarian Split Squats', sets: 3, reps: '10 each @ RPE 7-8', rest: '90s' },
        ],
      },
      {
        title: 'Assistance',
        exercises: [
          { name: 'Banded Hip Thrusts', sets: 3, reps: '12', rest: '60s' },
          { name: 'Cable Woodchops', sets: 3, reps: '10 each', rest: '60s' },
          { name: 'DB Romanian Deadlifts', sets: 3, reps: '10', rest: '60s' },
        ],
      },
      {
        title: 'Finisher',
        exercises: [
          { name: 'Sled Push OR Air Bike Sprints', sets: 4, reps: '40yd / 20s', rest: '90-120s' },
        ],
      },
      {
        title: 'Stretch Block (10 min)',
        exercises: [
          { name: 'Hip Flexor Couch Stretch', sets: 1, reps: '90s each', rest: '-' },
          { name: 'Hamstring Stretch', sets: 1, reps: '90s each', rest: '-' },
          { name: 'Glute/Piriformis Stretch', sets: 1, reps: '90s each', rest: '-' },
        ],
      },
    ],
  },
  2: {
    sections: [
      {
        title: 'Warm-up (10 min)',
        exercises: [
          { name: 'Assault Bike', sets: 1, reps: '5 min easy', rest: '-' },
          { name: 'Band Pull-Aparts & Arm Circles', sets: 1, reps: '2 min', rest: '-' },
          { name: 'BOSU Plank', sets: 2, reps: '30s', rest: '-' },
        ],
      },
      {
        title: 'Upper Plyometrics',
        exercises: [
          { name: 'Plyo Push-ups', sets: 3, reps: '5', rest: '90s' },
          { name: 'Med Ball Chest Pass', sets: 3, reps: '6', rest: '75s' },
        ],
      },
      {
        title: 'Strength',
        exercises: [
          { name: 'Bench Press / DB Bench', sets: 4, reps: '8 @ RPE 8', rest: '3 min' },
          { name: 'Chest-Supported Rows', sets: 4, reps: '10 @ RPE 7-8', rest: '2-3 min' },
        ],
      },
      {
        title: 'Shoulder Health',
        exercises: [
          { name: 'Half-Kneeling Landmine Press', sets: 3, reps: '8 each', rest: '75s' },
          { name: 'Face Pulls', sets: 3, reps: '15', rest: '45s' },
          { name: 'Band External Rotations', sets: 2, reps: '15 each', rest: '45s' },
        ],
      },
      {
        title: 'Conditioning',
        exercises: [
          { name: 'Air Bike Intervals', sets: 6, reps: '20s hard / 70-90s easy', rest: '-' },
          { name: 'Heavy Bag Rounds', sets: 3, reps: '3 min @ 70-80%', rest: '1 min' },
        ],
      },
      {
        title: 'Stretch Block (10 min)',
        exercises: [
          { name: 'Chest/Pec Stretch', sets: 1, reps: '90s each', rest: '-' },
          { name: 'Shoulder/Lat Stretch', sets: 1, reps: '90s each', rest: '-' },
        ],
      },
    ],
  },
  3: {
    sections: [
      {
        title: 'Warm-up (8 min)',
        exercises: [
          { name: 'Dynamic Warm-up', sets: 1, reps: '5 min', rest: '-' },
          { name: 'Mobility Flow', sets: 1, reps: '3 min', rest: '-' },
        ],
      },
      {
        title: 'VO2 Max Intervals',
        exercises: [
          { name: 'Option A: 4x4 min @ Zone 4-5', sets: 4, reps: '4 min hard', rest: '3 min' },
          { name: 'Option B: 8-10x45s @ max', sets: 8, reps: '45s', rest: '45s' },
        ],
      },
      {
        title: 'Mobility Circuit (2 rounds)',
        exercises: [
          { name: 'Cossack Squats', sets: 2, reps: '8 each', rest: '-' },
          { name: 'Single-Leg RDL', sets: 2, reps: '8 each', rest: '-' },
          { name: 'Banded Glute Bridge', sets: 2, reps: '15', rest: '-' },
          { name: 'Side Plank', sets: 2, reps: '30s each', rest: '60-90s' },
        ],
      },
      {
        title: 'Optional Light Bag',
        exercises: [
          { name: 'Light Bag Work @ 60%', sets: 3, reps: '2 min', rest: '60s' },
        ],
      },
      {
        title: 'Stretch Block (10 min)',
        exercises: [
          { name: 'Hip Flexor/Psoas Stretch', sets: 1, reps: '90s each', rest: '-' },
          { name: 'Hamstring Stretch', sets: 1, reps: '90s each', rest: '-' },
          { name: 'Full-Body Scan', sets: 1, reps: '3-5 min', rest: '-' },
        ],
      },
    ],
  },
  4: {
    sections: [
      {
        title: 'Warm-up (10 min)',
        exercises: [
          { name: 'Assault Bike', sets: 1, reps: '5 min easy', rest: '-' },
          { name: 'Shadow Footwork', sets: 1, reps: '2 min', rest: '-' },
          { name: 'Jump Squats', sets: 2, reps: '5', rest: '-' },
        ],
      },
      {
        title: 'Power Work',
        exercises: [
          { name: 'Jump Squats', sets: 3, reps: '5 @ max effort', rest: '2 min' },
          { name: 'Med Ball Overhead Slams', sets: 3, reps: '8', rest: '75s' },
        ],
      },
      {
        title: 'Strength',
        exercises: [
          { name: 'Goblet / Front Squats', sets: 3, reps: '10 @ RPE 7', rest: '90s' },
          { name: 'DB Bench Press', sets: 3, reps: '10 @ RPE 7', rest: '90s' },
          { name: 'Landmine Rotations', sets: 3, reps: '8 each @ RPE 7', rest: '60s' },
        ],
      },
      {
        title: 'Fighter Bag Circuit (3 rounds)',
        exercises: [
          { name: 'Speed Punches', sets: 3, reps: '30s', rest: '15s' },
          { name: 'Power Shots', sets: 3, reps: '30s', rest: '15s' },
          { name: 'Med Ball Rotational Throws', sets: 3, reps: '30s', rest: '15s' },
          { name: 'Sprawls', sets: 3, reps: '30s', rest: '2 min between rounds' },
        ],
      },
      {
        title: 'Stretch Block (10 min)',
        exercises: [
          { name: 'Full Body Stretches', sets: 1, reps: '7 min', rest: '-' },
          { name: 'Cool-Down Breathing', sets: 1, reps: '3 min', rest: '-' },
        ],
      },
    ],
  },
  5: {
    sections: [
      {
        title: 'Active Recovery',
        exercises: [
          { name: 'Easy Walk/Bike', sets: 1, reps: '20-30 min', rest: '-' },
          { name: 'Full Mobility Flow', sets: 1, reps: '15 min', rest: '-' },
          { name: 'Foam Rolling', sets: 1, reps: '10-15 min', rest: '-' },
          { name: 'Epsom Salt Bath', sets: 1, reps: '15-20 min', rest: '-' },
          { name: 'Full Stretch Routine', sets: 1, reps: '10-15 min', rest: '-' },
        ],
      },
    ],
  },
};
