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
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl flex items-center justify-center shadow-lg">
            <Lock className="text-white" size={32} />
          </div>
        </div>

        {/* Title & Message */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          {title}
        </h2>
        <p className="text-gray-500 text-center mb-6">
          {message}
        </p>

        {/* Benefits */}
        <div className="space-y-3 mb-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <benefit.icon size={20} className="text-gray-700" />
              </div>
              <span className="text-sm font-medium text-gray-700">{benefit.text}</span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={onRegister}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:-translate-y-0.5"
          >
            Creează cont gratuit
          </button>
          <button
            onClick={onLogin}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-xl transition-all"
          >
            Am deja cont
          </button>
        </div>

        {/* Skip */}
        <button
          onClick={onClose}
          className="w-full text-gray-400 hover:text-gray-600 text-sm font-medium mt-4 transition-colors"
        >
          Continuă fără cont
        </button>
      </div>
    </div>
  );
};

export default LoginPromptModal;
