import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Lock } from 'lucide-react';
import { Achievement } from '../../../api/achievements';
import { badgeSVGs } from '../Achievements/BadgeIcons';

interface BadgePickerProps {
  achievements: Achievement[];
  selectedIds: string[];
  onToggle: (badgeId: string) => void;
  maxSelections?: number;
}

export const BadgePicker: React.FC<BadgePickerProps> = ({
  achievements,
  selectedIds,
  onToggle,
  maxSelections = 5,
}) => {
  const { t } = useTranslation('settings');

  return (
    <div>
      <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
        {t('badges.hint', {
          count: selectedIds.length,
          max: maxSelections,
          defaultValue: `${selectedIds.length}/${maxSelections} selected — tap to toggle`,
        })}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {achievements.map(badge => {
          const isSelected = selectedIds.includes(badge.id);
          const isUnlocked = badge.unlocked;
          const BadgeSVG = badgeSVGs[badge.id];
          const atLimit = selectedIds.length >= maxSelections && !isSelected;

          return (
            <button
              key={badge.id}
              type="button"
              onClick={() => {
                if (!isUnlocked || atLimit) return;
                onToggle(badge.id);
              }}
              className="relative flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center transition-all"
              style={{
                backgroundColor: isSelected ? 'var(--color-accent-light)' : 'var(--bg-surface)',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: isSelected ? 'var(--color-accent)' : 'var(--border-secondary)',
                cursor: isUnlocked && !atLimit ? 'pointer' : 'default',
                opacity: isUnlocked ? 1 : 0.4,
                filter: isUnlocked ? 'none' : 'grayscale(1)',
              }}
              title={
                isUnlocked
                  ? badge.title
                  : t('badges.locked', { defaultValue: 'Badge not unlocked yet' })
              }
            >
              {BadgeSVG ? (
                <BadgeSVG size={32} unlocked={isUnlocked} />
              ) : (
                <span className="text-xl">{'\u{1F3C6}'}</span>
              )}

              {/* Lock overlay */}
              {!isUnlocked && (
                <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/20">
                  <Lock size={14} className="text-white" />
                </div>
              )}

              {/* Selected indicator */}
              {isSelected && isUnlocked && (
                <div
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  <Check size={12} className="text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
