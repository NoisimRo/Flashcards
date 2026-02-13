import React from 'react';

interface BadgeSVGProps {
  size?: number;
  unlocked?: boolean;
}

type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';

const BadgeContainer: React.FC<{
  tier: Tier;
  size: number;
  unlocked: boolean;
  children: React.ReactNode;
}> = ({ tier, size, unlocked, children }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 512 512"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={unlocked ? undefined : { filter: 'grayscale(100%) opacity(0.5)' }}
  >
    <g fill={`var(--badge-tier-${tier})`}>{children}</g>
  </svg>
);

// a1: Primul Pas - Target/bullseye
const A1Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BadgeContainer tier="bronze" size={size} unlocked={unlocked}>
    {/* Outer ring */}
    <circle cx="256" cy="256" r="200" />
    <circle cx="256" cy="256" r="175" fill="#FFFFFF" fillOpacity="0.2" />
    {/* Middle ring */}
    <circle cx="256" cy="256" r="145" />
    <circle cx="256" cy="256" r="120" fill="#FFFFFF" fillOpacity="0.2" />
    {/* Inner ring */}
    <circle cx="256" cy="256" r="90" />
    {/* White etched ring details */}
    <circle
      cx="256"
      cy="256"
      r="160"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="6"
      strokeOpacity="0.7"
    />
    <circle
      cx="256"
      cy="256"
      r="105"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="6"
      strokeOpacity="0.6"
    />
    {/* Bullseye center */}
    <circle cx="256" cy="256" r="45" fill="#FFFFFF" fillOpacity="0.9" />
    <circle cx="256" cy="256" r="20" />
    {/* Crosshair etching */}
    <line
      x1="256"
      y1="56"
      x2="256"
      y2="140"
      stroke="#FFFFFF"
      strokeWidth="5"
      strokeOpacity="0.5"
      strokeLinecap="round"
    />
    <line
      x1="256"
      y1="372"
      x2="256"
      y2="456"
      stroke="#FFFFFF"
      strokeWidth="5"
      strokeOpacity="0.5"
      strokeLinecap="round"
    />
    <line
      x1="56"
      y1="256"
      x2="140"
      y2="256"
      stroke="#FFFFFF"
      strokeWidth="5"
      strokeOpacity="0.5"
      strokeLinecap="round"
    />
    <line
      x1="372"
      y1="256"
      x2="456"
      y2="256"
      stroke="#FFFFFF"
      strokeWidth="5"
      strokeOpacity="0.5"
      strokeLinecap="round"
    />
  </BadgeContainer>
);

// a2: Stea Strălucitoare - Star
const A2Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BadgeContainer tier="bronze" size={size} unlocked={unlocked}>
    {/* Main bold 5-pointed star */}
    <path d="M256 42l60 150h158l-128 98 50 160-140-106-140 106 50-160L38 192h158z" />
    {/* Inner star geometry etching */}
    <path
      d="M256 130l34 85h90l-73 56 28 91-79-60-79 60 28-91-73-56h90z"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="5"
      strokeOpacity="0.6"
    />
    {/* Central etched lines from center to inner vertices */}
    <line
      x1="256"
      y1="215"
      x2="210"
      y2="310"
      stroke="#FFFFFF"
      strokeWidth="3"
      strokeOpacity="0.5"
    />
    <line
      x1="256"
      y1="215"
      x2="302"
      y2="310"
      stroke="#FFFFFF"
      strokeWidth="3"
      strokeOpacity="0.5"
    />
    <line
      x1="256"
      y1="215"
      x2="175"
      y2="250"
      stroke="#FFFFFF"
      strokeWidth="3"
      strokeOpacity="0.5"
    />
    <line
      x1="256"
      y1="215"
      x2="337"
      y2="250"
      stroke="#FFFFFF"
      strokeWidth="3"
      strokeOpacity="0.5"
    />
    {/* Sparkle dots at star tips */}
    <circle cx="256" cy="55" r="8" fill="#FFFFFF" fillOpacity="0.9" />
    <circle cx="474" cy="192" r="7" fill="#FFFFFF" fillOpacity="0.85" />
    <circle cx="38" cy="192" r="7" fill="#FFFFFF" fillOpacity="0.85" />
    <circle cx="366" cy="450" r="7" fill="#FFFFFF" fillOpacity="0.8" />
    <circle cx="146" cy="450" r="7" fill="#FFFFFF" fillOpacity="0.8" />
  </BadgeContainer>
);

