import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '../../../types';
import { Achievement, getAchievements } from '../../../api/achievements';
import { isGuestUser } from '../../../utils/guestMode';
import { useAuthActions } from '../../../hooks/useAuthActions';
import achievementsData from '../../../data/seed/achievements.json';
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
  Lock,
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

  const isGuest = isGuestUser(user);
  const { handleRegisterClick } = useAuthActions();

  // Fetch achievements on mount
  useEffect(() => {
    if (isGuest) {
      // For guests: use seed data directly (all unlocked=false)
      const seedAchievements: Achievement[] = achievementsData.map(a => ({
        id: a.id,
        title: a.title,
        description: a.description,
        icon: a.icon,
        xpReward: a.xpReward,
        condition: a.condition,
        color: a.color,
        tier: a.tier,
        unlocked: false,
        unlockedAt: null,
        titleKey: `items.${a.id}.title`,
        descriptionKey: `items.${a.id}.description`,
      }));
      setAchievements(seedAchievements);
      setLoading(false);
      return;
    }

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
  }, [isGuest]);

  // Map string icon names to components
  const getIcon = (name: string) => {
    return iconMap[name] || Star;
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalXPAvailable = achievements.reduce((sum, a) => sum + a.xpReward, 0);

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

      {/* Guest CTA Banner */}
      {isGuest && (
        <div
          className="mb-8 rounded-2xl p-6 text-white relative overflow-hidden"
          style={{ background: 'var(--color-accent-gradient)' }}
        >
          <div className="relative z-10">
            <h2 className="text-xl font-bold mb-2">{t('guest.ctaBanner.title')}</h2>
            <p className="text-sm opacity-90 mb-4">
              {t('guest.ctaBanner.subtitle', { count: achievements.length })}
            </p>
            <button
              onClick={handleRegisterClick}
              className="bg-white font-bold px-6 py-3 rounded-xl transition-all hover:shadow-lg active:scale-[0.98]"
              style={{ color: 'var(--color-accent)' }}
            >
              {t('guest.ctaBanner.button')}
            </button>
          </div>
          <Trophy className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20" size={100} />
        </div>
      )}

      {/* Stats Summary */}
      {isGuest ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl text-center">
            <p className="text-[var(--text-tertiary)] text-sm mb-2">{t('guest.stats.available')}</p>
            <div className="text-4xl font-bold text-[var(--color-accent)] mb-1">
              {achievements.length}
            </div>
            <p className="text-xs text-[var(--text-muted)]">{t('guest.stats.badgesToUnlock')}</p>
          </div>
          <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl text-center">
            <p className="text-[var(--text-tertiary)] text-sm mb-2">{t('guest.stats.tiers')}</p>
            <div className="text-4xl font-bold text-[var(--text-primary)] mb-1">4</div>
            <p className="text-xs text-[var(--text-muted)]">{t('guest.stats.tierBreakdown')}</p>
          </div>
          <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl text-center">
            <p className="text-[var(--text-tertiary)] text-sm mb-2">{t('guest.stats.topReward')}</p>
            <div className="text-4xl font-bold text-[var(--text-primary)] mb-1">
              {totalXPAvailable.toLocaleString(i18n.language)}
            </div>
            <p className="text-xs text-[var(--text-muted)]">{t('guest.stats.xpAvailable')}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl text-center">
            <p className="text-[var(--text-tertiary)] text-sm mb-2">{t('stats.badgesUnlocked')}</p>
            <div className="text-4xl font-bold text-[var(--text-primary)] mb-1">
              {unlockedCount}
            </div>
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
      )}

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
                    : isGuest
                      ? 'bg-[var(--card-bg)] border-[var(--border-subtle)] shadow-sm'
                      : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)] opacity-60 grayscale'
                }
              `}
              onMouseEnter={() => setHoveredBadge(badge.id)}
              onMouseLeave={() => setHoveredBadge(null)}
            >
              {/* Lock overlay for guest unearned badges */}
              {!badge.unlocked && isGuest && (
                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/10 backdrop-blur-sm flex items-center justify-center">
                  <Lock size={16} className="text-[var(--text-muted)]" />
                </div>
              )}

              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  badge.unlocked || isGuest
                    ? badge.color
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                }`}
              >
                <Icon size={32} />
              </div>
              <h3 className="font-bold text-[var(--text-primary)] text-lg mb-1">
                {badge.titleKey ? String(t(badge.titleKey)) : badge.title}
              </h3>
              <p className="text-sm text-[var(--text-tertiary)] mb-2">
                {badge.descriptionKey ? String(t(badge.descriptionKey)) : badge.description}
              </p>

              {/* For guests, show howToEarn inline */}
              {isGuest && hasTooltip && (
                <p className="text-xs text-[var(--text-muted)] italic mb-3">{howToEarn}</p>
              )}

              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  badge.unlocked
                    ? 'bg-[var(--color-accent)] text-white'
                    : isGuest
                      ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
                }`}
              >
                {t('xpReward', { xp: badge.xpReward })}
              </span>

              {/* Tooltip (for non-guest users) */}
              {!isGuest && hoveredBadge === badge.id && hasTooltip && (
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
