import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '../../../types';
import { LeaderboardEntry } from '../../../api/users';
import { Flame, Medal, Trophy, Users } from 'lucide-react';
import { AVATARS } from '../Settings/AvatarPicker';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUser?: User;
  onRegisterClick?: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  entries,
  currentUser,
  onRegisterClick,
}) => {
  const { t, i18n } = useTranslation('leaderboard');
  const isVisitor = currentUser?.id === 'guest';

  // Find current user in entries or create from currentUser prop
  const currentUserEntry = useMemo(() => {
    const fromEntries = entries.find(e => e.isCurrentUser);
    if (fromEntries) return fromEntries;

    // If we have currentUser prop but they're not in entries, create their entry
    if (currentUser) {
      // Find their position by comparing XP
      const position = entries.filter(e => e.xpTotal > currentUser.totalXP).length + 1;
      return {
        id: currentUser.id,
        position,
        name: currentUser.name,
        level: currentUser.level,
        xpTotal: currentUser.totalXP,
        streak: currentUser.streak,
        isCurrentUser: true,
      };
    }
    return null;
  }, [entries, currentUser]);

  // Calculate stats for current user
  const userStats = useMemo(() => {
    if (!currentUserEntry) {
      return {
        position: '---',
        xpTotal: 0,
        xpToTop100: 0,
        totalUsers: entries.length,
        level: 1,
        streak: 0,
      };
    }

    // Find position
    const position = currentUserEntry.position;

    // Calculate XP needed for top 100
    const top100Entry = entries.length >= 100 ? entries[99] : entries[entries.length - 1];
    const xpToTop100 =
      top100Entry && position > 100
        ? Math.max(0, top100Entry.xpTotal - currentUserEntry.xpTotal + 1)
        : 0;

    return {
      position: position > 0 ? `#${position}` : '---',
      xpTotal: currentUserEntry.xpTotal,
      xpToTop100,
      totalUsers: Math.max(entries.length, position),
      level: currentUserEntry.level,
      streak: currentUserEntry.streak,
    };
  }, [currentUserEntry, entries]);

  // Display entries (add current user if not already shown)
  const displayEntries = useMemo(() => {
    if (!currentUserEntry || entries.some(e => e.isCurrentUser)) {
      return entries;
    }
    // Add current user entry if they're not in the top list
    return [...entries, currentUserEntry];
  }, [entries, currentUserEntry]);

  if (entries.length === 0) {
    return (
      <div className="p-6 md:p-8 h-full flex flex-col items-center justify-center">
        <Users size={64} className="text-[var(--text-muted)] mb-4" />
        <h2 className="text-xl font-bold text-[var(--text-secondary)] mb-2">{t('empty.title')}</h2>
        <p className="text-[var(--text-muted)] text-center max-w-md">{t('empty.message')}</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto">
      <h1 className="text-3xl font-bold text-[var(--text-primary)]">{t('header.title')}</h1>
      <p className="text-[var(--text-tertiary)] mb-8">{t('header.subtitle')}</p>

      {/* Top Cards - User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl flex flex-col items-center justify-center text-center">
          <h3 className="text-[var(--text-tertiary)] mb-2">{t('userStats.yourPosition')}</h3>
          <div className="text-4xl font-bold text-[var(--text-primary)]">{userStats.position}</div>
          {isVisitor ? (
            <button
              onClick={onRegisterClick}
              className="text-xs text-[var(--color-accent-text)] font-bold mt-2 hover:opacity-80 transition-colors"
            >
              {t('userStats.registerPrompt')}
            </button>
          ) : (
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {t('userStats.of', { total: userStats.totalUsers.toLocaleString(i18n.language) })}
            </p>
          )}
        </div>
        <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl flex flex-col items-center justify-center text-center">
          <h3 className="text-[var(--text-tertiary)] mb-2">{t('userStats.totalXP')}</h3>
          <div className="text-4xl font-bold text-[var(--text-primary)]">
            {userStats.xpTotal.toLocaleString(i18n.language)}
          </div>
          <p className="text-xs text-green-500 font-bold mt-1">
            {t('userStats.level', { level: userStats.level })}
          </p>
        </div>
        <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl flex flex-col items-center justify-center text-center">
          <h3 className="text-[var(--text-tertiary)] mb-2">
            {userStats.xpToTop100 > 0 ? t('userStats.toTop100') : t('userStats.currentStreak')}
          </h3>
          <div className="text-4xl font-bold text-[var(--text-primary)]">
            {userStats.xpToTop100 > 0
              ? userStats.xpToTop100.toLocaleString(i18n.language)
              : userStats.streak}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {userStats.xpToTop100 > 0 ? t('userStats.xpNeeded') : t('userStats.consecutiveDays')}
          </p>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] font-bold text-sm">
          <div className="col-span-2 md:col-span-1 flex items-center justify-center gap-1">
            <Trophy size={14} className="text-yellow-500" />
          </div>
          <div className="col-span-6 md:col-span-5">{t('table.user')}</div>
          <div className="col-span-2 text-center hidden md:block">{t('table.level')}</div>
          <div className="col-span-2 text-center">{t('table.totalXP')}</div>
          <div className="col-span-2 text-center hidden md:block">{t('table.streak')}</div>
        </div>

        {displayEntries.map(entry => (
          <div
            key={entry.id}
            className={`grid grid-cols-12 gap-4 p-4 items-center border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-surface-hover)] transition-colors
              ${entry.isCurrentUser ? 'bg-[var(--color-accent-subtle)] border-l-4 border-l-[var(--color-accent)]' : ''}
            `}
          >
            <div className="col-span-2 md:col-span-1 flex justify-center">
              {entry.position === 1 && <Medal className="text-yellow-400 fill-yellow-400" />}
              {entry.position === 2 && <Medal className="text-gray-400 fill-gray-400" />}
              {entry.position === 3 && <Medal className="text-orange-400 fill-orange-400" />}
              {entry.position > 3 && (
                <span className="font-bold text-[var(--text-tertiary)]">{entry.position}</span>
              )}
            </div>

            <div className="col-span-6 md:col-span-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-lg font-bold text-[var(--text-secondary)]">
                {entry.avatar && entry.avatar !== 'default'
                  ? (() => {
                      const av = AVATARS.find(a => a.id === entry.avatar);
                      return av ? av.emoji : entry.name.charAt(0).toUpperCase();
                    })()
                  : entry.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p
                  className={`font-bold ${entry.isCurrentUser ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                >
                  {entry.name} {entry.isCurrentUser && t('table.you')}
                </p>
              </div>
            </div>

            <div className="col-span-2 text-center hidden md:block">
              <span
                className={`px-2 py-1 rounded-full text-xs font-bold ${
                  entry.position <= 3
                    ? 'bg-red-100 text-red-700'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                }`}
              >
                {t('userStats.level', { level: entry.level })}
              </span>
            </div>

            <div className="col-span-2 text-center font-bold text-[var(--text-primary)]">
              {entry.xpTotal.toLocaleString(i18n.language)}
            </div>

            <div className="col-span-2 text-center hidden md:flex items-center justify-center gap-1 text-orange-500 font-bold">
              <Flame size={16} fill="currentColor" /> {entry.streak}
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-center text-[var(--text-muted)] text-sm mt-6">{t('footer')}</p>
    </div>
  );
};
