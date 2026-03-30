import { WhoopData } from '@/types';

export const MOCK_WHOOP_DATA: WhoopData = {
  today: {
    recovery_score: 78,
    color: 'green',
    resting_hr: 52,
    hrv: 98,
    spo2: 97,
    skin_temp: 33.2,
  },
  recovery: [
    { date: '03/24', score: 82, color: 'green' },
    { date: '03/25', score: 45, color: 'yellow' },
    { date: '03/26', score: 71, color: 'green' },
    { date: '03/27', score: 38, color: 'yellow' },
    { date: '03/28', score: 89, color: 'green' },
    { date: '03/29', score: 29, color: 'red' },
    { date: '03/30', score: 78, color: 'green' },
  ],
  sleep: [
    { date: '03/24', total: 7.8, deep: 1.9, rem: 2.1, light: 3.8, efficiency: 92 },
    { date: '03/25', total: 6.2, deep: 1.2, rem: 1.5, light: 3.5, efficiency: 78 },
    { date: '03/26', total: 8.1, deep: 2.1, rem: 2.3, light: 3.7, efficiency: 95 },
    { date: '03/27', total: 5.9, deep: 1.0, rem: 1.3, light: 3.6, efficiency: 72 },
    { date: '03/28', total: 7.5, deep: 1.8, rem: 2.0, light: 3.7, efficiency: 88 },
    { date: '03/29', total: 6.8, deep: 1.4, rem: 1.7, light: 3.7, efficiency: 82 },
    { date: '03/30', total: 7.9, deep: 2.0, rem: 2.2, light: 3.7, efficiency: 91 },
  ],
  strain: [
    { date: '03/24', strain: 14.2, avg_hr: 72, max_hr: 178 },
    { date: '03/25', strain: 8.5, avg_hr: 65, max_hr: 142 },
    { date: '03/26', strain: 16.1, avg_hr: 78, max_hr: 185 },
    { date: '03/27', strain: 11.3, avg_hr: 70, max_hr: 165 },
    { date: '03/28', strain: 15.8, avg_hr: 76, max_hr: 182 },
    { date: '03/29', strain: 5.2, avg_hr: 58, max_hr: 120 },
    { date: '03/30', strain: 13.5, avg_hr: 74, max_hr: 176 },
  ],
};
