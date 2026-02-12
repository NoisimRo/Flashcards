import React from 'react';
import { LANGUAGE_INFO } from '../../constants/subjects';

interface LanguageFlagProps {
  code?: string;
  size?: 'sm' | 'md';
}

/**
 * Cross-browser language flag component.
 * Uses a colored pill with the language code, since emoji flags
 * don't render on Chrome/Windows (they show two-letter codes instead).
 */
export const LanguageFlag: React.FC<LanguageFlagProps> = ({ code, size = 'md' }) => {
  const lang = LANGUAGE_INFO[code || 'ro'] || LANGUAGE_INFO.ro;
  const isSmall = size === 'sm';

  return (
    <span
      className={`inline-flex items-center justify-center font-bold text-white rounded-md leading-none ${isSmall ? 'text-[9px] px-1 py-0.5 min-w-[22px]' : 'text-[10px] px-1.5 py-1 min-w-[26px]'}`}
      style={{ backgroundColor: lang.color }}
      title={code?.toUpperCase() || 'RO'}
    >
      {lang.code}
    </span>
  );
};
