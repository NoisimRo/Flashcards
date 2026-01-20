import React from 'react';
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
} from 'lucide-react';
import { User } from '../../types';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';

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
  const xpPercentage = Math.min((user.currentXP / user.nextLevelXP) * 100, 100);

  // Show moderation for admin and teacher roles
  const canModerate = user.role === 'admin' || user.role === 'teacher';

  const menuItems = [
    { id: 'dashboard', label: t('menu.dashboard'), icon: LayoutDashboard },
    { id: 'decks', label: t('menu.myDecks'), icon: Layers },
    { id: 'sessions', label: t('menu.activeSessions'), icon: PlayCircle },
    { id: 'study', label: t('menu.globalDecks'), icon: BookOpen },
    { id: 'achievements', label: t('menu.achievements'), icon: Trophy },
    ...(canModerate ? [{ id: 'moderation', label: t('menu.moderation'), icon: Shield }] : []),
    { id: 'leaderboard', label: t('menu.leaderboard'), icon: Users },
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

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-64 bg-[#F8F6F1] border-r border-[#E5E0D5] transform transition-transform duration-300 ease-in-out
    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
    md:translate-x-0 md:static md:block
  `;

  return (
    <div className={sidebarClasses}>
      <div className="p-6 flex flex-col h-full">
        {/* User Profile Summary */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
              isGuest ? 'bg-gray-300 text-gray-600' : 'bg-gray-900 text-white'
            }`}
          >
            {user.name
              .split(' ')
              .map(n => n[0])
              .join('')}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 leading-tight">{user.name}</h3>
            {isGuest ? (
              <span className="text-sm text-orange-600 font-medium">{t('roles.visitor')}</span>
            ) : (
              <>
                <div className="text-sm text-gray-600 font-medium">{getRoleLabel(user.role)}</div>
                <span className="text-sm text-gray-500">
                  {t('xp.level', { level: user.level })} ·{' '}
                  {t('xp.totalXP', { xp: user.totalXP.toLocaleString(i18n.language) })}
                </span>
              </>
            )}
          </div>
        </div>

        {/* XP Bar - only for logged in users */}
        {!isGuest && (
          <div className="mb-8">
            <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
              <span>{t('xp.label')}</span>
              <span>
                {t('xp.progress', {
                  current: user.currentXP.toLocaleString(i18n.language),
                  next: user.nextLevelXP.toLocaleString(i18n.language),
                })}
              </span>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-900 rounded-full transition-all duration-500"
                style={{ width: `${xpPercentage}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Guest CTA */}
        {isGuest && onRegisterClick && onLoginClick && (
          <div className="mb-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 text-white space-y-3">
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
        <nav className="flex-1 space-y-2">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                onChangeView(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === item.id
                  ? 'bg-white shadow-sm text-gray-900 font-bold border border-[#E5E0D5]'
                  : 'text-gray-500 hover:bg-[#EFECE5] hover:text-gray-900'
              }`}
            >
              <item.icon size={20} className={currentView === item.id ? 'text-indigo-600' : ''} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Language Switcher */}
        <div className="pt-4 mt-4 border-t border-gray-200">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
};
