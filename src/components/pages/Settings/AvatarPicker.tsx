import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Check } from 'lucide-react';

export const AVATARS = [
  { id: 'default', emoji: '\u{1F464}', label: 'Default', requiredLevel: 1 },
  { id: 'student', emoji: '\u{1F4DA}', label: 'Student', requiredLevel: 1 },
  { id: 'scholar', emoji: '\u{1F393}', label: 'Scholar', requiredLevel: 3 },
  { id: 'brain', emoji: '\u{1F9E0}', label: 'Brain', requiredLevel: 5 },
  { id: 'star', emoji: '\u{2B50}', label: 'Star', requiredLevel: 7 },
  { id: 'fire', emoji: '\u{1F525}', label: 'Fire', requiredLevel: 10 },
  { id: 'diamond', emoji: '\u{1F48E}', label: 'Diamond', requiredLevel: 15 },
  { id: 'crown', emoji: '\u{1F451}', label: 'Crown', requiredLevel: 20 },
  { id: 'rocket', emoji: '\u{1F680}', label: 'Rocket', requiredLevel: 25 },
  { id: 'lightning', emoji: '\u{26A1}', label: 'Lightning', requiredLevel: 30 },
  { id: 'dragon', emoji: '\u{1F409}', label: 'Dragon', requiredLevel: 40 },
  { id: 'legend', emoji: '\u{1F3C6}', label: 'Legend', requiredLevel: 50 },
] as const;

export type AvatarId = (typeof AVATARS)[number]['id'];

interface AvatarPickerProps {
  currentAvatar?: string;
  userLevel: number;
  onSelect: (avatarId: string) => void;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  currentAvatar = 'default',
  userLevel,
  onSelect,
}) => {
  const { t } = useTranslation('settings');
  const [tooltipId, setTooltipId] = useState<string | null>(null);
  const [tooltipTimeout, setTooltipTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const showLockedTooltip = useCallback(
    (avatarId: string) => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
      }
      setTooltipId(avatarId);
      const timeout = setTimeout(() => {
        setTooltipId(null);
      }, 2000);
      setTooltipTimeout(timeout);
    },
    [tooltipTimeout]
  );

  const handleAvatarClick = useCallback(
    (avatarId: string, requiredLevel: number) => {
      if (userLevel >= requiredLevel) {
        onSelect(avatarId);
        setTooltipId(null);
      } else {
        showLockedTooltip(avatarId);
      }
    },
    [userLevel, onSelect, showLockedTooltip]
  );

  return (
    <div>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
        {AVATARS.map(avatar => {
          const isUnlocked = userLevel >= avatar.requiredLevel;
          const isSelected = currentAvatar === avatar.id;

          return (
            <div key={avatar.id} className="relative flex flex-col items-center">
              <button
                type="button"
                onClick={() => handleAvatarClick(avatar.id, avatar.requiredLevel)}
                className="relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all"
                style={{
                  backgroundColor: isSelected ? 'var(--color-accent-light)' : 'var(--bg-surface)',
                  borderWidth: '3px',
                  borderStyle: 'solid',
                  borderColor: isSelected ? 'var(--color-accent)' : 'var(--border-secondary)',
                  cursor: isUnlocked ? 'pointer' : 'default',
                  opacity: isUnlocked ? 1 : 0.5,
                  filter: isUnlocked ? 'none' : 'grayscale(0.6)',
                  transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                }}
                aria-label={
                  isUnlocked
                    ? avatar.label
                    : t('avatar.requiresLevel', {
                        level: avatar.requiredLevel,
                        defaultValue: `Requires Level ${avatar.requiredLevel}`,
                      })
                }
              >
                <span className="text-2xl md:text-3xl select-none" role="img" aria-hidden="true">
                  {avatar.emoji}
                </span>

                {/* Lock overlay for locked avatars */}
                {!isUnlocked && (
                  <div
                    className="absolute inset-0 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)' }}
                  >
                    <Lock size={18} className="text-white" />
                  </div>
                )}

                {/* Selected check indicator */}
                {isSelected && isUnlocked && (
                  <div
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    <Check size={14} className="text-white" />
                  </div>
                )}
              </button>

              {/* Label */}
              <span
                className="text-xs font-medium mt-1.5 text-center truncate w-full"
                style={{
                  color: isSelected
                    ? 'var(--color-accent)'
                    : isUnlocked
                      ? 'var(--text-secondary)'
                      : 'var(--text-muted)',
                }}
              >
                {avatar.label}
              </span>

              {/* Required level badge for locked avatars */}
              {!isUnlocked && (
                <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                  {t('avatar.level', {
                    level: avatar.requiredLevel,
                    defaultValue: `Lv. ${avatar.requiredLevel}`,
                  })}
                </span>
              )}

              {/* Tooltip for locked avatars */}
              {tooltipId === avatar.id && !isUnlocked && (
                <div
                  className="absolute -top-12 left-1/2 -translate-x-1/2 text-xs font-semibold rounded-lg py-1.5 px-3 shadow-lg z-50 whitespace-nowrap"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-secondary)',
                  }}
                >
                  {t('avatar.requiresLevel', {
                    level: avatar.requiredLevel,
                    defaultValue: `Requires Level ${avatar.requiredLevel}`,
                  })}
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px]"
                    style={{ borderTopColor: 'var(--bg-secondary)' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
