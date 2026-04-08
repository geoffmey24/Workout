'use client';

import {
  Plus, Target, Wind, Building, ArrowLeft, ArrowRight, Zap,
  MessageSquare, Check, CheckCircle2, ChevronRight, ChevronUp, ChevronDown,
  X, ClipboardPaste, Trash2, Trophy, Heart, Dumbbell,
  ShieldCheck, Home, Image, Link, Link2Off, Flame, Lock, LogOut,
  BookOpen, Medal, HeartPulse, Scale, Trees, Pause, Play,
  User, Camera, CirclePlay, Loader2, RefreshCw, Save, Clock,
  PersonStanding, Send, Settings, Signal, Star,
  StickyNote, Ruler, Thermometer, Timer, TrendingUp, Wifi, WifiOff, Award,
  type LucideProps,
} from 'lucide-react';
import { type ComponentType } from 'react';

const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  add: Plus,
  adjust: Target,
  air: Wind,
  apartment: Building,
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  bolt: Zap,
  chat_bubble: MessageSquare,
  check: Check,
  check_circle: CheckCircle2,
  chevron_right: ChevronRight,
  close: X,
  content_paste: ClipboardPaste,
  delete: Trash2,
  emoji_events: Trophy,
  expand_less: ChevronUp,
  expand_more: ChevronDown,
  favorite: Heart,
  fitness_center: Dumbbell,
  health_and_safety: ShieldCheck,
  home: Home,
  image: Image,
  link: Link,
  link_off: Link2Off,
  local_fire_department: Flame,
  lock: Lock,
  logout: LogOut,
  menu_book: BookOpen,
  military_tech: Medal,
  monitor_heart: HeartPulse,
  monitor_weight: Scale,
  park: Trees,
  pause: Pause,
  person: User,
  photo_camera: Camera,
  play_arrow: Play,
  play_circle: CirclePlay,
  progress_activity: Loader2,
  refresh: RefreshCw,
  save: Save,
  schedule: Clock,
  self_improvement: PersonStanding,
  send: Send,
  settings: Settings,
  show_chart: TrendingUp,
  signal_cellular_alt: Signal,
  star: Star,
  sticky_note_2: StickyNote,
  straighten: Ruler,
  thermostat: Thermometer,
  timer: Timer,
  trending_up: TrendingUp,
  wifi: Wifi,
  wifi_off: WifiOff,
  workspace_premium: Award,
};

interface MaterialIconProps {
  icon: string;
  filled?: boolean;
  size?: number;
  className?: string;
}

export default function MaterialIcon({ icon, size = 24, className = '' }: MaterialIconProps) {
  const IconComponent = ICON_MAP[icon];
  if (!IconComponent) {
    return null;
  }
  return <IconComponent size={size} className={className} />;
}
