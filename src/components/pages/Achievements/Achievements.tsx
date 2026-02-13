import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '../../../types';
import { Achievement, getAchievements } from '../../../api/achievements';
import { isGuestUser } from '../../../utils/guestMode';
import { useAuthActions } from '../../../hooks/useAuthActions';
import achievementsData from '../../../data/seed/achievements.json';
import { Trophy, Award, TrendingUp, Star, Layers, Loader2, Lock } from 'lucide-react';
import { badgeSVGs } from './BadgeIcons';

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
        conditionType: a.condition.type,
        conditionValue: a.condition.value,
        color: a.color,
        tier: a.tier,
        unlocked: false,
        unlockedAt: undefined,
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

      {/* Stats Summary - GlobalDecks style */}
      {isGuest ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-[var(--bg-secondary)] p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <Award className="text-[var(--color-accent)]" size={24} />
              <div>
                <p className="text-2xl font-bold text-[var(--color-accent)]">
                  {achievements.length}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {t('guest.stats.badgesToUnlock')}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--bg-secondary)] p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <Layers className="text-blue-500" size={24} />
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">4</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {t('guest.stats.tierBreakdown')}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--bg-secondary)] p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <Star className="text-yellow-500" size={24} />
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {totalXPAvailable.toLocaleString(i18n.language)}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {t('guest.stats.xpAvailable')}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-[var(--bg-secondary)] p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <Trophy className="text-[var(--color-accent)]" size={24} />
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{unlockedCount}</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {t('stats.badgesUnlocked')} &middot;{' '}
                  {t('stats.of', { total: achievements.length })}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--bg-secondary)] p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-green-500" size={24} />
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{user.level}</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {t('stats.currentLevel')} &middot;{' '}
                  {t('stats.xpToNextLevel', {
                    xp: user.nextLevelXP - user.currentXP,
                    level: user.level + 1,
                  })}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--bg-secondary)] p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <Star className="text-yellow-500" size={24} />
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {user.totalXP.toLocaleString(i18n.language)}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">{t('stats.xpAccumulated')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Badge Grid - compact: 3 per row mobile, 6 per row desktop */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {achievements.map(badge => {
          const BadgeSVG = badgeSVGs[badge.id];
          const howToEarnKey = `items.${badge.id}.howToEarn`;
          const howToEarn = t(howToEarnKey);
          const hasTooltip = howToEarn !== howToEarnKey;

          return (
            <div
              key={badge.id}
              className={`relative p-3 rounded-2xl border flex flex-col items-center text-center transition-transform hover:-translate-y-1
                ${
                  badge.unlocked
                    ? 'bg-[var(--card-bg)] border-transparent shadow-sm'
                    : isGuest
                      ? 'bg-[var(--card-bg)] border-[var(--border-subtle)] shadow-sm'
                      : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)] opacity-60'
                }
              `}
              onMouseEnter={() => setHoveredBadge(badge.id)}
              onMouseLeave={() => setHoveredBadge(null)}
            >
              {/* Lock overlay for guest unearned badges */}
              {!badge.unlocked && isGuest && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/10 backdrop-blur-sm flex items-center justify-center">
                  <Lock size={10} className="text-[var(--text-muted)]" />
                </div>
              )}

              {/* Custom SVG Badge */}
              <div className="mb-2">
                {BadgeSVG ? (
                  <BadgeSVG size={48} unlocked={badge.unlocked || isGuest} />
                ) : (
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${badge.color}`}
                  >
                    <Star size={24} />
                  </div>
                )}
              </div>

              <h3 className="font-bold text-[var(--text-primary)] text-xs leading-tight mb-0.5">
                {badge.titleKey ? String(t(badge.titleKey)) : badge.title}
              </h3>
              <p className="text-[10px] text-[var(--text-tertiary)] mb-1.5 leading-tight hidden sm:block">
                {badge.descriptionKey ? String(t(badge.descriptionKey)) : badge.description}
              </p>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
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
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-primary)] text-[10px] rounded-lg py-1.5 px-3 shadow-lg z-50 max-w-[200px] text-center whitespace-normal">
                  {howToEarn}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-[var(--bg-elevated)]" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
