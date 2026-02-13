import React from 'react';

interface BadgeSVGProps {
  size?: number;
  unlocked?: boolean;
}

// Helper: tier gradient definitions
const tierGradients = {
  bronze: { start: '#CD7F32', end: '#A0522D', glow: '#DEB887' },
  silver: { start: '#C0C0C0', end: '#808080', glow: '#E8E8E8' },
  gold: { start: '#FFD700', end: '#DAA520', glow: '#FFF8DC' },
  platinum: { start: '#9B59B6', end: '#6C3483', glow: '#D2B4DE' },
};

type Tier = keyof typeof tierGradients;

const BaseBadge: React.FC<{
  tier: Tier;
  size: number;
  unlocked: boolean;
  children: React.ReactNode;
  id: string;
}> = ({ tier, size, unlocked, children, id }) => {
  const g = tierGradients[tier];
  const gradientId = `grad-${id}`;
  const glowId = `glow-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={unlocked ? undefined : { filter: 'grayscale(100%) opacity(0.5)' }}
    >
      <defs>
        <radialGradient id={gradientId} cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor={g.glow} />
          <stop offset="100%" stopColor={g.start} />
        </radialGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={g.glow} stopOpacity="0.4" />
          <stop offset="100%" stopColor={g.start} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Outer glow */}
      {unlocked && <circle cx="32" cy="32" r="31" fill={`url(#${glowId})`} />}
      {/* Main circle */}
      <circle cx="32" cy="32" r="28" fill={`url(#${gradientId})`} />
      <circle cx="32" cy="32" r="28" stroke={g.end} strokeWidth="2" strokeOpacity="0.5" />
      {/* Inner ring */}
      <circle cx="32" cy="32" r="24" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
      {/* Icon */}
      <g fill="white" fillOpacity="0.95">
        {children}
      </g>
    </svg>
  );
};

// a1: Primul Pas - Target/bullseye
const A1Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BaseBadge tier="bronze" size={size} unlocked={unlocked} id="a1">
    <circle cx="32" cy="32" r="10" fill="none" stroke="white" strokeWidth="2.5" />
    <circle cx="32" cy="32" r="5" fill="none" stroke="white" strokeWidth="2.5" />
    <circle cx="32" cy="32" r="1.5" />
  </BaseBadge>
);

// a2: Stea Strălucitoare - Star
const A2Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BaseBadge tier="bronze" size={size} unlocked={unlocked} id="a2">
    <path d="M32 18l3.5 7.5 8 1-6 5.5 1.5 8L32 36l-7 4 1.5-8-6-5.5 8-1z" />
  </BaseBadge>
);

// a3: Rapid ca Fulgerul - Lightning bolt
const A3Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BaseBadge tier="silver" size={size} unlocked={unlocked} id="a3">
    <path d="M35 18L25 34h7l-3 12 12-16h-7z" />
  </BaseBadge>
);

// a4: Bibliotecar - Books
const A4Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BaseBadge tier="bronze" size={size} unlocked={unlocked} id="a4">
    <rect x="22" y="22" width="6" height="18" rx="1" />
    <rect x="29" y="20" width="6" height="20" rx="1" />
    <rect x="36" y="24" width="6" height="16" rx="1" />
  </BaseBadge>
);

// a5: Flacără Vie - Flame
const A5Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BaseBadge tier="silver" size={size} unlocked={unlocked} id="a5">
    <path d="M32 18c0 0-8 8-8 16 0 5 3.5 8 8 8s8-3 8-8c0-8-8-16-8-16zm0 20c-2.2 0-4-1.8-4-4 0-3.5 4-8 4-8s4 4.5 4 8c0 2.2-1.8 4-4 4z" />
  </BaseBadge>
);