// a3: Rapid ca Fulgerul - Lightning bolt
const A3Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BadgeContainer tier="silver" size={size} unlocked={unlocked}>
    {/* Main thick lightning bolt */}
    <path d="M310 30L150 260h100L200 482 380 220H270z" />
    {/* Internal current lines */}
    <line
      x1="270"
      y1="110"
      x2="200"
      y2="240"
      stroke="#FFFFFF"
      strokeWidth="5"
      strokeOpacity="0.6"
      strokeLinecap="round"
    />
    <line
      x1="290"
      y1="150"
      x2="220"
      y2="260"
      stroke="#FFFFFF"
      strokeWidth="4"
      strokeOpacity="0.5"
      strokeLinecap="round"
    />
    <line
      x1="270"
      y1="280"
      x2="230"
      y2="420"
      stroke="#FFFFFF"
      strokeWidth="5"
      strokeOpacity="0.6"
      strokeLinecap="round"
    />
    <line
      x1="300"
      y1="300"
      x2="260"
      y2="400"
      stroke="#FFFFFF"
      strokeWidth="4"
      strokeOpacity="0.5"
      strokeLinecap="round"
    />
    {/* Bolt tip glow dot */}
    <circle cx="200" cy="478" r="10" fill="#FFFFFF" fillOpacity="0.8" />
    {/* Energy sparkle dots */}
    <circle cx="140" cy="250" r="6" fill="#FFFFFF" fillOpacity="0.6" />
    <circle cx="390" cy="220" r="6" fill="#FFFFFF" fillOpacity="0.6" />
  </BadgeContainer>
);

// a4: Bibliotecar - Books
const A4Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BadgeContainer tier="bronze" size={size} unlocked={unlocked}>
    {/* Book 1 (left, slightly tilted) */}
    <rect x="90" y="80" width="100" height="340" rx="12" transform="rotate(-5 140 250)" />
    <line
      x1="110"
      y1="140"
      x2="170"
      y2="140"
      stroke="#FFFFFF"
      strokeWidth="4"
      strokeOpacity="0.7"
      transform="rotate(-5 140 250)"
    />
    <line
      x1="110"
      y1="170"
      x2="160"
      y2="170"
      stroke="#FFFFFF"
      strokeWidth="3"
      strokeOpacity="0.5"
      transform="rotate(-5 140 250)"
    />
    <rect
      x="115"
      y="200"
      width="50"
      height="8"
      rx="2"
      fill="#FFFFFF"
      fillOpacity="0.6"
      transform="rotate(-5 140 250)"
    />
    {/* Book 2 (center, upright) */}
    <rect x="200" y="60" width="110" height="370" rx="12" />
    <line
      x1="225"
      y1="120"
      x2="285"
      y2="120"
      stroke="#FFFFFF"
      strokeWidth="4"
      strokeOpacity="0.7"
    />
    <line
      x1="225"
      y1="150"
      x2="275"
      y2="150"
      stroke="#FFFFFF"
      strokeWidth="3"
      strokeOpacity="0.5"
    />
    <rect x="230" y="180" width="50" height="8" rx="2" fill="#FFFFFF" fillOpacity="0.6" />
    <line
      x1="225"
      y1="350"
      x2="285"
      y2="350"
      stroke="#FFFFFF"
      strokeWidth="3"
      strokeOpacity="0.4"
    />
    {/* Book 3 (right, slightly tilted) */}
    <rect x="322" y="100" width="100" height="310" rx="12" transform="rotate(5 372 255)" />
    <line
      x1="342"
      y1="160"
      x2="402"
      y2="160"
      stroke="#FFFFFF"
      strokeWidth="4"
      strokeOpacity="0.7"
      transform="rotate(5 372 255)"
    />
    <line
      x1="342"
      y1="190"
      x2="392"
      y2="190"
      stroke="#FFFFFF"
      strokeWidth="3"
      strokeOpacity="0.5"
      transform="rotate(5 372 255)"
    />
    <rect
      x="347"
      y="220"
      width="50"
      height="8"
      rx="2"
      fill="#FFFFFF"
      fillOpacity="0.6"
      transform="rotate(5 372 255)"
    />
  </BadgeContainer>
);

