import React from 'react';
import { useAuthActions } from '../hooks/useAuthActions';

/**
 * Guest Banner Component
 * Displayed at the top of the page for unauthenticated users
 * Encourages signup with a prominent CTA
 */
export const GuestBanner: React.FC = () => {
  const { handleRegisterClick } = useAuthActions();

  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-2 text-center text-sm sticky top-0 z-30">
      <span className="opacity-90">Mod vizitator - progresul nu va fi salvat.</span>
      <button
        onClick={handleRegisterClick}
        className="ml-2 font-bold underline hover:no-underline transition-all"
      >
        Creează cont gratuit
      </button>
    </div>
  );
};
