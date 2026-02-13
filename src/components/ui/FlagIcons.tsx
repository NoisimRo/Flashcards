import React from 'react';

/**
 * Inline SVG flag components for cross-browser support.
 * Emoji flags don't render correctly on Chrome/Windows — these SVGs work everywhere.
 */

export const FlagRO: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size * 0.67}
    viewBox="0 0 30 20"
    xmlns="http://www.w3.org/2000/svg"
    className="inline-block rounded-sm overflow-hidden flex-shrink-0"
  >
    <rect width="10" height="20" fill="#002B7F" />
    <rect x="10" width="10" height="20" fill="#FCD116" />
    <rect x="20" width="10" height="20" fill="#CE1126" />
  </svg>
);

export const FlagGB: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size * 0.67}
    viewBox="0 0 60 40"
    xmlns="http://www.w3.org/2000/svg"
    className="inline-block rounded-sm overflow-hidden flex-shrink-0"
  >
    <rect width="60" height="40" fill="#012169" />
    <path d="M0 0L60 40M60 0L0 40" stroke="#FFF" strokeWidth="6" />
    <path d="M0 0L60 40M60 0L0 40" stroke="#C8102E" strokeWidth="4" clipPath="url(#gb-clip)" />
    <defs>
      <clipPath id="gb-clip">
        <path d="M30 0H60V20H30V0ZM0 20H30V40H0V20Z" />
      </clipPath>
    </defs>
    <path d="M0 20H60M30 0V40" stroke="#FFF" strokeWidth="10" />
    <path d="M0 20H60M30 0V40" stroke="#C8102E" strokeWidth="6" />
  </svg>
);

export const FlagIT: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size * 0.67}
    viewBox="0 0 30 20"
    xmlns="http://www.w3.org/2000/svg"
    className="inline-block rounded-sm overflow-hidden flex-shrink-0"
  >
    <rect width="10" height="20" fill="#009246" />
    <rect x="10" width="10" height="20" fill="#FFF" />
    <rect x="20" width="10" height="20" fill="#CE2B37" />
  </svg>
);

export const FLAGS: Record<string, React.FC<{ size?: number }>> = {
  ro: FlagRO,
  en: FlagGB,
  it: FlagIT,
};

export const FlagIcon: React.FC<{ code: string; size?: number }> = ({ code, size = 20 }) => {
  const Flag = FLAGS[code] || FLAGS.ro;
  return <Flag size={size} />;
};
