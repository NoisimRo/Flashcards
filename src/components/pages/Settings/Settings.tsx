import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '../../../types';
import {
  User as UserIcon,
  Moon,
  Sun,
  Check,
  Save,
  LogOut,
  LogIn,
  UserPlus,
  Globe,
  Palette,
} from 'lucide-react';
import { useTheme, type AccentTheme } from '../../../hooks/useTheme';

interface SettingsProps {
  user: User & { email?: string };
  onSave: (user: User) => void;
  onLogout?: () => void;
  isGuest?: boolean;
  onLogin?: () => void;
}

const ACCENT_OPTIONS: { id: AccentTheme; label: string; color: string; gradient: string }[] = [
  {
    id: 'violet',
    label: 'Violet',
    color: '#7C3AED',
    gradient: 'linear-gradient(135deg, #7C3AED, #6366F1)',
  },
  {
    id: 'gold',
    label: 'Gold',
    color: '#D97706',
    gradient: 'linear-gradient(135deg, #D97706, #F59E0B)',
  },
  {
    id: 'silver',
    label: 'Silver',
    color: '#6B7280',
    gradient: 'linear-gradient(135deg, #6B7280, #9CA3AF)',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    color: '#059669',
    gradient: 'linear-gradient(135deg, #059669, #10B981)',
  },
  {
    id: 'rose',
    label: 'Rose',
    color: '#E11D48',
    gradient: 'linear-gradient(135deg, #E11D48, #F43F5E)',
  },
];