// a5: Flacără Vie - Flame
const A5Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BadgeContainer tier="silver" size={size} unlocked={unlocked}>
    {/* Main flame silhouette */}
    <path d="M256 30c0 0-140 130-140 280 0 90 63 160 140 160s140-70 140-160C396 160 256 30 256 30z" />
    {/* Inner flame */}
    <path
      d="M256 200c0 0-60 55-60 120 0 40 27 70 60 70s60-30 60-70C316 255 256 200 256 200z"
      fill="#FFFFFF"
      fillOpacity="0.25"
    />
    {/* Etched wave lines across flame */}
    <path
      d="M170 320c30-15 55 10 86-5s55 15 86-5"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="4"
      strokeOpacity="0.5"
      strokeLinecap="round"
    />
    <path
      d="M190 370c25-12 45 8 66-4s45 12 66-4"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="3"
      strokeOpacity="0.4"
      strokeLinecap="round"
    />
    {/* Central white flame core */}
    <path
      d="M256 280c0 0-25 25-25 55 0 18 11 30 25 30s25-12 25-30c0-30-25-55-25-55z"
      fill="#FFFFFF"
      fillOpacity="0.8"
    />
    {/* Spark dots */}
    <circle cx="200" cy="180" r="5" fill="#FFFFFF" fillOpacity="0.6" />
    <circle cx="310" cy="160" r="4" fill="#FFFFFF" fillOpacity="0.5" />
    <circle cx="180" cy="250" r="4" fill="#FFFFFF" fillOpacity="0.5" />
  </BadgeContainer>
);

// a6: Diamant - Diamond
const A6Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BadgeContainer tier="gold" size={size} unlocked={unlocked}>
    {/* Main diamond shape */}
    <path d="M256 460L80 210l55-120h242l55 120z" />
    {/* Top crown facet */}
    <path d="M135 90h242l-55 120H190z" fill="#FFFFFF" fillOpacity="0.2" />
    {/* Facet lines from crown to point */}
    <line
      x1="256"
      y1="210"
      x2="256"
      y2="460"
      stroke="#FFFFFF"
      strokeWidth="4"
      strokeOpacity="0.5"
    />
    <line
      x1="190"
      y1="210"
      x2="256"
      y2="460"
      stroke="#FFFFFF"
      strokeWidth="3"
      strokeOpacity="0.35"
    />
    <line
      x1="322"
      y1="210"
      x2="256"
      y2="460"
      stroke="#FFFFFF"
      strokeWidth="3"
      strokeOpacity="0.35"
    />
    <line x1="80" y1="210" x2="256" y2="460" stroke="#FFFFFF" strokeWidth="2" strokeOpacity="0.2" />
    <line
      x1="432"
      y1="210"
      x2="256"
      y2="460"
      stroke="#FFFFFF"
      strokeWidth="2"
      strokeOpacity="0.2"
    />
    {/* Crown facet lines */}
    <line x1="135" y1="90" x2="190" y2="210" stroke="#FFFFFF" strokeWidth="3" strokeOpacity="0.4" />
    <line x1="377" y1="90" x2="322" y2="210" stroke="#FFFFFF" strokeWidth="3" strokeOpacity="0.4" />
    <line x1="256" y1="90" x2="256" y2="210" stroke="#FFFFFF" strokeWidth="3" strokeOpacity="0.4" />
    {/* Horizontal girdle line */}
    <line x1="80" y1="210" x2="432" y2="210" stroke="#FFFFFF" strokeWidth="5" strokeOpacity="0.6" />
    {/* Highlight sparkle */}
    <circle cx="210" cy="150" r="10" fill="#FFFFFF" fillOpacity="0.7" />
    <circle cx="230" cy="130" r="5" fill="#FFFFFF" fillOpacity="0.5" />
  </BadgeContainer>
);

// a7: Maestru - Crown
const A7Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BadgeContainer tier="gold" size={size} unlocked={unlocked}>
    {/* Main crown silhouette */}
    <path d="M60 400V200l80 70 116-145 116 145 80-70v200z" />
    {/* Base band */}
    <rect x="60" y="370" width="392" height="30" fill="#FFFFFF" fillOpacity="0.2" />
    <line x1="60" y1="370" x2="452" y2="370" stroke="#FFFFFF" strokeWidth="5" strokeOpacity="0.7" />
    <line x1="60" y1="400" x2="452" y2="400" stroke="#FFFFFF" strokeWidth="4" strokeOpacity="0.5" />
    {/* Jewels at peak bases */}
    <circle cx="140" cy="300" r="20" fill="#FFFFFF" fillOpacity="0.85" />
    <circle cx="256" cy="250" r="22" fill="#FFFFFF" fillOpacity="0.9" />
    <circle cx="372" cy="300" r="20" fill="#FFFFFF" fillOpacity="0.85" />
    {/* Vertical peak lines */}
    <line
      x1="140"
      y1="270"
      x2="140"
      y2="200"
      stroke="#FFFFFF"
      strokeWidth="4"
      strokeOpacity="0.5"
    />
    <line
      x1="256"
      y1="125"
      x2="256"
      y2="230"
      stroke="#FFFFFF"
      strokeWidth="4"
      strokeOpacity="0.5"
    />
    <line
      x1="372"
      y1="270"
      x2="372"
      y2="200"
      stroke="#FFFFFF"
      strokeWidth="4"
      strokeOpacity="0.5"
    />
    {/* Peak tip dots */}
    <circle cx="60" cy="200" r="12" fill="#FFFFFF" fillOpacity="0.7" />
    <circle cx="256" cy="125" r="14" fill="#FFFFFF" fillOpacity="0.8" />
    <circle cx="452" cy="200" r="12" fill="#FFFFFF" fillOpacity="0.7" />
  </BadgeContainer>
);

