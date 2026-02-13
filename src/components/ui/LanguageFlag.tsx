import React from 'react';
import { FlagIcon } from './FlagIcons';

interface LanguageFlagProps {
  code?: string;
  size?: 'sm' | 'md';
}

/**
 * Cross-browser language flag component.
 * Uses inline SVG flags that render correctly on all browsers,
 * replacing emoji flags which don't work on Chrome/Windows.
 */
export const LanguageFlag: React.FC<LanguageFlagProps> = ({ code, size = 'md' }) => {
  const pixelSize = size === 'sm' ? 16 : 20;
  return <FlagIcon code={code || 'ro'} size={pixelSize} />;
};
