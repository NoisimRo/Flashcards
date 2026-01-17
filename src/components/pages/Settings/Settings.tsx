import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '../../../../types';
import { User as UserIcon, Moon, Check, Save, LogOut, LogIn, UserPlus } from 'lucide-react';

interface SettingsProps {
  user: User & { email?: string };
  onSave: (user: User) => void;
  onLogout?: () => void;
  isGuest?: boolean;
  onLogin?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  user,
  onSave,
  onLogout,
  isGuest = false,
  onLogin,
}) => {
  const { t } = useTranslation('settings');
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email || 'email@exemplu.ro',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    onSave({ ...user, name: formData.name });
  };

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto max-w-4xl animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('header.title')}</h1>
      <p className="text-gray-500 mb-8">{t('header.subtitle')}</p>

      {/* Guest CTA Banner */}
      {isGuest && (
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 rounded-3xl mb-6 text-white">
          <h3 className="text-xl font-bold mb-2">{t('guestBanner.title')}</h3>
          <p className="text-white/80 text-sm mb-4">{t('guestBanner.message')}</p>
          <div className="flex gap-3">
            <button
              onClick={onLogin}
              className="bg-white text-gray-900 px-6 py-2 rounded-xl font-bold hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <UserPlus size={18} />
              {t('guestBanner.createAccount')}
            </button>
            <button
              onClick={onLogin}
              className="bg-white/10 text-white px-6 py-2 rounded-xl font-bold hover:bg-white/20 transition-colors flex items-center gap-2"
            >
              <LogIn size={18} />
              {t('guestBanner.hasAccount')}
            </button>
          </div>
        </div>
      )}

      {/* Profile Section */}
      <div
        className={`bg-[#F8F6F1] p-8 rounded-3xl mb-6 shadow-sm ${isGuest ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900 mb-6">
          <UserIcon className="text-indigo-600" /> {t('profile.title')}
          {isGuest && (
            <span className="text-sm font-normal text-orange-600">
              {t('profile.requiresAccount')}
            </span>
          )}
        </h3>

        <div className="space-y-4 max-w-lg">
          <div>
            <label className="block text-gray-500 text-sm mb-1 font-medium">
              {t('profile.nameLabel')}
            </label>
            <input
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              disabled={isGuest}
              className="w-full bg-white border border-gray-200 rounded-xl p-3 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-gray-500 text-sm mb-1 font-medium">
              {t('profile.emailLabel')}
            </label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled={isGuest}
              className="w-full bg-white border border-gray-200 rounded-xl p-3 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
          {!isGuest && (
            <button className="text-indigo-600 text-sm font-bold hover:text-indigo-800 transition-colors">
              {t('profile.changePassword')}
            </button>
          )}
        </div>
      </div>

      {/* Preferences */}
      <div
        className={`bg-[#F8F6F1] p-8 rounded-3xl mb-6 shadow-sm ${isGuest ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900 mb-6">
          <Moon className="text-indigo-600" /> {t('preferences.title')}
          {isGuest && (
            <span className="text-sm font-normal text-orange-600">
              {t('profile.requiresAccount')}
            </span>
          )}
        </h3>

        <div className="space-y-6">
          <div className="flex items-start gap-4 cursor-pointer group">
            <div className="mt-1 w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center text-white shadow-sm group-hover:bg-indigo-600 transition-colors">
              <Check size={14} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900">{t('preferences.focusMode')}</h4>
              <p className="text-gray-500 text-sm">{t('preferences.focusModeDesc')}</p>
            </div>
          </div>

          <div className="flex items-start gap-4 cursor-pointer group">
            <div className="mt-1 w-6 h-6 border-2 border-gray-300 rounded-full flex items-center justify-center text-transparent hover:border-gray-900 transition-colors"></div>
            <div>
              <h4 className="font-bold text-gray-900">{t('preferences.shuffleCards')}</h4>
              <p className="text-gray-500 text-sm">{t('preferences.shuffleCardsDesc')}</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="font-bold text-gray-700">{t('preferences.newCardsPerDay')}</span>
              <span className="text-gray-500 text-sm">
                {t('preferences.cardsCount', { count: 20 })}
              </span>
            </div>
            <input
              type="range"
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
              min="5"
              max="50"
              defaultValue="20"
              disabled={isGuest}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      {!isGuest && (
        <div className="flex gap-4 pb-10">
          <button
            onClick={handleSave}
            className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center gap-2 shadow-lg hover:-translate-y-1 transform"
          >
            <Save size={18} /> {t('actions.saveChanges')}
          </button>
          <button className="text-gray-500 px-6 py-3 font-bold hover:text-gray-900 transition-colors">
            {t('actions.cancel')}
          </button>
        </div>
      )}

      {/* Logout Section */}
      {onLogout && !isGuest && (
        <div className="bg-red-50 p-6 rounded-3xl border border-red-100 mb-10">
          <h3 className="flex items-center gap-2 text-lg font-bold text-red-700 mb-2">
            <LogOut size={20} /> {t('logout.title')}
          </h3>
          <p className="text-red-600 text-sm mb-4">{t('logout.message')}</p>
          <button
            onClick={onLogout}
            className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <LogOut size={16} /> {t('logout.button')}
          </button>
        </div>
      )}
    </div>
  );
};
