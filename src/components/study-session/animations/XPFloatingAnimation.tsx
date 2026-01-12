import React, { useEffect, useState } from 'react';
import './animations.css';

interface XPFloatingAnimationProps {
  xp: number;
  onAnimationEnd?: () => void;
}

/**
 * XPFloatingAnimation - Floating +XP text animation
 * Shows when user earns XP from answering correctly
 */
export const XPFloatingAnimation: React.FC<XPFloatingAnimationProps> = ({ xp, onAnimationEnd }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onAnimationEnd?.();
    }, 1500); // Match animation duration

    return () => clearTimeout(timer);
  }, [onAnimationEnd]);

  if (!visible) return null;

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
      <div className="text-green-500 font-black text-2xl animate-float-xp whitespace-nowrap drop-shadow-lg">
        +{xp} XP
      </div>
    </div>
  );
};
