import { WhoopData } from '@/types';

// Realistic sample data for Oura Ring sandbox/development mode.
// Activated when OURA_SANDBOX=true and no OURA_CLIENT_ID is set.
// Data mirrors what the real Oura API would return after transformation.

function recentDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export const OURA_SANDBOX_DATA: WhoopData = {
  today: {
    recovery_score: 82,
    color: 'green',
    resting_hr: 54,
    hrv: 48,
    spo2: 98,
    skin_temp: 33.2,
  },
  recovery: [
    { date: recentDate(6), score: 71, color: 'green' },
    { date: recentDate(5), score: 58, color: 'yellow' },
    { date: recentDate(4), score: 65, color: 'yellow' },
    { date: recentDate(3), score: 89, color: 'green' },
    { date: recentDate(2), score: 74, color: 'green' },
    { date: recentDate(1), score: 45, color: 'yellow' },
    { date: recentDate(0), score: 82, color: 'green' },
  ],
  sleep: [
    { date: recentDate(6), total: 7.2, deep: 1.4, rem: 1.8, light: 4.0, efficiency: 88 },
    { date: recentDate(5), total: 6.5, deep: 1.1, rem: 1.5, light: 3.9, efficiency: 82 },
    { date: recentDate(4), total: 7.8, deep: 1.6, rem: 2.0, light: 4.2, efficiency: 91 },
    { date: recentDate(3), total: 8.1, deep: 1.8, rem: 2.1, light: 4.2, efficiency: 93 },
    { date: recentDate(2), total: 7.0, deep: 1.3, rem: 1.7, light: 4.0, efficiency: 86 },
    { date: recentDate(1), total: 5.9, deep: 0.9, rem: 1.2, light: 3.8, efficiency: 78 },
    { date: recentDate(0), total: 7.5, deep: 1.5, rem: 1.9, light: 4.1, efficiency: 89 },
  ],
  strain: [
    { date: recentDate(6), strain: 12.4, avg_hr: 72, max_hr: 165 },
    { date: recentDate(5), strain: 8.2, avg_hr: 68, max_hr: 142 },
    { date: recentDate(4), strain: 14.8, avg_hr: 76, max_hr: 178 },
    { date: recentDate(3), strain: 10.1, avg_hr: 70, max_hr: 155 },
    { date: recentDate(2), strain: 16.3, avg_hr: 79, max_hr: 185 },
    { date: recentDate(1), strain: 6.5, avg_hr: 65, max_hr: 128 },
    { date: recentDate(0), strain: 11.7, avg_hr: 73, max_hr: 168 },
  ],
};
