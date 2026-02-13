import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, ArrowRight, LogIn } from 'lucide-react';
import { useAuthActions } from '../hooks/useAuthActions';

/**
 * Guest Banner Component
 * Displayed at the top of the page for unauthenticated users
 * Encourages signup with a prominent, inviting CTA
 */
export const GuestBanner: React.FC = () => {
  const { t } = useTranslation('common');
  const { handleRegisterClick, handleLoginClick } = useAuthActions();

  return (
    <div
      className="text-white px-4 pr-14 md:pr-4 py-2.5 text-center text-sm sticky top-0 z-30 flex items-center justify-center gap-3 flex-wrap"
      style={{ background: 'var(--color-accent-gradient)' }}
    >
      <Sparkles size={16} className="flex-shrink-0 opacity-80" />
      <span className="opacity-90">{t('guestBanner.message')}</span>
      <button
        onClick={handleRegisterClick}
        className="font-bold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0"
      >
        {t('guestBanner.cta')}
        <ArrowRight size={14} />
      </button>
      <button
        onClick={handleLoginClick}
        className="font-bold bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0 border border-white/30"
      >
        <LogIn size={14} />
        {t('guestBanner.login')}
      </button>
    </div>
  );
};
