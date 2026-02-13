import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useUIStore } from '../store/uiStore';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Install App Banner Component
 * Displayed at the top of the dashboard for authenticated mobile users
 * Prompts to add the app as a shortcut to the home screen
 */
export const InstallAppBanner: React.FC = () => {
  const { currentView } = useUIStore();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('install-banner-dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [isMobile, setIsMobile] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check if already installed as PWA
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
  }, []);

  // Capture beforeinstallprompt event
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setDismissed(true);
      }
    } else {
      // Fallback: show instructions for manual add to home screen
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (isIOS) {
        alert(
          'Pentru a salva aplicația:\n\n1. Apasă iconița de partajare (□↑) din Safari\n2. Selectează „Adaugă la ecranul principal"\n3. Apasă „Adaugă"'
        );
      } else {
        alert(
          'Pentru a salva aplicația:\n\n1. Apasă meniul (⋮) din browser\n2. Selectează „Adaugă la ecranul principal" sau „Instalează aplicația"\n3. Confirmă'
        );
      }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('install-banner-dismissed', 'true');
    } catch {
      // Ignore storage errors
    }
  };

  // Only show on dashboard, on mobile, when not dismissed and not already installed
  if (currentView !== 'dashboard' || !isMobile || dismissed || isInstalled) {
    return null;
  }

  return (
    <div
      className="text-white px-4 py-2.5 text-center text-sm sticky top-0 z-30 flex items-center justify-center gap-3 flex-wrap"
      style={{ background: 'var(--color-accent-gradient)' }}
    >
      <Download size={16} className="flex-shrink-0 opacity-80" />
      <button
        onClick={handleInstall}
        className="font-bold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0"
      >
        Salvează aplicația
      </button>
      <button
        onClick={handleDismiss}
        className="p-1 rounded-lg hover:bg-white/20 transition-all flex-shrink-0"
        aria-label="Închide"
      >
        <X size={14} />
      </button>
    </div>
  );
};