// a8: Dedicat - Calendar with check
const A8Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BadgeContainer tier="platinum" size={size} unlocked={unlocked}>
    {/* Calendar body */}
    <rect x="66" y="100" width="380" height="350" rx="30" />
    {/* Header bar */}
    <rect x="66" y="100" width="380" height="80" rx="30" fill="#FFFFFF" fillOpacity="0.2" />
    <line x1="66" y1="180" x2="446" y2="180" stroke="#FFFFFF" strokeWidth="5" strokeOpacity="0.7" />
    {/* Calendar pins */}
    <line
      x1="180"
      y1="72"
      x2="180"
      y2="130"
      stroke="#FFFFFF"
      strokeWidth="14"
      strokeOpacity="0.9"
      strokeLinecap="round"
    />
    <line
      x1="332"
      y1="72"
      x2="332"
      y2="130"
      stroke="#FFFFFF"
      strokeWidth="14"
      strokeOpacity="0.9"
      strokeLinecap="round"
    />
    {/* Grid lines */}
    <line
      x1="190"
      y1="180"
      x2="190"
      y2="450"
      stroke="#FFFFFF"
      strokeWidth="2"
      strokeOpacity="0.3"
    />
    <line
      x1="320"
      y1="180"
      x2="320"
      y2="450"
      stroke="#FFFFFF"
      strokeWidth="2"
      strokeOpacity="0.3"
    />
    <line x1="66" y1="260" x2="446" y2="260" stroke="#FFFFFF" strokeWidth="2" strokeOpacity="0.3" />
    <line x1="66" y1="340" x2="446" y2="340" stroke="#FFFFFF" strokeWidth="2" strokeOpacity="0.3" />
    {/* Checkmark */}
    <path
      d="M190 310l45 50 90-100"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="20"
      strokeOpacity="0.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </BadgeContainer>
);

// a9: Night Owl - Moon with stars
const A9Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BadgeContainer tier="silver" size={size} unlocked={unlocked}>
    {/* Crescent moon */}
    <path d="M300 60c-100 0-185 85-185 190s85 195 185 195c25 0 48-5 70-13C320 410 285 355 285 290c0-80 55-150 125-175-30-35-68-55-110-55z" />
    {/* Crater circles */}
    <circle cx="220" cy="250" r="22" fill="#FFFFFF" fillOpacity="0.15" />
    <circle cx="270" cy="340" r="16" fill="#FFFFFF" fillOpacity="0.12" />
    <circle cx="190" cy="350" r="12" fill="#FFFFFF" fillOpacity="0.1" />
    {/* Moon surface etching */}
    <path
      d="M200 200c20 10 40-5 60 5"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="3"
      strokeOpacity="0.3"
      strokeLinecap="round"
    />
    <path
      d="M230 400c15-8 35 5 50-3"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="3"
      strokeOpacity="0.3"
      strokeLinecap="round"
    />
    {/* Stars */}
    <path
      d="M410 100l8 18h20l-16 12 6 19-18-13-18 13 6-19-16-12h20z"
      fill="#FFFFFF"
      fillOpacity="0.85"
    />
    <path
      d="M440 210l5 12h13l-10 8 4 12-12-8-12 8 4-12-10-8h13z"
      fill="#FFFFFF"
      fillOpacity="0.7"
    />
    <circle cx="380" cy="170" r="5" fill="#FFFFFF" fillOpacity="0.6" />
    <circle cx="460" cy="280" r="4" fill="#FFFFFF" fillOpacity="0.5" />
  </BadgeContainer>
);

