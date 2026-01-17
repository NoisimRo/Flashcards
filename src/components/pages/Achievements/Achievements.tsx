import React from 'react';
import { useTranslation } from 'react-i18next';
import { Achievement, User } from '../../../../types';
import { Target, Star, Zap, Library, Flame, Diamond } from 'lucide-react';

interface AchievementsProps {
  achievements: Achievement[];
  user: User;
}

export const Achievements: React.FC<AchievementsProps> = ({ achievements, user }) => {
  const { t, i18n } = useTranslation('achievements');

  // Map string icon names to components
  const getIcon = (name: string) => {
    switch (name) {
      case 'target':
        return Target;
      case 'star':
        return Star;
      case 'zap':
        return Zap;
      case 'library':
        return Library;
      case 'flame':
        return Flame;
      case 'diamond':
        return Diamond;
      default:
        return Star;
    }
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto">
      <h1 className="text-3xl font-bold text-gray-900">{t('header.title')}</h1>
      <p className="text-gray-500 mb-8">{t('header.subtitle')}</p>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-[#F8F6F1] p-6 rounded-2xl text-center">
          <p className="text-gray-500 text-sm mb-2">{t('stats.badgesUnlocked')}</p>
          <div className="text-4xl font-bold text-gray-900 mb-1">{unlockedCount}</div>
          <p className="text-xs text-gray-400">{t('stats.of', { total: achievements.length })}</p>
        </div>
        <div className="bg-[#F8F6F1] p-6 rounded-2xl text-center">
          <p className="text-gray-500 text-sm mb-2">{t('stats.currentLevel')}</p>
          <div className="text-4xl font-bold text-gray-900 mb-1">{user.level}</div>
          <p className="text-xs text-gray-400">
            {t('stats.xpToNextLevel', {
              xp: user.nextLevelXP - user.currentXP,
              level: user.level + 1,
            })}
          </p>
        </div>
        <div className="bg-[#F8F6F1] p-6 rounded-2xl text-center">
          <p className="text-gray-500 text-sm mb-2">{t('stats.totalPoints')}</p>
          <div className="text-4xl font-bold text-gray-900 mb-1">
            {user.currentXP.toLocaleString(i18n.language)}
          </div>
          <p className="text-xs text-gray-400">{t('stats.xpAccumulated')}</p>
        </div>
      </div>

      {/* Badge Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map(badge => {
          const Icon = getIcon(badge.icon);
          return (
            <div
              key={badge.id}
              className={`p-6 rounded-3xl border-2 flex flex-col items-center text-center transition-transform hover:-translate-y-1
                ${
                  badge.unlocked
                    ? 'bg-white border-transparent shadow-sm'
                    : 'bg-gray-50 border-gray-100 opacity-60 grayscale'
                }
              `}
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${badge.unlocked ? badge.color : 'bg-gray-200 text-gray-400'}`}
              >
                <Icon size={32} />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">{badge.title}</h3>
              <p className="text-sm text-gray-500 mb-4">{badge.description}</p>

              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${badge.unlocked ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'}`}
              >
                {t('xpReward', { xp: badge.xpReward })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
