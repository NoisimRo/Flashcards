import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '../../../types';
import { Achievement, getAchievements } from '../../../api/achievements';
import {
  Target,
  Star,
  Zap,
  Library,
  Flame,
  Diamond,
  Crown,
  Calendar,
  Moon,
  Sunrise,
  Award,
  Trophy,
  Medal,
  Coins,
  Gem,
  Sparkles,
  Timer,
  Brain,
  BookCheck,
  Loader2,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  target: Target,
  star: Star,
  zap: Zap,
  library: Library,
  flame: Flame,
  diamond: Diamond,
  crown: Crown,
  calendar: Calendar,
  moon: Moon,
  sunrise: Sunrise,
  award: Award,
  trophy: Trophy,
  medal: Medal,
  coins: Coins,
  gem: Gem,
  sparkles: Sparkles,
  timer: Timer,
  brain: Brain,
  'book-check': BookCheck,
};

interface AchievementsProps {
  user: User;
}

export const Achievements: React.FC<AchievementsProps> = ({ user }) => {
  const { t, i18n } = useTranslation('achievements');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);

  // Fetch achievements on mount
  useEffect(() => {
    const fetchAchievements = async () => {
      setLoading(true);
      try {
        const response = await getAchievements();
        if (response.success && response.data) {
          setAchievements(response.data.achievements);
        }
      } catch (error) {
        console.error('Error fetching achievements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  // Map string icon names to components
  const getIcon = (name: string) => {
    return iconMap[name] || Star;
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto">
      <h1 className="text-3xl font-bold text-[var(--text-primary)]">{t('header.title')}</h1>
      <p className="text-[var(--text-tertiary)] mb-8">{t('header.subtitle')}</p>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl text-center">
          <p className="text-[var(--text-tertiary)] text-sm mb-2">{t('stats.badgesUnlocked')}</p>
          <div className="text-4xl font-bold text-[var(--text-primary)] mb-1">{unlockedCount}</div>
          <p className="text-xs text-[var(--text-muted)]">
            {t('stats.of', { total: achievements.length })}
          </p>
        </div>
        <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl text-center">
          <p className="text-[var(--text-tertiary)] text-sm mb-2">{t('stats.currentLevel')}</p>
          <div className="text-4xl font-bold text-[var(--text-primary)] mb-1">{user.level}</div>
          <p className="text-xs text-[var(--text-muted)]">
            {t('stats.xpToNextLevel', {
              xp: user.nextLevelXP - user.currentXP,
              level: user.level + 1,
            })}
          </p>
        </div>
        <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl text-center">
          <p className="text-[var(--text-tertiary)] text-sm mb-2">{t('stats.totalPoints')}</p>
          <div className="text-4xl font-bold text-[var(--text-primary)] mb-1">
            {user.totalXP.toLocaleString(i18n.language)}
          </div>
          <p className="text-xs text-[var(--text-muted)]">{t('stats.xpAccumulated')}</p>
        </div>
      </div>

      {/* Badge Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map(badge => {
          const Icon = getIcon(badge.icon);
          const howToEarnKey = `items.${badge.id}.howToEarn`;
          const howToEarn = t(howToEarnKey);
          // Only show tooltip if translation exists (not the raw key)
          const hasTooltip = howToEarn !== howToEarnKey;

          return (
            <div
              key={badge.id}
              className={`relative p-6 rounded-3xl border-2 flex flex-col items-center text-center transition-transform hover:-translate-y-1
                ${
                  badge.unlocked
                    ? 'bg-[var(--card-bg)] border-transparent shadow-sm'
                    : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)] opacity-60 grayscale'
                }
              `}
              onMouseEnter={() => setHoveredBadge(badge.id)}
              onMouseLeave={() => setHoveredBadge(null)}
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${badge.unlocked ? badge.color : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}
              >
                <Icon size={32} />
              </div>
              <h3 className="font-bold text-[var(--text-primary)] text-lg mb-1">
                {badge.titleKey ? String(t(badge.titleKey)) : badge.title}
              </h3>
              <p className="text-sm text-[var(--text-tertiary)] mb-4">
                {badge.descriptionKey ? String(t(badge.descriptionKey)) : badge.description}
              </p>

              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${badge.unlocked ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'}`}
              >
                {t('xpReward', { xp: badge.xpReward })}
              </span>

              {/* Tooltip */}
              {hoveredBadge === badge.id && hasTooltip && (
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-primary)] text-xs rounded-lg py-2 px-4 shadow-lg z-50 max-w-[250px] text-center whitespace-normal">
                  {howToEarn}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-[var(--bg-elevated)]" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
