import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './animations.css';

interface XPFloatingAnimationProps {
  xp: number;
  onAnimationEnd?: () => void;
}

/**
 * XPFloatingAnimation - Floating +XP text animation
 * Shows when user earns XP from answering correctly or loses XP from hints
 * Uses React Portal to ensure visibility regardless of parent positioning
 */
export const XPFloatingAnimation: React.FC<XPFloatingAnimationProps> = ({ xp, onAnimationEnd }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onAnimationEnd?.();
    }, 2500); // Match animation duration

    return () => clearTimeout(timer);
  }, [onAnimationEnd]);

  if (!visible) return null;

  const isPositive = xp > 0;
  const displayValue = Math.abs(xp);
  const sign = isPositive ? '+' : '-';
  const color = isPositive ? 'text-green-500' : 'text-red-500';

  const animation = (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] pointer-events-none">
      <div
        className={`${color} font-black text-2xl animate-float-xp whitespace-nowrap drop-shadow-2xl`}
      >
        {sign}
        {displayValue} XP
      </div>
    </div>
  );

  // Use portal to render at body level to avoid parent transform/positioning issues
  return createPortal(animation, document.body);
};
