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
  KeyRound,
  Calendar,
  Zap,
  Shield,
  ShieldCheck,
  ShieldOff,
  Flame,
  EyeOff,
  Eye,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useTheme, type AccentTheme } from '../../../hooks/useTheme';
import { useToast } from '../../ui/Toast';
import {
  updateUserProfile,
  activateStreakShield,
  deactivateStreakShield,
} from '../../../api/users';
import { ChangePasswordModal } from './ChangePasswordModal';
import { AvatarPicker, AVATARS } from './AvatarPicker';
import { soundEngine } from '../../../services/soundEngine';

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
  const { mode, accent, setMode, setAccent, isNight } = useTheme();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email || 'email@exemplu.ro',
    birthDate: (user as any).birthDate || '',
  });
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar || 'default');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<{ birthDate?: string }>({});

  // Daily goal from preferences
  const [dailyGoal, setDailyGoal] = useState(user.preferences?.dailyGoal || 20);

  // Daily XP Goal (min 100, replaces Focus Mode)
  const [dailyXPGoal, setDailyXPGoal] = useState(user.preferences?.dailyXPGoal || 100);

  // Streak Shield
  const [streakShieldActive, setStreakShieldActive] = useState(user.streakShieldActive || false);
  const [isActivatingShield, setIsActivatingShield] = useState(false);

  // Hide from leaderboard
  const [hideFromLeaderboard, setHideFromLeaderboard] = useState(
    user.preferences?.hideFromLeaderboard || false
  );

  // Sound effects
  const [soundEnabled, setSoundEnabled] = useState(soundEngine.isEnabled());
  const [soundVolume, setSoundVolume] = useState(soundEngine.getVolume());

  const languages = [
    { code: 'ro', name: t('languages.ro'), flag: 'RO' },
    { code: 'en', name: t('languages.en'), flag: 'GB' },
    { code: 'it', name: t('languages.it'), flag: 'IT' },
  ];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    localStorage.setItem('preferredLanguage', languageCode);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === 'birthDate' && formErrors.birthDate) {
      setFormErrors({});
    }
  };

  const handleAvatarSelect = (avatarId: string) => {
    setSelectedAvatar(avatarId);
  };

  const getAvatarEmoji = (avatarId: string) => {
    const avatar = AVATARS.find(a => a.id === avatarId);
    return avatar?.emoji || '\u{1F464}';
  };

  const handleActivateStreakShield = async () => {
    if (user.totalXP < 500) {
      toast.error(t('preferences.streakShieldNotEnoughXP'));
      return;
    }
    if (!confirm(t('preferences.streakShieldConfirm'))) return;

    setIsActivatingShield(true);
    try {
      const response = await activateStreakShield(user.id);
      if (response.success) {
        setStreakShieldActive(true);
        toast.success(t('preferences.streakShield'), t('preferences.streakShieldActive'));
      } else {
        toast.error(response.error?.message || t('actions.saveError'));
      }
    } catch {
      toast.error(t('actions.saveError'));
    } finally {
      setIsActivatingShield(false);
    }
  };

  const handleDeactivateStreakShield = async () => {
    if (!confirm(t('preferences.streakShieldDeactivateConfirm', 'Deactivate your Streak Shield?')))
      return;

    setIsActivatingShield(true);
    try {
      const response = await deactivateStreakShield(user.id);
      if (response.success) {
        setStreakShieldActive(false);
        toast.success(
          t('preferences.streakShield'),
          t('preferences.streakShieldDeactivated', 'Shield deactivated')
        );
      } else {
        toast.error(response.error?.message || t('actions.saveError'));
      }
    } catch {
      toast.error(t('actions.saveError'));
    } finally {
      setIsActivatingShield(false);
    }
  };

  const handleSave = async () => {
    // Validate birth date is required
    if (!formData.birthDate) {
      setFormErrors({ birthDate: t('profile.birthDateRequired') });
      return;
    }

    setIsSaving(true);
    try {
      const response = await updateUserProfile(user.id, {
        name: formData.name,
        avatar: selectedAvatar,
        birth_date: formData.birthDate,
        preferences: { dailyGoal, dailyXPGoal, hideFromLeaderboard },
      });

      if (response.success) {
        toast.success(t('actions.saveSuccess', 'Changes saved successfully'));
        onSave({
          ...user,
          name: formData.name,
          avatar: selectedAvatar,
          birthDate: formData.birthDate,
        } as User);
      } else {
        toast.error(
          t('actions.saveError', 'Failed to save'),
          response.error?.message || t('actions.saveErrorDesc', 'Please try again')
        );
      }
    } catch {
      toast.error(t('actions.saveError', 'Failed to save'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto animate-fade-in">
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

      {/* Two-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Identity & Learning */}
        <div className="lg:col-span-8 space-y-6">
          {/* Pillar 1: Identity & Security */}
          <div
            className={`p-6 md:p-8 rounded-3xl shadow-sm ${isGuest ? 'opacity-60 pointer-events-none' : ''}`}
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

            <div className="space-y-5">
              {/* Avatar Picker - Compact horizontal scroll */}
              {!isGuest && (
                <div>
                  <h4
                    className="font-bold mb-2 flex items-center gap-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <span className="text-xl">{getAvatarEmoji(selectedAvatar)}</span>
                    {t('profile.avatarTitle', 'Avatar')}
                  </h4>
                  <AvatarPicker
                    currentAvatar={selectedAvatar}
                    userLevel={user.level}
                    onSelect={handleAvatarSelect}
                    compact
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              {/* Birth Date Field */}
              <div className="max-w-xs">
                <label
                  className="block text-sm mb-1 font-medium flex items-center gap-1.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Calendar size={14} />
                  {t('profile.birthDate', 'Birth date')}
                  <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  name="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={handleChange}
                  disabled={isGuest}
                  className="w-full rounded-xl p-3 outline-none transition-all disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderWidth: '1px',
                    borderColor: formErrors.birthDate ? '#EF4444' : 'var(--input-border)',
                    color: 'var(--text-primary)',
                  }}
                />
                {formErrors.birthDate && (
                  <p className="mt-1 text-xs font-medium" style={{ color: '#EF4444' }}>
                    {formErrors.birthDate}
                  </p>
                )}
              </div>

              {/* Change Password Button */}
              {!isGuest && (
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: 'white',
                  }}
                >
                  <KeyRound size={16} />
                  {t('profile.changePasswordBtn', 'Change Password')}
                </button>
              )}
            </div>
          </div>

          {/* Pillar 2: Learning & Performance */}
          <div
            className={`p-6 md:p-8 rounded-3xl shadow-sm ${isGuest ? 'opacity-60 pointer-events-none' : ''}`}
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <h3
              className="flex items-center gap-2 text-xl font-bold mb-6"
              style={{ color: 'var(--text-primary)' }}
            >
              <Globe style={{ color: 'var(--color-accent)' }} /> {t('preferences.title')}
              {isGuest && (
                <span className="text-sm font-normal text-orange-600">
                  {t('profile.requiresAccount')}
                </span>
              )}
            </h3>

            <div className="space-y-6">
              {/* Streak Shield */}
              <div
                className="p-4 rounded-xl border-2 transition-all"
                style={{
                  borderColor: streakShieldActive
                    ? 'var(--color-accent)'
                    : 'var(--border-secondary)',
                  backgroundColor: streakShieldActive
                    ? 'var(--color-accent-light)'
                    : 'var(--bg-surface)',
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: streakShieldActive
                        ? 'var(--color-accent)'
                        : 'var(--bg-tertiary)',
                    }}
                  >
                    {streakShieldActive ? (
                      <ShieldCheck size={20} className="text-white" />
                    ) : (
                      <Shield size={20} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                        {t('preferences.streakShield', 'Streak Shield')}
                      </h4>
                      {streakShieldActive && (
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: 'var(--color-accent)' }}
                        >
                          {t('preferences.streakShieldActive', 'Active')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
                      {t(
                        'preferences.streakShieldDesc',
                        'Protects your streak if you miss one day of study'
                      )}
                    </p>
                    {!streakShieldActive && !isGuest && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleActivateStreakShield}
                          disabled={isActivatingShield || user.totalXP < 500}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                          style={{ backgroundColor: 'var(--color-accent)' }}
                        >
                          <Flame size={14} />
                          {isActivatingShield
                            ? '...'
                            : t('preferences.streakShieldActivate', 'Activate Shield')}
                        </button>
                        <span
                          className="text-xs font-medium"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {user.totalXP < 500
                            ? t('preferences.streakShieldNotEnoughXP', 'Not enough XP (need 500)')
                            : t('preferences.streakShieldCost', 'Cost: 500 XP')}
                        </span>
                      </div>
                    )}
                    {streakShieldActive && !isGuest && (
                      <button
                        onClick={handleDeactivateStreakShield}
                        disabled={isActivatingShield}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          color: '#EF4444',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          borderColor: 'rgba(239, 68, 68, 0.2)',
                        }}
                      >
                        <ShieldOff size={14} />
                        {isActivatingShield
                          ? '...'
                          : t('preferences.streakShieldDeactivate', 'Deactivate Shield')}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Daily XP Goal */}
              <div>
                <h4
                  className="font-bold mb-2 flex items-center gap-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <Zap size={18} style={{ color: 'var(--color-accent)' }} />
                  {t('preferences.dailyXPGoal', 'Daily XP Goal')}
                </h4>
                <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
                  {t('preferences.dailyXPGoalDesc', 'Set your minimum daily XP target')}
                </p>
                <div className="flex justify-between mb-2">
                  <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>
                    {t('preferences.dailyXPGoalValue', { count: dailyXPGoal })}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    +{Math.floor(dailyXPGoal * 0.1)} XP bonus
                  </span>
                </div>
                <input
                  type="range"
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: 'var(--color-accent)' }}
                  min="100"
                  max="1000"
                  step="50"
                  value={dailyXPGoal}
                  onChange={e => setDailyXPGoal(Number(e.target.value))}
                  disabled={isGuest}
                />
              </div>

              {/* Hide from Leaderboard */}
              <div
                className="p-4 rounded-xl border-2 transition-all cursor-pointer"
                style={{
                  borderColor: hideFromLeaderboard
                    ? 'var(--border-secondary)'
                    : 'var(--border-secondary)',
                  backgroundColor: 'var(--bg-surface)',
                }}
                onClick={() => !isGuest && setHideFromLeaderboard(!hideFromLeaderboard)}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  >
                    {hideFromLeaderboard ? (
                      <EyeOff size={20} style={{ color: 'var(--text-muted)' }} />
                    ) : (
                      <Eye size={20} style={{ color: 'var(--color-accent)' }} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                      {t('preferences.leaderboardVisibility', 'Leaderboard Visibility')}
                    </h4>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {hideFromLeaderboard
                        ? t(
                            'preferences.leaderboardHidden',
                            'Your profile is hidden from the leaderboard'
                          )
                        : t(
                            'preferences.leaderboardVisible',
                            'Your profile is visible on the leaderboard'
                          )}
                    </p>
                  </div>
                  <div
                    className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${
                      !hideFromLeaderboard ? '' : 'bg-[var(--border-primary)]'
                    }`}
                    style={
                      !hideFromLeaderboard ? { backgroundColor: 'var(--color-accent)' } : undefined
                    }
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${
                        !hideFromLeaderboard ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button - visible above the fold on desktop */}
          {!isGuest && (
            <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg hover:-translate-y-1 transform disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                <Save size={18} /> {isSaving ? '...' : t('actions.saveChanges')}
              </button>
              <button
                className="px-6 py-3 font-bold transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                {t('actions.cancel')}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Appearance & Sign Out */}
        <div className="lg:col-span-4 space-y-6">
          {/* Pillar 3: Environment / Appearance */}
          <div
            className="p-6 rounded-3xl shadow-sm"
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
                  {t('appearance.themeMode', 'Mod tema')}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMode('light')}
                    className={`p-3 rounded-xl border-2 transition-all ${!isNight ? 'shadow-md' : ''}`}
                    style={{
                      borderColor: !isNight ? 'var(--color-accent)' : 'var(--border-secondary)',
                      backgroundColor: !isNight ? 'var(--color-accent-light)' : 'var(--bg-surface)',
                    }}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                        <Sun size={18} className="text-amber-600" />
                      </div>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {t('appearance.lightMode', 'Zi')}
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => setMode('night')}
                    className={`p-3 rounded-xl border-2 transition-all ${isNight ? 'shadow-md' : ''}`}
                    style={{
                      borderColor: isNight ? 'var(--color-accent)' : 'var(--border-secondary)',
                      backgroundColor: isNight ? 'var(--color-accent-light)' : 'var(--bg-surface)',
                    }}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center">
                        <Moon size={18} className="text-indigo-300" />
                      </div>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
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
                <div className="flex gap-2 flex-wrap">
                  {ACCENT_OPTIONS.map(option => (
                    <button
                      key={option.id}
                      onClick={() => setAccent(option.id)}
                      className={`group relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all min-w-[60px] ${
                        accent === option.id ? 'shadow-md scale-105' : 'hover:scale-105'
                      }`}
                      style={{
                        borderColor:
                          accent === option.id ? option.color : 'var(--border-secondary)',
                        backgroundColor: 'var(--bg-surface)',
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-full shadow-sm transition-transform"
                        style={{ background: option.gradient }}
                      />
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {option.label}
                      </span>
                      {accent === option.id && (
                        <div
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: option.color }}
                        >
                          <Check size={10} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <h4
                  className="font-bold mb-2 flex items-center gap-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <Globe size={18} style={{ color: 'var(--color-accent)' }} />
                  {t('preferences.language')}
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className="p-2 rounded-xl border-2 transition-all"
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
                      <div
                        className="text-sm font-bold mb-0.5"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {lang.flag}
                      </div>
                      <div
                        className="text-xs font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {lang.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sound & Effects Section */}
          <div
            className="p-6 rounded-3xl shadow-sm"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <h3
              className="flex items-center gap-2 text-xl font-bold mb-6"
              style={{ color: 'var(--text-primary)' }}
            >
              <Volume2 style={{ color: 'var(--color-accent)' }} />
              {t('sound.title', 'Sound & Effects')}
            </h3>

            <div className="space-y-5">
              {/* Sound Toggle */}
              <div
                className="p-4 rounded-xl border-2 transition-all cursor-pointer"
                style={{
                  borderColor: soundEnabled ? 'var(--color-accent)' : 'var(--border-secondary)',
                  backgroundColor: soundEnabled ? 'var(--color-accent-light)' : 'var(--bg-surface)',
                }}
                onClick={() => {
                  const newVal = !soundEnabled;
                  setSoundEnabled(newVal);
                  soundEngine.setEnabled(newVal);
                  if (newVal) soundEngine.playCorrect();
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: soundEnabled ? 'var(--color-accent)' : 'var(--bg-tertiary)',
                    }}
                  >
                    {soundEnabled ? (
                      <Volume2 size={20} className="text-white" />
                    ) : (
                      <VolumeX size={20} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                      {t('sound.effects', 'Sound Effects')}
                    </h4>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {soundEnabled
                        ? t('sound.enabledDesc', 'Sounds play during study sessions')
                        : t('sound.disabledDesc', 'All sounds are muted')}
                    </p>
                  </div>
                  <div
                    className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${
                      soundEnabled ? '' : 'bg-[var(--border-primary)]'
                    }`}
                    style={soundEnabled ? { backgroundColor: 'var(--color-accent)' } : undefined}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${
                        soundEnabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Volume Slider */}
              {soundEnabled && (
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                      {t('sound.volume', 'Volume')}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {Math.round(soundVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{ accentColor: 'var(--color-accent)' }}
                    min="0"
                    max="1"
                    step="0.05"
                    value={soundVolume}
                    onChange={e => {
                      const vol = Number(e.target.value);
                      setSoundVolume(vol);
                      soundEngine.setVolume(vol);
                    }}
                    onMouseUp={() => soundEngine.playCorrect()}
                    onTouchEnd={() => soundEngine.playCorrect()}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sign Out Section */}
          {onLogout && !isGuest && (
            <div
              className="p-5 rounded-2xl"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--border-secondary)',
              }}
            >
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                {t('logout.description', t('logout.message'))}
              </p>
              <button
                onClick={onLogout}
                className="w-full px-5 py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#EF4444',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'rgba(239, 68, 68, 0.2)',
                }}
              >
                <LogOut size={16} /> {t('logout.button')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </div>
  );
};