// a10: Early Bird - Sunrise
const A10Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BadgeContainer tier="silver" size={size} unlocked={unlocked}>
    {/* Sun half-circle */}
    <path d="M256 310c-72 0-130-58-130-130h260c0 72-58 130-130 130z" />
    {/* Sun rays */}
    <line
      x1="256"
      y1="80"
      x2="256"
      y2="140"
      stroke="var(--badge-tier-silver)"
      strokeWidth="16"
      strokeLinecap="round"
    />
    <line
      x1="145"
      y1="115"
      x2="175"
      y2="160"
      stroke="var(--badge-tier-silver)"
      strokeWidth="14"
      strokeLinecap="round"
    />
    <line
      x1="367"
      y1="115"
      x2="337"
      y2="160"
      stroke="var(--badge-tier-silver)"
      strokeWidth="14"
      strokeLinecap="round"
    />
    <line
      x1="80"
      y1="200"
      x2="130"
      y2="210"
      stroke="var(--badge-tier-silver)"
      strokeWidth="12"
      strokeLinecap="round"
    />
    <line
      x1="432"
      y1="200"
      x2="382"
      y2="210"
      stroke="var(--badge-tier-silver)"
      strokeWidth="12"
      strokeLinecap="round"
    />
    {/* Inner sun etch */}
    <path
      d="M256 290c-55 0-100-45-100-100"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="4"
      strokeOpacity="0.5"
    />
    <circle cx="220" cy="230" r="8" fill="#FFFFFF" fillOpacity="0.6" />
    {/* Horizon line */}
    <line
      x1="40"
      y1="310"
      x2="472"
      y2="310"
      stroke="var(--badge-tier-silver)"
      strokeWidth="14"
      strokeLinecap="round"
    />
    {/* Ground detail lines */}
    <line
      x1="60"
      y1="360"
      x2="200"
      y2="360"
      stroke="var(--badge-tier-silver)"
      strokeWidth="6"
      strokeLinecap="round"
      strokeOpacity="0.5"
    />
    <line
      x1="280"
      y1="380"
      x2="440"
      y2="380"
      stroke="var(--badge-tier-silver)"
      strokeWidth="6"
      strokeLinecap="round"
      strokeOpacity="0.5"
    />
    <line
      x1="100"
      y1="400"
      x2="350"
      y2="400"
      stroke="var(--badge-tier-silver)"
      strokeWidth="5"
      strokeLinecap="round"
      strokeOpacity="0.35"
    />
    {/* Horizon glow */}
    <line
      x1="126"
      y1="310"
      x2="386"
      y2="310"
      stroke="#FFFFFF"
      strokeWidth="6"
      strokeOpacity="0.5"
    />
  </BadgeContainer>
);

// a11: Scor Perfect - Shield with checkmark
const A11Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BadgeContainer tier="gold" size={size} unlocked={unlocked}>
    {/* Main shield */}
    <path d="M256 50L76 140v140c0 120 77 230 180 270 103-40 180-150 180-270V140z" />
    {/* Inner shield outline etching */}
    <path
      d="M256 90L110 165v115c0 100 62 190 146 225 84-35 146-125 146-225V165z"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="6"
      strokeOpacity="0.4"
    />
    {/* Bold checkmark */}
    <path
      d="M185 270l55 60 95-110"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="24"
      strokeOpacity="0.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Shield highlight */}
    <path d="M256 90L110 165v40c50-15 100-25 146-30" fill="#FFFFFF" fillOpacity="0.1" />
  </BadgeContainer>
);

// a12: Maratonist - Trophy
const A12Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BadgeContainer tier="silver" size={size} unlocked={unlocked}>
    {/* Trophy cup */}
    <path d="M156 70h200l-25 180h-150z" />
    {/* Handles */}
    <path
      d="M156 100H100c-15 0-28 15-28 35v20c0 30 20 55 50 55h34"
      fill="none"
      stroke="var(--badge-tier-silver)"
      strokeWidth="22"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M356 100h56c15 0 28 15 28 35v20c0 30-20 55-50 55h-34"
      fill="none"
      stroke="var(--badge-tier-silver)"
      strokeWidth="22"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Stem */}
    <rect x="230" y="250" width="52" height="100" />
    {/* Base */}
    <rect x="170" y="350" width="172" height="35" rx="10" />
    <rect x="195" y="385" width="122" height="25" rx="8" />
    {/* Cup band etching */}
    <line
      x1="170"
      y1="130"
      x2="342"
      y2="130"
      stroke="#FFFFFF"
      strokeWidth="5"
      strokeOpacity="0.5"
    />
    <line
      x1="165"
      y1="160"
      x2="338"
      y2="160"
      stroke="#FFFFFF"
      strokeWidth="3"
      strokeOpacity="0.3"
    />
    {/* Star in cup center */}
    <path
      d="M256 105l12 26h28l-22 17 8 27-26-18-26 18 8-27-22-17h28z"
      fill="#FFFFFF"
      fillOpacity="0.8"
    />
    {/* Base detail */}
    <line
      x1="190"
      y1="367"
      x2="322"
      y2="367"
      stroke="#FFFFFF"
      strokeWidth="3"
      strokeOpacity="0.4"
    />
  </BadgeContainer>
);

