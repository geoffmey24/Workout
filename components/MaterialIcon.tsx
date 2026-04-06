'use client';

interface MaterialIconProps {
  icon: string;
  filled?: boolean;
  size?: number;
  className?: string;
}

export default function MaterialIcon({ icon, filled, size = 24, className = '' }: MaterialIconProps) {
  return (
    <span
      className={`material-symbols-outlined ${filled ? 'filled' : ''} ${className}`}
      style={{ fontSize: size }}
    >
      {icon}
    </span>
  );
}
