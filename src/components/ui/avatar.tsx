import React from 'react';
import { cn } from '@/lib/utils';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

interface AvatarProps {
  name: string;
  color?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeStyles: Record<AvatarSize, string> = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
};

const defaultColors = [
  'bg-blue-500/20 text-blue-400',
  'bg-emerald-500/20 text-emerald-400',
  'bg-purple-500/20 text-purple-400',
  'bg-orange-500/20 text-orange-400',
  'bg-pink-500/20 text-pink-400',
  'bg-cyan-500/20 text-cyan-400',
];

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return defaultColors[Math.abs(hash) % defaultColors.length];
}

export function Avatar({ name, color, size = 'md', className }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  const colorClass = color || getColorForName(name);

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold shrink-0',
        colorClass,
        sizeStyles[size],
        className
      )}
      title={name}
    >
      {initial}
    </div>
  );
}