export const Settings: React.FC<SettingsProps> = ({
  user,
  onSave,
  onLogout,
  isGuest = false,
  onLogin,
}) => {
  const { t, i18n } = useTranslation('settings');
  const { mode, accent, setMode, setAccent, isNight, toggleMode } = useTheme();
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email || 'email@exemplu.ro',
  });

  const languages = [
    { code: 'ro', name: t('languages.ro'), flag: '🇷🇴' },
    { code: 'en', name: t('languages.en'), flag: '🇬🇧' },
    { code: 'it', name: t('languages.it'), flag: '🇮🇹' },
  ];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    // Persist to localStorage
    localStorage.setItem('preferredLanguage', languageCode);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    onSave({ ...user, name: formData.name });
  };

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto max-w-4xl animate-fade-in">
      <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        {t('header.title')}
      </h1>
      <p className="mb-8" style={{ color: 'var(--text-muted)' }}>
        {t('header.subtitle')}
      </p>

      {/* Guest CTA Banner */}
      {isGuest && (
        <div
          className="p-6 rounded-3xl mb-6 text-white"
          style={{ background: 'var(--color-accent-gradient)' }}
        >
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

      {/* Appearance Section */}
      <div
        className="p-8 rounded-3xl mb-6 shadow-sm"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <h3
          className="flex items-center gap-2 text-xl font-bold mb-6"
          style={{ color: 'var(--text-primary)' }}
        >
          <Palette style={{ color: 'var(--color-accent)' }} />
          {t('appearance.title', 'Aspect')}
        </h3>

        <div className="space-y-6">
          {/* Night Mode Toggle */}
          <div>
            <h4
              className="font-bold mb-2 flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              {isNight ? (
                <Moon size={18} style={{ color: 'var(--color-accent)' }} />
              ) : (
                <Sun size={18} style={{ color: 'var(--color-accent)' }} />
              )}
              {t('appearance.themeMode', 'Mod temă')}
            </h4>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              {t('appearance.themeModeDesc', 'Alege între modul zi și modul noapte')}
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              {/* Light mode card */}
              <button
                onClick={() => setMode('light')}
                className={`p-4 rounded-xl border-2 transition-all ${!isNight ? 'shadow-md' : ''}`}
                style={{
                  borderColor: !isNight ? 'var(--color-accent)' : 'var(--border-secondary)',
                  backgroundColor: !isNight ? 'var(--color-accent-light)' : 'var(--bg-surface)',
                }}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                    <Sun size={20} className="text-amber-600" />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {t('appearance.lightMode', 'Zi')}
                  </span>
                </div>
              </button>
              {/* Night mode card */}
              <button
                onClick={() => setMode('night')}
                className={`p-4 rounded-xl border-2 transition-all ${isNight ? 'shadow-md' : ''}`}
                style={{
                  borderColor: isNight ? 'var(--color-accent)' : 'var(--border-secondary)',
                  backgroundColor: isNight ? 'var(--color-accent-light)' : 'var(--bg-surface)',
                }}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center">
                    <Moon size={20} className="text-indigo-300" />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {t('appearance.nightMode', 'Noapte')}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Accent Theme Selector */}
          <div>
            <h4
              className="font-bold mb-2 flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <Palette size={18} style={{ color: 'var(--color-accent)' }} />
              {t('appearance.accentTheme', 'Culoare accent')}
            </h4>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              {t('appearance.accentThemeDesc', 'Alege culoarea principală a aplicației')}
            </p>
            <div className="flex gap-3 flex-wrap">
              {ACCENT_OPTIONS.map(option => (
                <button
                  key={option.id}
                  onClick={() => setAccent(option.id)}
                  className={`group relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all min-w-[72px] ${
                    accent === option.id ? 'shadow-md scale-105' : 'hover:scale-105'
                  }`}
                  style={{
                    borderColor: accent === option.id ? option.color : 'var(--border-secondary)',
                    backgroundColor: 'var(--bg-surface)',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full shadow-sm transition-transform"
                    style={{ background: option.gradient }}
                  />
                  <span
                    className="text-xs font-semibold"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {option.label}
                  </span>
                  {accent === option.id && (
                    <div
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: option.color }}
                    >
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div
        className={`p-8 rounded-3xl mb-6 shadow-sm ${isGuest ? 'opacity-60 pointer-events-none' : ''}`}
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <h3
          className="flex items-center gap-2 text-xl font-bold mb-6"
          style={{ color: 'var(--text-primary)' }}
        >
          <UserIcon style={{ color: 'var(--color-accent)' }} /> {t('profile.title')}
          {isGuest && (
            <span className="text-sm font-normal text-orange-600">
              {t('profile.requiresAccount')}
            </span>
          )}
        </h3>

        <div className="space-y-4 max-w-lg">
          <div>
            <label
              className="block text-sm mb-1 font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              {t('profile.nameLabel')}
            </label>
            <input
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              disabled={isGuest}
              className="w-full rounded-xl p-3 outline-none transition-all disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderWidth: '1px',
                borderColor: 'var(--input-border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          <div>
            <label
              className="block text-sm mb-1 font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              {t('profile.emailLabel')}
            </label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled={isGuest}
              className="w-full rounded-xl p-3 outline-none transition-all disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderWidth: '1px',
                borderColor: 'var(--input-border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          {!isGuest && (
            <button
              className="text-sm font-bold transition-colors"
              style={{ color: 'var(--color-accent)' }}
            >
              {t('profile.changePassword')}
            </button>
          )}
        </div>
      </div>

      {/* Preferences */}
      <div
        className={`p-8 rounded-3xl mb-6 shadow-sm ${isGuest ? 'opacity-60 pointer-events-none' : ''}`}
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <h3
          className="flex items-center gap-2 text-xl font-bold mb-6"
          style={{ color: 'var(--text-primary)' }}
        >
          <Moon style={{ color: 'var(--color-accent)' }} /> {t('preferences.title')}
          {isGuest && (
            <span className="text-sm font-normal text-orange-600">
              {t('profile.requiresAccount')}
            </span>
          )}
        </h3>

        <div className="space-y-6">
          <div>
            <h4
              className="font-bold mb-2 flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <Globe size={18} style={{ color: 'var(--color-accent)' }} />
              {t('preferences.language')}
            </h4>
            <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
              {t('preferences.languageDesc')}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className="p-3 rounded-xl border-2 transition-all"
                  style={{
                    borderColor:
                      i18n.language === lang.code
                        ? 'var(--color-accent)'
                        : 'var(--border-secondary)',
                    backgroundColor:
                      i18n.language === lang.code
                        ? 'var(--color-accent-light)'
                        : 'var(--bg-surface)',
                  }}
                >
                  <div className="text-2xl mb-1">{lang.flag}</div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {lang.name}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-4 cursor-pointer group">
            <div
              className="mt-1 w-6 h-6 rounded-full flex items-center justify-center shadow-sm transition-colors"
              style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
            >
              <Check size={14} />
            </div>
            <div>
              <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                {t('preferences.focusMode')}
              </h4>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('preferences.focusModeDesc')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 cursor-pointer group">
            <div
              className="mt-1 w-6 h-6 border-2 rounded-full flex items-center justify-center text-transparent transition-colors"
              style={{ borderColor: 'var(--border-secondary)' }}
            ></div>
            <div>
              <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                {t('preferences.shuffleCards')}
              </h4>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('preferences.shuffleCardsDesc')}
              </p>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>
                {t('preferences.newCardsPerDay')}
              </span>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('preferences.cardsCount', { count: 20 })}
              </span>
            </div>
            <input
              type="range"
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{ accentColor: 'var(--color-accent)' }}
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
            className="text-white px-8 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-lg hover:-translate-y-1 transform"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <Save size={18} /> {t('actions.saveChanges')}
          </button>
          <button
            className="px-6 py-3 font-bold transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
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
