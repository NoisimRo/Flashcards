import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  Trophy,
  Users,
  Settings,
  LogIn,
  UserPlus,
  PlayCircle,
  Shield,
  Sun,
  Moon,
  Bug,
  GraduationCap,
} from 'lucide-react';
import { User } from '../../types';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { BugReportModal } from '../feedback/BugReportModal';
import { useTheme } from '../../hooks/useTheme';
import { AVATARS } from '../pages/Settings/AvatarPicker';
import { getAchievements, Achievement } from '../../api/achievements';

function getAvatarEmoji(avatarId?: string): string | null {
  if (!avatarId || avatarId === 'default') return null;
  const avatar = AVATARS.find(a => a.id === avatarId);
  return avatar?.emoji || null;
}

/** Inline brain SVG used as the default app avatar */
const BrainAvatar: React.FC = () => (
  <svg width={28} height={28} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(56, 56) scale(0.78)">
      <path
        d="M256 48C176 48 112 112 112 192c0 48 24 90 60 116v60c0 22 18 40 40 40h88c22 0 40-18 40-40v-60c36-26 60-68 60-116 0-80-64-144-144-144z"
        fill="#ffffff"
        opacity="0.95"
      />
      <path
        d="M220 160c0-20 16-36 36-36s36 16 36 36"
        stroke="#7c3aed"
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M200 200c-16 0-28-12-28-28s12-28 28-28"
        stroke="#7c3aed"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M312 200c16 0 28-12 28-28s-12-28-28-28"
        stroke="#7c3aed"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
      <line
        x1="256"
        y1="192"
        x2="256"
        y2="320"
        stroke="#7c3aed"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <line
        x1="220"
        y1="240"
        x2="256"
        y2="220"
        stroke="#7c3aed"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <line
        x1="292"
        y1="240"
        x2="256"
        y2="220"
        stroke="#7c3aed"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <line
        x1="220"
        y1="280"
        x2="256"
        y2="260"
        stroke="#7c3aed"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <line
        x1="292"
        y1="280"
        x2="256"
        y2="260"
        stroke="#7c3aed"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </g>
  </svg>
);

const ACHIEVEMENT_EMOJI: Record<string, string> = {
  target: '\u{1F3AF}',
  star: '\u{2B50}',
  zap: '\u{26A1}',
  library: '\u{1F4DA}',
  flame: '\u{1F525}',
  diamond: '\u{1F48E}',
  crown: '\u{1F451}',
  calendar: '\u{1F4C5}',
  moon: '\u{1F319}',
  sunrise: '\u{1F305}',
  award: '\u{1F3C5}',
  trophy: '\u{1F3C6}',
  medal: '\u{1F396}',
  coins: '\u{1FA99}',
  gem: '\u{1F4A0}',
  sparkles: '\u{2728}',
  timer: '\u{23F1}',
  brain: '\u{1F9E0}',
  'book-check': '\u{1F4D6}',
};