// a6: Diamant - Diamond
const A6Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BaseBadge tier="gold" size={size} unlocked={unlocked} id="a6">
    <path d="M32 44L20 28l4-8h16l4 8z" />
    <path d="M24 20h16l-4 8H28z" fill="white" fillOpacity="0.3" />
    <line x1="32" y1="28" x2="32" y2="44" stroke="white" strokeWidth="0.5" strokeOpacity="0.5" />
    <line x1="26" y1="28" x2="32" y2="44" stroke="white" strokeWidth="0.5" strokeOpacity="0.3" />
    <line x1="38" y1="28" x2="32" y2="44" stroke="white" strokeWidth="0.5" strokeOpacity="0.3" />
  </BaseBadge>
);

// a7: Maestru - Crown
const A7Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BaseBadge tier="gold" size={size} unlocked={unlocked} id="a7">
    <path d="M20 40V26l6 5 6-9 6 9 6-5v14z" />
    <circle cx="20" cy="24" r="2" />
    <circle cx="32" cy="20" r="2" />
    <circle cx="44" cy="24" r="2" />
  </BaseBadge>
);

// a8: Dedicat - Calendar with check
const A8Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BaseBadge tier="platinum" size={size} unlocked={unlocked} id="a8">
    <rect x="21" y="22" width="22" height="20" rx="3" fill="none" stroke="white" strokeWidth="2" />
    <line x1="21" y1="28" x2="43" y2="28" stroke="white" strokeWidth="2" />
    <line x1="27" y1="19" x2="27" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <line x1="37" y1="19" x2="37" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path
      d="M27 34l3 3 7-7"
      fill="none"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </BaseBadge>
);

// a9: Night Owl - Moon with stars
const A9Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BaseBadge tier="silver" size={size} unlocked={unlocked} id="a9">
    <path d="M36 22c-6 0-11 5-11 11s5 11 11 11c1 0 2-.1 3-.4-2.2-1.5-3.5-4.2-3.5-7.1 0-4.8 3.5-8.7 8-9.5-2-2.5-4.8-4-7.5-4z" />
    <circle cx="40" cy="24" r="1.5" />
    <circle cx="44" cy="30" r="1" />
  </BaseBadge>
);

// a10: Early Bird - Sunrise
const A10Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BaseBadge tier="silver" size={size} unlocked={unlocked} id="a10">
    <circle cx="32" cy="34" r="6" />
    <line x1="32" y1="24" x2="32" y2="21" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <line x1="24" y1="28" x2="22" y2="26" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <line x1="40" y1="28" x2="42" y2="26" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <line x1="22" y1="34" x2="19" y2="34" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <line x1="42" y1="34" x2="45" y2="34" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <line x1="18" y1="40" x2="46" y2="40" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </BaseBadge>
);

// a11: Scor Perfect - Checkmark in shield
const A11Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BaseBadge tier="gold" size={size} unlocked={unlocked} id="a11">
    <path
      d="M32 18l-11 5v9c0 7.5 4.7 14.5 11 17 6.3-2.5 11-9.5 11-17v-9z"
      fill="none"
      stroke="white"
      strokeWidth="2"
    />
    <path
      d="M27 32l4 4 8-8"
      fill="none"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </BaseBadge>
);

// a12: Maratonist - Running trophy
const A12Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BaseBadge tier="silver" size={size} unlocked={unlocked} id="a12">
    <path d="M26 22h12l-1 8h-10zm4 8v6h4v-6z" />
    <rect x="27" y="36" width="10" height="2" rx="1" />
    <path d="M38 24h3c1 0 2 1 2 2v1c0 1-1 2-2 2h-2" fill="none" stroke="white" strokeWidth="1.5" />
    <path d="M26 24h-3c-1 0-2 1-2 2v1c0 1 1 2 2 2h2" fill="none" stroke="white" strokeWidth="1.5" />
  </BaseBadge>
);

// a13: Centurion - Shield with 100
const A13Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BaseBadge tier="gold" size={size} unlocked={unlocked} id="a13">
    <path
      d="M32 18l-11 5v9c0 7.5 4.7 14.5 11 17 6.3-2.5 11-9.5 11-17v-9z"
      fill="none"
      stroke="white"
      strokeWidth="2"
    />
    <text
      x="32"
      y="36"
      textAnchor="middle"
      fill="white"
      fontSize="11"
      fontWeight="bold"
      fontFamily="sans-serif"
    >
      100
    </text>
  </BaseBadge>
);

