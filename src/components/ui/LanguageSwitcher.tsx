import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

/**
 * LanguageSwitcher - Component for switching between languages
 * Displays current language and allows users to change it
 */
export const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'ro', name: 'Romana', flag: '🇷🇴' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('i18nextLng', langCode);
  };

  return (
    <div className="relative group">
      <button
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <Languages size={20} />
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {currentLanguage.flag} {currentLanguage.name}
        </span>
      </button>

      {/* Dropdown */}
      <div
        className="absolute right-0 mt-2 w-48 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50"
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
            <span className="text-2xl">{lang.flag}</span>
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