// a13: Centurion - Shield with 100
const A13Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BadgeContainer tier="gold" size={size} unlocked={unlocked}>
    {/* Main shield */}
    <path d="M256 50L76 140v140c0 120 77 230 180 270 103-40 180-150 180-270V140z" />
    {/* Inner shield ring */}
    <path
      d="M256 90L110 165v115c0 100 62 190 146 225 84-35 146-125 146-225V165z"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="6"
      strokeOpacity="0.4"
    />
    {/* 100 text */}
    <text
      x="256"
      y="310"
      textAnchor="middle"
      fill="#FFFFFF"
      fillOpacity="0.9"
      fontSize="140"
      fontWeight="bold"
      fontFamily="sans-serif"
    >
      100
    </text>
    {/* Shield highlight */}
    <path d="M256 90L110 165v40c50-15 100-25 146-30" fill="#FFFFFF" fillOpacity="0.1" />
  </BadgeContainer>
);

// a14: Colecționar XP - Coins stack
const A14Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BadgeContainer tier="bronze" size={size} unlocked={unlocked}>
    {/* Bottom coin */}
    <ellipse cx="245" cy="370" rx="130" ry="50" />
    <ellipse
      cx="245"
      cy="370"
      rx="130"
      ry="50"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="5"
      strokeOpacity="0.5"
    />
    {/* Middle coin */}
    <ellipse cx="250" cy="300" rx="130" ry="50" />
    <ellipse
      cx="250"
      cy="300"
      rx="130"
      ry="50"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="5"
      strokeOpacity="0.5"
    />
    {/* Coin edge connectors */}
    <rect x="115" y="300" width="10" height="70" />
    <rect x="370" y="300" width="10" height="70" />
    <rect x="120" y="225" width="10" height="75" />
    <rect x="375" y="225" width="10" height="75" />
    {/* Top coin */}
    <ellipse cx="255" cy="225" rx="130" ry="50" />
    <ellipse
      cx="255"
      cy="225"
      rx="110"
      ry="40"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="4"
      strokeOpacity="0.4"
    />
    <ellipse
      cx="255"
      cy="225"
      rx="130"
      ry="50"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="5"
      strokeOpacity="0.6"
    />
    {/* XP text on top coin */}
    <text
      x="255"
      y="240"
      textAnchor="middle"
      fill="#FFFFFF"
      fillOpacity="0.9"
      fontSize="60"
      fontWeight="bold"
      fontFamily="sans-serif"
    >
      XP
    </text>
  </BadgeContainer>
);

// a15: Tezaurizator XP - Gem
const A15Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BadgeContainer tier="silver" size={size} unlocked={unlocked}>
    {/* Gem crown (top facets) */}
    <path d="M150 180h212l-50-100H200z" />
    {/* Gem pavilion (bottom) */}
    <path d="M150 180l106 270 106-270z" />
    {/* Crown facet lines */}
    <line x1="200" y1="80" x2="216" y2="180" stroke="#FFFFFF" strokeWidth="3" strokeOpacity="0.5" />
    <line x1="312" y1="80" x2="296" y2="180" stroke="#FFFFFF" strokeWidth="3" strokeOpacity="0.5" />
    <line x1="256" y1="80" x2="256" y2="180" stroke="#FFFFFF" strokeWidth="3" strokeOpacity="0.5" />
    {/* Girdle line */}
    <line
      x1="150"
      y1="180"
      x2="362"
      y2="180"
      stroke="#FFFFFF"
      strokeWidth="5"
      strokeOpacity="0.6"
    />
    {/* Pavilion facet lines */}
    <line
      x1="256"
      y1="180"
      x2="256"
      y2="450"
      stroke="#FFFFFF"
      strokeWidth="3"
      strokeOpacity="0.4"
    />
    <line
      x1="216"
      y1="180"
      x2="256"
      y2="450"
      stroke="#FFFFFF"
      strokeWidth="2"
      strokeOpacity="0.3"
    />
    <line
      x1="296"
      y1="180"
      x2="256"
      y2="450"
      stroke="#FFFFFF"
      strokeWidth="2"
      strokeOpacity="0.3"
    />
    {/* Highlight */}
    <path d="M200 80h56l-16 100h-24z" fill="#FFFFFF" fillOpacity="0.15" />
    <circle cx="215" cy="130" r="8" fill="#FFFFFF" fillOpacity="0.5" />
  </BadgeContainer>
);