// a14: Colecționar XP - Coins stack
const A14Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BaseBadge tier="bronze" size={size} unlocked={unlocked} id="a14">
    <ellipse cx="30" cy="36" rx="7" ry="3" fill="none" stroke="white" strokeWidth="2" />
    <ellipse cx="30" cy="32" rx="7" ry="3" fill="none" stroke="white" strokeWidth="2" />
    <ellipse cx="30" cy="28" rx="7" ry="3" />
    <text
      x="30"
      y="31"
      textAnchor="middle"
      fill={tierGradients.bronze.end}
      fontSize="8"
      fontWeight="bold"
      fontFamily="sans-serif"
    >
      XP
    </text>
  </BaseBadge>
);

// a15: Tezaurizator XP - Gem
const A15Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BaseBadge tier="silver" size={size} unlocked={unlocked} id="a15">
    <path d="M24 26h16l-3 16h-10z" />
    <path d="M24 26l4-6h8l4 6" fill="none" stroke="white" strokeWidth="2" />
    <line x1="32" y1="20" x2="32" y2="42" stroke={tierGradients.silver.end} strokeWidth="0.5" />
  </BaseBadge>
);

// a16: Legendă XP - Sparkle/star burst
const A16Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BaseBadge tier="platinum" size={size} unlocked={unlocked} id="a16">
    <path d="M32 18l2 8 8-2-6 6 6 6-8-2-2 8-2-8-8 2 6-6-6-6 8 2z" />
  </BaseBadge>
);

// a17: Speed Demon - Timer/stopwatch
const A17Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BaseBadge tier="gold" size={size} unlocked={unlocked} id="a17">
    <circle cx="32" cy="34" r="10" fill="none" stroke="white" strokeWidth="2" />
    <line x1="32" y1="34" x2="32" y2="28" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <line x1="32" y1="34" x2="36" y2="34" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <line x1="30" y1="22" x2="34" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <line x1="32" y1="22" x2="32" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <line x1="39" y1="26" x2="41" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </BaseBadge>
);

// a18: Explozie de Cunoștințe - Brain with lightning
const A18Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BaseBadge tier="silver" size={size} unlocked={unlocked} id="a18">
    <path
      d="M28 40c-4-1-7-5-7-9 0-3 1.5-5 4-6.5 0-3.5 3-6.5 7-6.5s7 3 7 6.5c2.5 1.5 4 3.5 4 6.5 0 4-3 8-7 9"
      fill="none"
      stroke="white"
      strokeWidth="2"
    />
    <line x1="32" y1="24" x2="32" y2="40" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
    <path
      d="M34 28l-3 5h4l-3 5"
      fill="none"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </BaseBadge>
);

// a19: Maestrul Deck-ului - Book with checkmark
const A19Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BaseBadge tier="gold" size={size} unlocked={unlocked} id="a19">
    <path d="M22 20h8c2 0 2 0 2 2v20c0 0-1-2-3-2h-7z" fill="none" stroke="white" strokeWidth="2" />
    <path d="M42 20h-8c-2 0-2 0-2 2v20c0 0 1-2 3-2h7z" fill="none" stroke="white" strokeWidth="2" />
    <path
      d="M28 30l3 3 5-5"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </BaseBadge>
);

export const badgeSVGs: Record<string, React.FC<BadgeSVGProps>> = {
  a1: A1Badge,
  a2: A2Badge,
  a3: A3Badge,
  a4: A4Badge,
  a5: A5Badge,
  a6: A6Badge,
  a7: A7Badge,
  a8: A8Badge,
  a9: A9Badge,
  a10: A10Badge,
  a11: A11Badge,
  a12: A12Badge,
  a13: A13Badge,
  a14: A14Badge,
  a15: A15Badge,
  a16: A16Badge,
  a17: A17Badge,
  a18: A18Badge,
  a19: A19Badge,
};