interface SidebarProps {
  user: User & { email?: string };
  currentView: string;
  onChangeView: (view: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isGuest?: boolean;
  onLoginClick?: () => void;
  onRegisterClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  currentView,
  onChangeView,
  isMobileOpen,
  onCloseMobile,
  isGuest = false,
  onLoginClick,
  onRegisterClick,
}) => {
  const { t, i18n } = useTranslation('sidebar');
  const { isNight, toggleMode } = useTheme();
  const xpPercentage = Math.min((user.currentXP / user.nextLevelXP) * 100, 100);
  const avatarEmoji = getAvatarEmoji(user.avatar);

  // Fetch last 5 unlocked achievements for badge display
  const [recentBadges, setRecentBadges] = useState<Achievement[]>([]);
  const [showBugReport, setShowBugReport] = useState(false);

  useEffect(() => {
    if (isGuest) return;
    let cancelled = false;
    getAchievements().then(res => {
      if (cancelled) return;
      if (res.success && res.data) {
        const unlocked = res.data.achievements
          .filter(a => a.unlocked)
          .sort((a, b) => {
            const dateA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
            const dateB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 5);
        setRecentBadges(unlocked);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isGuest, user.id]);

  // Show moderation for admin and teacher roles
  const canModerate = user.role === 'admin' || user.role === 'teacher';

  const menuItems = [
    { id: 'dashboard', label: t('menu.dashboard'), icon: LayoutDashboard },
    { id: 'study', label: t('menu.globalDecks'), icon: BookOpen },
    { id: 'decks', label: t('menu.myDecks'), icon: Layers },
    { id: 'sessions', label: t('menu.activeSessions'), icon: PlayCircle },
    { id: 'achievements', label: t('menu.achievements'), icon: Trophy },
    ...(canModerate ? [{ id: 'moderation', label: t('menu.moderation'), icon: Shield }] : []),
    ...(canModerate
      ? [{ id: 'catalog', label: t('menu.catalog', 'Catalog elevi'), icon: GraduationCap }]
      : []),
    { id: 'leaderboard', label: t('menu.leaderboard'), icon: Users },
    ...(!isGuest
      ? [{ id: 'bug-report', label: t('bugReport.button', 'Raportează un Bug'), icon: Bug }]
      : []),
    { id: 'settings', label: t('menu.settings'), icon: Settings },
  ];

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: t('roles.admin'),
      teacher: t('roles.teacher'),
      student: t('roles.student'),
    };
    return roleMap[role] || role;
  };

  return (
    <div
      className={`
        fixed inset-y-0 left-0 z-50 w-64 border-r transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:block
      `}
      style={{
        backgroundColor: 'var(--sidebar-bg)',
        borderColor: 'var(--sidebar-border)',
      }}
    >
      <div className="p-6 flex flex-col h-full">
        {/* User Profile Summary */}
        <div className="flex items-center gap-3 mb-2">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
              isGuest ? 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]' : ''
            }`}
            style={
              !isGuest
                ? {
                    background: 'var(--color-accent-gradient)',
                    color: 'var(--text-inverse)',
                  }
                : undefined
            }
          >
            {avatarEmoji ? <span className="text-2xl">{avatarEmoji}</span> : <BrainAvatar />}
          </div>
          <div>
            <h3 className="font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
              {user.name}
            </h3>
            {isGuest ? (
              <span className="text-sm text-orange-600 font-medium">{t('roles.visitor')}</span>
            ) : (
              <>
                <div className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  {getRoleLabel(user.role)}
                </div>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t('xp.level', { level: user.level })} ·{' '}
                  {t('xp.totalXP', { xp: user.totalXP.toLocaleString(i18n.language) })}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Recent Badges - below name, before XP bar */}
        {!isGuest && recentBadges.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            {recentBadges.map(badge => (
              <div
                key={badge.id}
                className="flex-1 h-9 rounded-lg flex items-center justify-center text-lg"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
                title={badge.title}
              >
                {ACHIEVEMENT_EMOJI[badge.icon] || '\u{1F3C6}'}
              </div>
            ))}
          </div>
        )}
        {!isGuest && recentBadges.length === 0 && <div className="mb-4" />}

        {/* XP Bar - only for logged in users */}
        {!isGuest && (
          <div className="mb-8">
            <div
              className="flex justify-between text-xs font-semibold mb-1"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <span>{t('xp.label')}</span>
              <span>
                {t('xp.progress', {
                  current: user.currentXP.toLocaleString(i18n.language),
                  next: user.nextLevelXP.toLocaleString(i18n.language),
                })}
              </span>
            </div>
            <div
              className="h-2 w-full rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${xpPercentage}%`, background: 'var(--color-accent-gradient)' }}
              ></div>
            </div>
          </div>
        )}

        {/* Guest CTA */}
        {isGuest && onRegisterClick && onLoginClick && (
          <div
            className="mb-6 rounded-xl p-4 text-white space-y-3"
            style={{ background: 'var(--color-accent-gradient)' }}
          >
            <p className="text-sm opacity-90">{t('guestCta.message')}</p>
            <button
              onClick={onRegisterClick}
              className="w-full bg-white text-gray-900 font-bold py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus size={18} />
              {t('guestCta.createAccount')}
            </button>
            <button
              onClick={onLoginClick}
              className="w-full bg-transparent text-white font-bold py-2 px-4 rounded-lg border-2 border-white/30 hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <LogIn size={18} />
              {t('guestCta.login')}
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 min-h-0 overflow-y-auto space-y-2">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'bug-report') {
                  setShowBugReport(true);
                  return;
                }
                onChangeView(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === item.id ? 'shadow-sm font-bold' : ''
              }`}
              style={
                currentView === item.id
                  ? {
                      backgroundColor: 'var(--sidebar-item-active-bg)',
                      color: 'var(--text-primary)',
                      borderWidth: '1px',
                      borderColor: 'var(--border-primary)',
                    }
                  : {
                      color: 'var(--text-muted)',
                    }
              }
              onMouseEnter={e => {
                if (currentView !== item.id) {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    'var(--sidebar-item-hover-bg)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={e => {
                if (currentView !== item.id) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                }
              }}
            >
              <item.icon
                size={20}
                style={currentView === item.id ? { color: 'var(--color-accent)' } : undefined}
              />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Night Mode Toggle */}
        <div
          className="pt-4 mt-4"
          style={{ borderTopWidth: '1px', borderTopColor: 'var(--border-primary)' }}
        >
          <button
            onClick={toggleMode}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor =
                'var(--sidebar-item-hover-bg)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            <div className="flex items-center gap-2">
              {isNight ? <Moon size={18} /> : <Sun size={18} />}
              <span className="text-sm font-medium">
                {isNight ? t('nightMode.on', 'Mod Noapte') : t('nightMode.off', 'Mod Zi')}
              </span>
            </div>
            {/* Toggle Switch */}
            <div
              className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${
                isNight ? '' : 'bg-[var(--border-primary)]'
              }`}
              style={isNight ? { backgroundColor: 'var(--color-accent)' } : undefined}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${
                  isNight ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </div>
          </button>
        </div>

        {/* Language Switcher */}
        <div className="pt-2">
          <LanguageSwitcher />
        </div>
      </div>

      {/* Bug Report Modal */}
      {showBugReport && <BugReportModal onClose={() => setShowBugReport(false)} />}
    </div>
  );
};
