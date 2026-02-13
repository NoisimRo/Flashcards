import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { FlagIcon } from './FlagIcons';

/**
 * LanguageSwitcher - Component for switching between languages
 * Displays current language and allows users to change it
 * Uses collision detection to open upward when near the bottom of the viewport
 */
export const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropUp, setDropUp] = useState(false);

  const languages = [
    { code: 'ro', name: 'Romana' },
    { code: 'en', name: 'English' },
    { code: 'it', name: 'Italiano' },
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('i18nextLng', langCode);
  };

  useEffect(() => {
    const checkPosition = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeight = languages.length * 48 + 16;
        setDropUp(spaceBelow < dropdownHeight);
      }
    };
    checkPosition();
    window.addEventListener('resize', checkPosition);
    window.addEventListener('scroll', checkPosition, true);
    return () => {
      window.removeEventListener('resize', checkPosition);
      window.removeEventListener('scroll', checkPosition, true);
    };
  }, [languages.length]);

  return (
    <div className="relative group" ref={containerRef}>
      <button
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <Languages size={20} />
        <span
          className="text-sm font-medium flex items-center gap-1.5"
          style={{ color: 'var(--text-secondary)' }}
        >
          <FlagIcon code={currentLanguage.code} size={18} />
          {currentLanguage.name}
        </span>
      </button>

      {/* Dropdown - opens upward when near bottom of viewport */}
      <div
        className={`absolute right-0 w-48 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 ${
          dropUp ? 'bottom-full mb-2' : 'mt-2'
        }`}
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderWidth: '1px',
          borderColor: 'var(--border-secondary)',
        }}
      >
        {languages.map(lang => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              lang.code === i18n.language ? 'font-semibold' : ''
            } ${lang.code === languages[0].code ? 'rounded-t-xl' : ''} ${
              lang.code === languages[languages.length - 1].code ? 'rounded-b-xl' : ''
            }`}
            style={{
              backgroundColor: lang.code === i18n.language ? 'var(--bg-secondary)' : 'transparent',
            }}
          >
            <FlagIcon code={lang.code} size={24} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {lang.name}
            </span>
            {lang.code === i18n.language && (
              <span className="ml-auto" style={{ color: 'var(--color-accent)' }}>
                ✓
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
