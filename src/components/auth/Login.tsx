import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

interface LoginProps {
  onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchToRegister }) => {
  const { t } = useTranslation();
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError('Te rog completează toate câmpurile');
      return;
    }

    try {
      await login(email, password);
    } catch (err) {
      // Error is handled by AuthContext
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 text-5xl"
            style={{ background: 'var(--color-accent-gradient)' }}
          >
            {t('brand.emoji')}
          </div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('brand.name')}
          </h1>
          <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
            {t('brand.topic')}
          </p>
        </div>

        {/* Login Form */}
        <div
          className="rounded-3xl p-8 shadow-xl"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderWidth: '1px',
            borderColor: 'var(--border-secondary)',
          }}
        >
          <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
            {t('auth:login.title')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                className="block text-sm font-bold mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('auth:login.emailLabel')}
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                  size={20}
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border-2 rounded-xl font-medium outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border-secondary)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder={t('auth:login.emailPlaceholder')}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="block text-sm font-bold mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('auth:login.passwordLabel')}
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                  size={20}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 border-2 rounded-xl font-medium outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border-secondary)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder={t('auth:login.passwordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {(localError || error) && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                {localError || error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {t('app.loading')}
                </>
              ) : (
                t('auth:login.submitButton')
              )}
            </button>
          </form>

          {/* Switch to Register */}
          <div className="mt-6">
            <p className="text-center" style={{ color: 'var(--text-tertiary)' }}>
              {t('auth:login.noAccount')}{' '}
              <button
                onClick={onSwitchToRegister}
                className="font-bold hover:underline"
                style={{ color: 'var(--color-accent)' }}
              >
                {t('auth:login.registerLink')}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
          {t('brand.slogan')}
        </p>
      </div>
    </div>
  );
};

export default Login;