// a16: Legendă XP - Sparkle/star burst
const A16Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BadgeContainer tier="platinum" size={size} unlocked={unlocked}>
    {/* 8-pointed starburst */}
    <path d="M256 30l30 140 100-100-40 130 145 0-120 75 90 110-125-55 0 150-30-140-100 100 40-130-145 0 120-75-90-110 125 55z" />
    {/* Inner 8-pointed starburst */}
    <path
      d="M256 130l15 70 50-50-20 65 72 0-60 38 45 55-62-28 0 75-15-70-50 50 20-65-72 0 60-38-45-55 62 28z"
      fill="#FFFFFF"
      fillOpacity="0.2"
    />
    {/* Center circle */}
    <circle cx="256" cy="268" r="35" fill="#FFFFFF" fillOpacity="0.8" />
    <circle cx="256" cy="268" r="18" />
    {/* Sparkle dots at tips */}
    <circle cx="256" cy="40" r="7" fill="#FFFFFF" fillOpacity="0.7" />
    <circle cx="386" cy="138" r="6" fill="#FFFFFF" fillOpacity="0.6" />
    <circle cx="431" cy="268" r="6" fill="#FFFFFF" fillOpacity="0.6" />
    <circle cx="386" cy="398" r="6" fill="#FFFFFF" fillOpacity="0.6" />
  </BadgeContainer>
);

// a17: Speed Demon - Timer/stopwatch
const A17Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BadgeContainer tier="gold" size={size} unlocked={unlocked}>
    {/* Main watch body */}
    <circle cx="256" cy="290" r="185" />
    {/* Button at top */}
    <rect x="236" y="60" width="40" height="50" rx="8" />
    {/* Side button */}
    <rect x="420" y="220" width="45" height="30" rx="6" transform="rotate(30 442 235)" />
    {/* Inner face ring */}
    <circle
      cx="256"
      cy="290"
      r="155"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="5"
      strokeOpacity="0.5"
    />
    {/* Tick marks */}
    <line
      x1="256"
      y1="140"
      x2="256"
      y2="165"
      stroke="#FFFFFF"
      strokeWidth="6"
      strokeOpacity="0.8"
      strokeLinecap="round"
    />
    <line
      x1="256"
      y1="415"
      x2="256"
      y2="440"
      stroke="#FFFFFF"
      strokeWidth="6"
      strokeOpacity="0.8"
      strokeLinecap="round"
    />
    <line
      x1="106"
      y1="290"
      x2="131"
      y2="290"
      stroke="#FFFFFF"
      strokeWidth="6"
      strokeOpacity="0.8"
      strokeLinecap="round"
    />
    <line
      x1="381"
      y1="290"
      x2="406"
      y2="290"
      stroke="#FFFFFF"
      strokeWidth="6"
      strokeOpacity="0.8"
      strokeLinecap="round"
    />
    {/* Small tick marks */}
    <line
      x1="362"
      y1="180"
      x2="350"
      y2="195"
      stroke="#FFFFFF"
      strokeWidth="4"
      strokeOpacity="0.5"
      strokeLinecap="round"
    />
    <line
      x1="362"
      y1="400"
      x2="350"
      y2="385"
      stroke="#FFFFFF"
      strokeWidth="4"
      strokeOpacity="0.5"
      strokeLinecap="round"
    />
    <line
      x1="150"
      y1="180"
      x2="162"
      y2="195"
      stroke="#FFFFFF"
      strokeWidth="4"
      strokeOpacity="0.5"
      strokeLinecap="round"
    />
    <line
      x1="150"
      y1="400"
      x2="162"
      y2="385"
      stroke="#FFFFFF"
      strokeWidth="4"
      strokeOpacity="0.5"
      strokeLinecap="round"
    />
    {/* Clock hands */}
    <line
      x1="256"
      y1="290"
      x2="256"
      y2="175"
      stroke="#FFFFFF"
      strokeWidth="10"
      strokeOpacity="0.9"
      strokeLinecap="round"
    />
    <line
      x1="256"
      y1="290"
      x2="340"
      y2="290"
      stroke="#FFFFFF"
      strokeWidth="8"
      strokeOpacity="0.85"
      strokeLinecap="round"
    />
    {/* Center dot */}
    <circle cx="256" cy="290" r="12" fill="#FFFFFF" fillOpacity="0.9" />
  </BadgeContainer>
);

