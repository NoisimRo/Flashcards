import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

// --- SparkleExplosion ---

interface SparkleExplosionProps {
  active: boolean;
  onComplete: () => void;
}

const SPARKLE_COLORS = ['#FFD700', '#FF8C00', '#FFEB3B', '#8BC34A', '#00BCD4', '#FF69B4'];

interface SparkleParticle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  color: string;
  delay: number;
}

function generateParticles(): SparkleParticle[] {
  const count = 12 + Math.floor(Math.random() * 5); // 12-16 particles
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: Math.random() * 360,
    distance: 60 + Math.random() * 60,
    size: 4 + Math.random() * 4,
    color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
    delay: Math.random() * 100,
  }));
}

/**
 * SparkleExplosion - Burst of sparkle particles on correct answers.
 * Particles explode outward from center, fade out and shrink over 600ms.
 * Uses React Portal to render at body level.
 */
export const SparkleExplosion: React.FC<SparkleExplosionProps> = ({ active, onComplete }) => {
  const [visible, setVisible] = useState(false);

  const particles = useMemo(() => {
    if (active) return generateParticles();
    return [];
  }, [active]);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }

    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 600);

    return () => clearTimeout(timer);
  }, [active, onComplete]);

  if (!visible || particles.length === 0) return null;

  const overlay = (
    <>
      <style>{`
        @keyframes sparkle-burst {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) translate(0px, 0px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) translate(var(--tx), var(--ty)) scale(0);
          }
        }
      `}</style>
      <div className="fixed inset-0 z-[9999] pointer-events-none">
        <div className="absolute top-1/2 left-1/2">
          {particles.map(p => {
            const rad = (p.angle * Math.PI) / 180;
            const tx = Math.cos(rad) * p.distance;
            const ty = Math.sin(rad) * p.distance;

            return (
              <div
                key={p.id}
                style={
                  {
                    position: 'absolute',
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    borderRadius: '50%',
                    backgroundColor: p.color,
                    boxShadow: `0 0 ${p.size}px ${p.color}`,
                    '--tx': `${tx}px`,
                    '--ty': `${ty}px`,
                    animation: `sparkle-burst 600ms ${p.delay}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
                  } as React.CSSProperties
                }
              />
            );
          })}
        </div>
      </div>
    </>
  );

  return createPortal(overlay, document.body);
};

// --- ScreenShake ---

interface ScreenShakeProps {
  active: boolean;
  intensity?: 'light' | 'medium' | 'heavy';
  children: React.ReactNode;
}

const shakeConfig = {
  light: { displacement: 2, duration: 300 },
  medium: { displacement: 4, duration: 400 },
  heavy: { displacement: 6, duration: 500 },
} as const;

/**
 * ScreenShake - Wraps children and applies a quick jolt shake effect.
 * Pattern: left, right, up, down, settle.
 */
export const ScreenShake: React.FC<ScreenShakeProps> = ({
  active,
  intensity = 'medium',
  children,
}) => {
  const { displacement, duration } = shakeConfig[intensity];
  const d = displacement;

  const shakeKeyframes = `
    @keyframes screen-shake-${intensity} {
      0% { transform: translate(0, 0); }
      15% { transform: translate(-${d}px, 0); }
      30% { transform: translate(${d}px, 0); }
      45% { transform: translate(0, -${d}px); }
      60% { transform: translate(0, ${d}px); }
      75% { transform: translate(-${d * 0.5}px, ${d * 0.5}px); }
      100% { transform: translate(0, 0); }
    }
  `;

  return (
    <>
      {active && <style>{shakeKeyframes}</style>}
      <div
        style={
          active ? { animation: `screen-shake-${intensity} ${duration}ms ease-out` } : undefined
        }
      >
        {children}
      </div>
    </>
  );
};
