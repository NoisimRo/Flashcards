import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface StatTileData {
  icon: LucideIcon;
  value: string | React.ReactNode;
  label: string;
  sublabel?: string | React.ReactNode;
  color: string;
}

interface StatTileProps {
  stat: StatTileData;
}

export const StatTile: React.FC<StatTileProps> = ({ stat }) => (
  <div className="bg-[var(--card-bg)] rounded-xl p-3 md:p-5 shadow-sm text-center">
    <stat.icon
      size={20}
      className="mx-auto mb-1 md:mb-2 w-5 h-5 md:w-6 md:h-6"
      style={{ color: stat.color }}
    />
    <div className="text-lg md:text-2xl font-bold text-[var(--text-primary)]">{stat.value}</div>
    <div className="text-xs md:text-sm text-[var(--text-tertiary)]">{stat.label}</div>
    {stat.sublabel && (
      <div className="text-[10px] md:text-xs text-[var(--text-muted)] mt-0.5">{stat.sublabel}</div>
    )}
  </div>
);

interface StatTileGridProps {
  stats: StatTileData[];
  columns?: 2 | 3 | 6;
}

export const StatTileGrid: React.FC<StatTileGridProps> = ({ stats, columns = 3 }) => {
  const gridClass =
    columns === 6
      ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4'
      : columns === 2
        ? 'grid grid-cols-2 gap-4'
        : 'grid grid-cols-3 gap-4';

  return (
    <div className={gridClass}>
      {stats.map((stat, i) => (
        <StatTile key={i} stat={stat} />
      ))}
    </div>
  );
};
