import React from 'react';
import { X, Lock, Save, TrendingUp, Trophy } from 'lucide-react';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onRegister: () => void;
  title?: string;
  message?: string;
}

const LoginPromptModal: React.FC<LoginPromptModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onRegister,
  title = 'Creează un cont gratuit',
  message = 'Pentru a salva progresul și a debloca toate funcționalitățile',
}) => {
  if (!isOpen) return null;

  const benefits = [
    { icon: Save, text: 'Salvează progresul și reia de unde ai rămas' },
    { icon: TrendingUp, text: 'Urmărește statisticile și evoluția ta' },
    { icon: Trophy, text: 'Câștigă XP, urcă în nivel și obține realizări' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[var(--bg-surface)] rounded-3xl p-8 max-w-md w-full shadow-2xl animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <X size={24} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-hover)] rounded-2xl flex items-center justify-center shadow-lg">
            <Lock className="text-white" size={32} />
          </div>
        </div>

        {/* Title & Message */}
        <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center mb-2">{title}</h2>
        <p className="text-[var(--text-tertiary)] text-center mb-6">{message}</p>

        {/* Benefits */}
        <div className="space-y-3 mb-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="flex items-center gap-3 bg-[var(--bg-tertiary)] p-3 rounded-xl"
            >
              <div className="w-10 h-10 bg-[var(--bg-surface)] rounded-lg flex items-center justify-center shadow-sm">
                <benefit.icon size={20} className="text-[var(--text-secondary)]" />
              </div>
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                {benefit.text}
              </span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={onRegister}
            className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:-translate-y-0.5"
          >
            Creează cont gratuit
          </button>
          <button
            onClick={onLogin}
            className="w-full bg-[var(--bg-tertiary)] hover:bg-[var(--border-secondary)] text-[var(--text-secondary)] font-bold py-4 rounded-xl transition-all"
          >
            Am deja cont
          </button>
        </div>

        {/* Skip */}
        <button
          onClick={onClose}
          className="w-full text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-sm font-medium mt-4 transition-colors"
        >
          Continuă fără cont
        </button>
      </div>
    </div>
  );
};

export default LoginPromptModal;
