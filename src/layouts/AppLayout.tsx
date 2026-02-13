import React, { useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';
import { GuestBanner } from './GuestBanner';
import { InstallAppBanner } from './InstallAppBanner';
import { ScrollToTopButton } from '../components/ui/ScrollToTopButton';
import { useUIStore } from '../store/uiStore';
import { useAuth } from '../store/AuthContext';
import { useAuthActions } from '../hooks/useAuthActions';
import { GUEST_USER } from '../utils/guestMode';
import type { User } from '../types';

/**
 * Main application layout
 * Handles sidebar, mobile menu, and guest banner
 */
export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user: authUser } = useAuth();
  const { isMobileMenuOpen, currentView, setMobileMenuOpen, setCurrentView } = useUIStore();
  const { handleLoginClick, handleRegisterClick } = useAuthActions();
  const mainRef = useRef<HTMLElement>(null);

  const user: User = isAuthenticated && authUser ? authUser : GUEST_USER;
  const isGuest = !isAuthenticated;

  return (
    <div
      className="flex h-screen overflow-hidden font-sans"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
    >
      {/* Mobile Menu Toggle */}
      <button
        className="md:hidden fixed top-4 right-4 z-[60] p-2 rounded-lg shadow-md"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-secondary)',
          borderWidth: '1px',
        }}
        onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X /> : <Menu />}
      </button>

      {/* Sidebar */}
      <Sidebar
        user={user}
        currentView={currentView}
        onChangeView={setCurrentView}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        isGuest={isGuest}
        onLoginClick={handleLoginClick}
        onRegisterClick={handleRegisterClick}
      />

      {/* Main Content Area */}
      <main ref={mainRef} className="flex-1 h-full overflow-y-auto relative">
        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Guest Banner */}
        {isGuest && <GuestBanner />}

        {/* Install App Banner (authenticated mobile users, dashboard only) */}
        {!isGuest && <InstallAppBanner />}

        {/* Page Content */}
        {children}
      </main>

      {/* Floating scroll-to-top button */}
      <ScrollToTopButton scrollContainerRef={mainRef} />
    </div>
  );
};
