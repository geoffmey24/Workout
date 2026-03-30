export interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  imageType?: string;
}

export interface ContentBlock {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export interface ApiMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface WhoopDay {
  date: string;
  score: number;
  color: 'green' | 'yellow' | 'red';
}

export interface SleepDay {
  date: string;
  total: number;
  deep: number;
  rem: number;
  light: number;
  efficiency: number;
}

export interface StrainDay {
  date: string;
  strain: number;
  avg_hr: number;
  max_hr: number;
}

export interface WhoopData {
  today: {
    recovery_score: number;
    color: 'green' | 'yellow' | 'red';
    resting_hr: number;
    hrv: number;
    spo2: number;
    skin_temp: number;
  };
  recovery: WhoopDay[];
  sleep: SleepDay[];
  strain: StrainDay[];
}

export interface WorkoutDay {
  id: number;
  name: string;
  subtitle: string;
  time: string;
  icon: string;
}
