import { useState, useEffect, useCallback } from 'react';
import { getBadgeTierColors, updateBadgeTierColors, type BadgeTierColors } from '../api/settings';

const DEFAULT_COLORS: BadgeTierColors = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#9B59B6',
};

function applyBadgeColorsToDOM(colors: BadgeTierColors) {
  const root = document.documentElement;
  root.style.setProperty('--badge-tier-bronze', colors.bronze);
  root.style.setProperty('--badge-tier-silver', colors.silver);
  root.style.setProperty('--badge-tier-gold', colors.gold);
  root.style.setProperty('--badge-tier-platinum', colors.platinum);
}

export function useBadgeTierColors() {
  const [colors, setColors] = useState<BadgeTierColors>(DEFAULT_COLORS);

  useEffect(() => {
    getBadgeTierColors()
      .then(res => {
        if (res.data) {
          const merged = { ...DEFAULT_COLORS, ...res.data };
          setColors(merged);
          applyBadgeColorsToDOM(merged);
        }
      })
      .catch(() => {
        // Use CSS defaults already in themes.css
      });
  }, []);

  const setTierColor = useCallback(
    (tier: keyof BadgeTierColors, color: string) => {
      const updated = { ...colors, [tier]: color };
      setColors(updated);
      document.documentElement.style.setProperty(`--badge-tier-${tier}`, color);
      updateBadgeTierColors({ [tier]: color }).catch(() => {});
    },
    [colors]
  );

  const resetToDefaults = useCallback(() => {
    setColors(DEFAULT_COLORS);
    applyBadgeColorsToDOM(DEFAULT_COLORS);
    updateBadgeTierColors(DEFAULT_COLORS).catch(() => {});
  }, []);

  return { colors, setTierColor, resetToDefaults };
}
