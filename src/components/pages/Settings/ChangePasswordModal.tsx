import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, X, Lock, KeyRound } from 'lucide-react';
import { changePassword } from '../../../api/auth';
import { useToast } from '../../ui/Toast';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FieldErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

function getPasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) return 'weak';

  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return 'weak';
  if (score <= 2) return 'fair';
  if (score <= 3) return 'good';
  return 'strong';
}

const STRENGTH_CONFIG: Record<
  PasswordStrength,
  { label: string; color: string; segments: number }
> = {
  weak: { label: 'changePassword.strength.weak', color: '#EF4444', segments: 1 },
  fair: { label: 'changePassword.strength.fair', color: '#F59E0B', segments: 2 },
  good: { label: 'changePassword.strength.good', color: '#3B82F6', segments: 3 },
  strong: { label: 'changePassword.strength.strong', color: '#10B981', segments: 4 },
};

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation('settings');
  const toast = useToast();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Cleanup close timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const resetForm = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setErrors({});
    setServerError('');
    setIsSubmitting(false);
  }, []);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  }, [isSubmitting, resetForm, onClose]);

  const validate = useCallback((): boolean => {
    const newErrors: FieldErrors = {};

    if (!currentPassword.trim()) {
      newErrors.currentPassword = t('changePassword.errors.currentRequired');
    }

    if (!newPassword.trim()) {
      newErrors.newPassword = t('changePassword.errors.newRequired');
    } else if (newPassword.length < 8) {
      newErrors.newPassword = t('changePassword.errors.minLength');
    } else if (!/\d/.test(newPassword)) {
      newErrors.newPassword = t('changePassword.errors.needsNumber');
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = t('changePassword.errors.confirmRequired');
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = t('changePassword.errors.mismatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentPassword, newPassword, confirmPassword, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const response = await changePassword(currentPassword, newPassword);

      if (response.success) {
        toast.success(t('changePassword.successTitle'), t('changePassword.successMessage'));
        resetForm();
        closeTimerRef.current = setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        const errorMessage = response.error?.message || t('changePassword.errors.generic');
        setServerError(errorMessage);
      }
    } catch (error) {
      console.error('Change password error:', error);
      setServerError(t('changePassword.errors.generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear field-specific error when user types
  const handleCurrentPasswordChange = (value: string) => {
    setCurrentPassword(value);
    if (errors.currentPassword) {
      setErrors(prev => ({ ...prev, currentPassword: undefined }));
    }
    if (serverError) setServerError('');
  };

  const handleNewPasswordChange = (value: string) => {
    setNewPassword(value);
    if (errors.newPassword) {
      setErrors(prev => ({ ...prev, newPassword: undefined }));
    }
    // Also clear confirm mismatch error if passwords now match
    if (errors.confirmPassword && value === confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (errors.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
  };

  if (!isOpen) return null;

  const strength = getPasswordStrength(newPassword);
  const strengthConfig = STRENGTH_CONFIG[strength];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'var(--overlay-bg)' }}
      onClick={handleClose}
    >
      <div
        className="rounded-2xl max-w-md w-full shadow-2xl animate-fade-in"
        style={{ backgroundColor: 'var(--bg-surface)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-accent)', opacity: 0.15 }}
            >
              <KeyRound size={20} style={{ color: 'var(--color-accent)' }} />
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {t('changePassword.title')}
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl transition-colors hover:opacity-80 disabled:opacity-50"
            style={{ color: 'var(--text-muted)' }}
            aria-label={t('changePassword.close')}
          >
            <X size={20} />
          </button>
        </div>

        <p className="px-6 pt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          {t('changePassword.subtitle')}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Server error */}
          {serverError && (
            <div
              className="p-3 rounded-xl text-sm font-medium border"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                borderColor: 'rgba(239, 68, 68, 0.2)',
                color: '#EF4444',
              }}
            >
              {serverError}
            </div>
          )}

          {/* Current Password */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span className="flex items-center gap-1.5">
                <Lock size={14} style={{ color: 'var(--text-muted)' }} />
                {t('changePassword.currentPassword')}
              </span>
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => handleCurrentPasswordChange(e.target.value)}
                disabled={isSubmitting}
                autoComplete="current-password"
                className="w-full rounded-xl p-3 pr-11 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: errors.currentPassword ? '#EF4444' : 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
                placeholder={t('changePassword.currentPasswordPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 transition-colors hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}
                tabIndex={-1}
                aria-label={
                  showCurrentPassword
                    ? t('changePassword.hidePassword')
                    : t('changePassword.showPassword')
                }
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="mt-1 text-xs font-medium" style={{ color: '#EF4444' }}>
                {errors.currentPassword}
              </p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span className="flex items-center gap-1.5">
                <KeyRound size={14} style={{ color: 'var(--text-muted)' }} />
                {t('changePassword.newPassword')}
              </span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => handleNewPasswordChange(e.target.value)}
                disabled={isSubmitting}
                autoComplete="new-password"
                className="w-full rounded-xl p-3 pr-11 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: errors.newPassword ? '#EF4444' : 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
                placeholder={t('changePassword.newPasswordPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 transition-colors hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}
                tabIndex={-1}
                aria-label={
                  showNewPassword
                    ? t('changePassword.hidePassword')
                    : t('changePassword.showPassword')
                }
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-xs font-medium" style={{ color: '#EF4444' }}>
                {errors.newPassword}
              </p>
            )}

            {/* Password Strength Indicator */}
            {newPassword.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1.5 mb-1">
                  {[1, 2, 3, 4].map(segment => (
                    <div
                      key={segment}
                      className="h-1.5 flex-1 rounded-full transition-colors duration-300"
                      style={{
                        backgroundColor:
                          segment <= strengthConfig.segments
                            ? strengthConfig.color
                            : 'var(--border-secondary)',
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs font-medium" style={{ color: strengthConfig.color }}>
                  {t(strengthConfig.label)}
                </p>
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span className="flex items-center gap-1.5">
                <KeyRound size={14} style={{ color: 'var(--text-muted)' }} />
                {t('changePassword.confirmPassword')}
              </span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => handleConfirmPasswordChange(e.target.value)}
                disabled={isSubmitting}
                autoComplete="new-password"
                className="w-full rounded-xl p-3 pr-11 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: errors.confirmPassword ? '#EF4444' : 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
                placeholder={t('changePassword.confirmPasswordPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 transition-colors hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}
                tabIndex={-1}
                aria-label={
                  showConfirmPassword
                    ? t('changePassword.hidePassword')
                    : t('changePassword.showPassword')
                }
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-xs font-medium" style={{ color: '#EF4444' }}>
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-secondary)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--border-secondary)',
              }}
            >
              {t('changePassword.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {isSubmitting ? t('changePassword.submitting') : t('changePassword.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
