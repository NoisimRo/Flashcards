import React, { useEffect, useState } from 'react';

interface HintOverlayProps {
  hint: string;
  onDismiss?: () => void;
  autoDismissDelay?: number; // milliseconds
}

/**
 * HintOverlay - Reusable hint display component
 * Features:
 * - Auto-dismiss after configurable delay (default 5 seconds)
 * - Manual dismiss on click
 * - Glassmorphism design with fade-in animation
 */
export const HintOverlay: React.FC<HintOverlayProps> = ({
  hint,
  onDismiss,
  autoDismissDelay = 5000,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss timer
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, autoDismissDelay);

    return () => clearTimeout(timer);
  }, [autoDismissDelay, onDismiss]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <div
      className="absolute top-16 left-4 right-4 backdrop-blur-md bg-yellow-50/95 border border-yellow-300/50 shadow-xl rounded-xl p-4 z-20 animate-fade-in cursor-pointer"
      onClick={handleClick}
      style={{
        animation: 'fadeIn 0.3s ease-in-out',
      }}
    >
      <div className="text-sm text-yellow-900">
        <span className="font-bold">💡 Context:</span> {hint}
      </div>
    </div>
  );
};
