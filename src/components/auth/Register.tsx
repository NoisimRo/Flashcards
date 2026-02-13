import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import { Mail, Lock, Eye, EyeOff, Loader2, User, GraduationCap, KeyRound } from 'lucide-react';

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
  const [teacherCode, setTeacherCode] = useState('');
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

    if (role === 'teacher' && !teacherCode.trim()) {
      setLocalError('Codul de invitație este obligatoriu pentru profesori');
      return;
    }

    try {
      await register(
        email,
        password,
        name,
        role,
        role === 'teacher' ? teacherCode.trim() : undefined
      );
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
          <img
            src="/brain-icon.svg"
            alt={t('brand.name')}
            className="w-16 h-16 rounded-2xl mb-4 mx-auto"
          />
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
                    role === 'student' ? 'text-white' : 'hover:border-[var(--border-primary)]'
                  }`}
                  style={
                    role === 'student'
                      ? {
                          backgroundColor: 'var(--color-accent)',
                          borderColor: 'var(--color-accent)',
                        }
                      : {
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-secondary)',
                          color: 'var(--text-secondary)',
                        }
                  }
                >
                  <GraduationCap size={20} />
                  Elev
                </button>
                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                    role === 'teacher' ? 'text-white' : 'hover:border-[var(--border-primary)]'
                  }`}
                  style={
                    role === 'teacher'
                      ? {
                          backgroundColor: 'var(--color-accent)',
                          borderColor: 'var(--color-accent)',
                        }
                      : {
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-secondary)',
                          color: 'var(--text-secondary)',
                        }
                  }
                >
                  <User size={20} />
                  Profesor
                </button>
              </div>
            </div>

            {/* Teacher Invitation Code */}
            {role === 'teacher' && (
              <div>
                <label
                  className="block text-sm font-bold mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Cod de invitatie
                </label>
                <div className="relative">
                  <KeyRound
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }}
                    size={20}
                  />
                  <input
                    type="text"
                    value={teacherCode}
                    onChange={e => setTeacherCode(e.target.value.toUpperCase())}
                    className="w-full pl-12 pr-4 py-4 border-2 rounded-xl font-medium outline-none transition-colors uppercase tracking-wider"
                    style={inputStyle}
                    placeholder="Introdu codul primit de la admin"
                    maxLength={20}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Ai nevoie de un cod de invitatie de la administrator pentru a te inregistra ca
                  profesor.
                </p>
              </div>
            )}

            {/* Password */}
            <div>
              <label
                className="block text-sm font-bold mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Parola
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
                Confirma parola
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
                  placeholder="Repeta parola"
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
              className="w-full text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Se creeaza contul...
                </>
              ) : (
                'Creeaza cont'
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
              Autentifica-te
            </button>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
          Tu inveti. AI-ul face restul.
        </p>
      </div>
    </div>
  );
};

export default Register;
