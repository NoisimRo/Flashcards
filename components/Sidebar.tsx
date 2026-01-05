import React from 'react';
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
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  user: User & { email?: string };
  currentView: string;
  onChangeView: (view: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isGuest?: boolean;
  onLoginClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  user,
  currentView,
  onChangeView,
  isMobileOpen,
  onCloseMobile,
  isGuest = false,
  onLoginClick,
}) => {
  const xpPercentage = Math.min((user.currentXP / user.nextLevelXP) * 100, 100);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'decks', label: 'Deck-urile Mele', icon: Layers },
    { id: 'sessions', label: 'Sesiuni Active', icon: PlayCircle },
    { id: 'study', label: 'Studiază Acum', icon: BookOpen },
    { id: 'achievements', label: 'Realizări', icon: Trophy },
    { id: 'leaderboard', label: 'Clasament', icon: Users },
    { id: 'settings', label: 'Setări', icon: Settings },
  ];

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
              <span className="text-sm text-orange-600 font-medium">Mod vizitator</span>
            ) : (
              <span className="text-sm text-gray-500">
                Nivel {user.level} · {user.totalXP.toLocaleString()} XP total
              </span>
            )}
          </div>
        </div>

        {/* XP Bar - only for logged in users */}
        {!isGuest && (
          <div className="mb-8">
            <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
              <span>XP</span>
              <span>
                {user.currentXP.toLocaleString()} / {user.nextLevelXP.toLocaleString()}
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
        {isGuest && onLoginClick && (
          <div className="mb-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 text-white">
            <p className="text-sm opacity-90 mb-3">
              Creează un cont pentru a salva progresul și a debloca toate funcționalitățile!
            </p>
            <button
              onClick={onLoginClick}
              className="w-full bg-white text-gray-900 font-bold py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus size={18} />
              Creează cont gratuit
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

        {/* Login button for guests */}
        {isGuest && onLoginClick && (
          <button
            onClick={onLoginClick}
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-[#EFECE5] rounded-xl transition-colors mt-auto"
          >
            <LogIn size={20} />
            <span>Autentificare</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
