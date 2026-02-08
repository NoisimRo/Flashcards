import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import { Mail, Lock, Eye, EyeOff, Loader2, User, GraduationCap } from 'lucide-react';

interface RegisterProps {
  onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
  const { t } = useTranslation();
  const { register, isLoading, error } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!name || !email || !password || !confirmPassword) {
      setLocalError('Te rog completează toate câmpurile');
      return;
    }

    if (password.length < 6) {
      setLocalError('Parola trebuie să aibă minim 6 caractere');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Parolele nu coincid');
      return;
    }

    try {
      await register(email, password, name, role);
    } catch (err) {
      // Error is handled by AuthContext
    }
  };

  const inputStyle = {
    backgroundColor: 'var(--input-bg)',
    borderColor: 'var(--border-secondary)',
    color: 'var(--text-primary)',
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

        {/* Register Form */}
        <div
          className="rounded-3xl p-8 shadow-xl"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderWidth: '1px',
            borderColor: 'var(--border-secondary)',
          }}
        >
          <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
            {t('auth:register.title')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label
                className="block text-sm font-bold mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('auth:register.nameLabel')}
              </label>
              <div className="relative">
                <User
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                  size={20}
                />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border-2 rounded-xl font-medium outline-none transition-colors"
                  style={inputStyle}
                  placeholder={t('auth:register.namePlaceholder')}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                className="block text-sm font-bold mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Email
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
                  style={inputStyle}
                  placeholder="email@exemplu.ro"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label
                className="block text-sm font-bold mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Sunt
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                    role === 'student'
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                  style={role !== 'student' ? { backgroundColor: 'var(--bg-surface)' } : undefined}
                >
                  <GraduationCap size={20} />
                  Elev
                </button>
                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                    role === 'teacher'
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                  style={role !== 'teacher' ? { backgroundColor: 'var(--bg-surface)' } : undefined}
                >
                  <User size={20} />
                  Profesor
                </button>
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="block text-sm font-bold mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Parolă
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
                  style={inputStyle}
                  placeholder="Minim 6 caractere"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                className="block text-sm font-bold mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Confirmă parola
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                  size={20}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border-2 rounded-xl font-medium outline-none transition-colors"
                  style={inputStyle}
                  placeholder="Repetă parola"
                />
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
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Se creează contul...
                </>
              ) : (
                'Creează cont'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div
              className="flex-1 h-px"
              style={{ backgroundColor: 'var(--border-secondary)' }}
            ></div>
            <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              sau
            </span>
            <div
              className="flex-1 h-px"
              style={{ backgroundColor: 'var(--border-secondary)' }}
            ></div>
          </div>

          {/* Switch to Login */}
          <p className="text-center" style={{ color: 'var(--text-tertiary)' }}>
            Ai deja cont?{' '}
            <button
              onClick={onSwitchToLogin}
              className="font-bold hover:underline"
              style={{ color: 'var(--color-accent)' }}
            >
              Autentifică-te
            </button>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
          Tu înveți. AI-ul face restul.
        </p>
      </div>
    </div>
  );
};

export default Register;