// a18: Explozie de Cunoștințe - Brain with lightning
const A18Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BadgeContainer tier="silver" size={size} unlocked={unlocked}>
    {/* Brain silhouette - left hemisphere */}
    <path d="M256 440c-70-10-130-70-130-160 0-50 25-90 65-110 0-55 50-110 115-110v380z" />
    {/* Brain silhouette - right hemisphere */}
    <path d="M256 440c70-10 130-70 130-160 0-50-25-90-65-110 0-55-50-110-115-110v380z" />
    {/* Center divide */}
    <line x1="256" y1="70" x2="256" y2="430" stroke="#FFFFFF" strokeWidth="4" strokeOpacity="0.4" />
    {/* Brain fold etchings - left */}
    <path
      d="M170 200c30 10 50-15 75 0"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="5"
      strokeOpacity="0.5"
      strokeLinecap="round"
    />
    <path
      d="M150 270c25 15 55-10 90 5"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="5"
      strokeOpacity="0.5"
      strokeLinecap="round"
    />
    <path
      d="M160 340c20 10 45-8 80 0"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="4"
      strokeOpacity="0.4"
      strokeLinecap="round"
    />
    {/* Brain fold etchings - right */}
    <path
      d="M267 200c25-15 50 10 75 0"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="5"
      strokeOpacity="0.5"
      strokeLinecap="round"
    />
    <path
      d="M272 270c30-10 55 15 85-5"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="5"
      strokeOpacity="0.5"
      strokeLinecap="round"
    />
    <path
      d="M272 340c25-10 45 8 75 0"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="4"
      strokeOpacity="0.4"
      strokeLinecap="round"
    />
    {/* Central lightning bolt */}
    <path d="M275 170l-30 80h30l-25 90 55-95h-30z" fill="#FFFFFF" fillOpacity="0.8" />
  </BadgeContainer>
);

// a19: Maestrul Deck-ului - Open book with checkmark
const A19Badge: React.FC<BadgeSVGProps> = ({ size = 48, unlocked = false }) => (
  <BadgeContainer tier="gold" size={size} unlocked={unlocked}>
    {/* Left page */}
    <path d="M60 110h180c15 0 16 5 16 15v300c0 0-10-20-40-20H60z" />
    {/* Right page */}
    <path d="M452 110H272c-15 0-16 5-16 15v300c0 0 10-20 40-20h156z" />
    {/* Spine line */}
    <line
      x1="256"
      y1="110"
      x2="256"
      y2="425"
      stroke="#FFFFFF"
      strokeWidth="6"
      strokeOpacity="0.6"
    />
    {/* Left page lines */}
    <line x1="95" y1="180" x2="225" y2="180" stroke="#FFFFFF" strokeWidth="4" strokeOpacity="0.4" />
    <line x1="95" y1="220" x2="220" y2="220" stroke="#FFFFFF" strokeWidth="4" strokeOpacity="0.4" />
    <line x1="95" y1="260" x2="215" y2="260" stroke="#FFFFFF" strokeWidth="4" strokeOpacity="0.4" />
    <line x1="95" y1="300" x2="210" y2="300" stroke="#FFFFFF" strokeWidth="3" strokeOpacity="0.3" />
    <line x1="95" y1="340" x2="205" y2="340" stroke="#FFFFFF" strokeWidth="3" strokeOpacity="0.3" />
    {/* Right page lines */}
    <line
      x1="290"
      y1="180"
      x2="420"
      y2="180"
      stroke="#FFFFFF"
      strokeWidth="4"
      strokeOpacity="0.4"
    />
    <line
      x1="290"
      y1="220"
      x2="415"
      y2="220"
      stroke="#FFFFFF"
      strokeWidth="4"
      strokeOpacity="0.4"
    />
    {/* Checkmark on right page */}
    <path
      d="M310 300l35 40 70-75"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="18"
      strokeOpacity="0.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </BadgeContainer>
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
