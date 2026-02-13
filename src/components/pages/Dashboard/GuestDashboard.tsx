import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Trophy,
  TrendingUp,
  Star,
  ArrowRight,
  Lock,
  Calendar,
  BarChart3,
  Users,
  Play,
} from 'lucide-react';
import { getDecks } from '../../../api/decks';
import { useAuthActions } from '../../../hooks/useAuthActions';
import achievementsData from '../../../data/seed/achievements.json';
import type { Deck, DeckWithCards } from '../../../types';
import { badgeSVGs } from '../Achievements/BadgeIcons';

interface GuestDashboardProps {
  onStartSession: (deck: Deck) => void;
  onChangeView: (view: string) => void;
}

export const GuestDashboard: React.FC<GuestDashboardProps> = ({ onStartSession, onChangeView }) => {
  const { t } = useTranslation('dashboard');
  const { handleRegisterClick } = useAuthActions();
  const [featuredDecks, setFeaturedDecks] = useState<DeckWithCards[]>([]);

  useEffect(() => {
    const fetchPublicDecks = async () => {
      try {
        const response = await getDecks({ publicOnly: true });
        if (response.success && response.data) {
          const sorted = [...response.data].sort(
            (a, b) => (b.averageRating || 0) - (a.averageRating || 0)
          );
          setFeaturedDecks(sorted);
        }
      } catch (error) {
        console.error('Error fetching public decks:', error);
      }
    };
    fetchPublicDecks();
  }, []);

  // Pick 4 visually diverse achievements for preview (one from each tier)
  const previewAchievements = useMemo(() => {
    const picks = ['a1', 'a5', 'a6', 'a11']; // bronze, silver, gold, gold
    return achievementsData.filter(a => picks.includes(a.id));
  }, []);

  const quickStartDecks = featuredDecks.slice(0, 3);
  const gridDecks = featuredDecks.slice(0, 6);

  return (
    <div
      className="min-h-screen h-screen overflow-y-auto"
      style={{ background: 'var(--dashboard-bg)' }}
    >
      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Section 1: Welcome Hero */}
        <section
          className="rounded-3xl p-6 md:p-10 text-white relative overflow-hidden"
          style={{ background: 'var(--color-accent-gradient)' }}
        >
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-bold mb-3">{t('guest.hero.title')}</h1>
            <p className="text-sm md:text-base opacity-90 mb-6 max-w-xl">
              {t('guest.hero.subtitle')}
            </p>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="flex items-center gap-3 bg-white/15 rounded-xl px-4 py-3">
                <BookOpen size={22} className="flex-shrink-0" />
                <div>
                  <div className="font-semibold text-sm">
                    {t('guest.features.spacedRepetition')}
                  </div>
                  <div className="text-xs opacity-80">
                    {t('guest.features.spacedRepetitionDesc')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/15 rounded-xl px-4 py-3">
                <TrendingUp size={22} className="flex-shrink-0" />
                <div>
                  <div className="font-semibold text-sm">{t('guest.features.xpAndLevels')}</div>
                  <div className="text-xs opacity-80">{t('guest.features.xpAndLevelsDesc')}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/15 rounded-xl px-4 py-3">
                <Trophy size={22} className="flex-shrink-0" />
                <div>
                  <div className="font-semibold text-sm">{t('guest.features.achievements')}</div>
                  <div className="text-xs opacity-80">{t('guest.features.achievementsDesc')}</div>
                </div>
              </div>
            </div>

            {/* CTA buttons - centered on mobile */}
            <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
              <button
                onClick={() => onChangeView('study')}
                className="bg-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all hover:shadow-lg active:scale-[0.98]"
                style={{ color: 'var(--color-accent)' }}
              >
                <BookOpen size={18} />
                {t('guest.hero.exploreCTA')}
              </button>
              <button
                onClick={handleRegisterClick}
                className="bg-white/20 hover:bg-white/30 font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all"
              >
                {t('guest.hero.registerCTA')}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>

          {/* Decorative background element */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 flex items-center justify-center pointer-events-none">
            <BookOpen size={200} strokeWidth={0.5} />
          </div>
        </section>

        {/* Section 2: Quick Start */}
        {quickStartDecks.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {t('guest.quickStart.title')}
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t('guest.quickStart.subtitle')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {quickStartDecks.map(deck => (
                <div
                  key={deck.id}
                  className="rounded-2xl p-5 border-2 transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    borderColor: 'var(--border-subtle)',
                  }}
                  onClick={() => onStartSession(deck)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3
                      className="font-bold text-base line-clamp-2"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {deck.title}
                    </h3>
                    <Play
                      size={20}
                      className="flex-shrink-0 ml-2"
                      style={{ color: 'var(--color-accent)' }}
                    />
                  </div>
                  <div
                    className="flex items-center gap-3 text-sm"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span>
                      {deck.totalCards} {deck.totalCards === 1 ? 'card' : 'carduri'}
                    </span>
                    {deck.averageRating && deck.averageRating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star size={14} className="text-amber-500 fill-amber-500" />
                        {deck.averageRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {deck.ownerName && (
                    <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                      {t('guest.featuredDecks.byAuthor', { author: deck.ownerName })}
                    </p>
                  )}
                  <button
                    className="mt-4 w-full text-white font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                    onClick={e => {
                      e.stopPropagation();
                      onStartSession(deck);
                    }}
                  >
                    <Play size={16} />
                    {t('guest.quickStart.studyNow')}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 3: Featured Decks Grid */}
        {gridDecks.length > 3 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {t('guest.featuredDecks.title')}
              </h2>
              <button
                onClick={() => onChangeView('study')}
                className="text-sm font-semibold flex items-center gap-1 transition-colors"
                style={{ color: 'var(--color-accent)' }}
              >
                {t('guest.featuredDecks.seeAll')}
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gridDecks.map(deck => (
                <div
                  key={deck.id}
                  className="rounded-2xl p-4 border transition-all hover:shadow-md cursor-pointer"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    borderColor: 'var(--border-subtle)',
                  }}
                  onClick={() => onStartSession(deck)}
                >
                  <h3
                    className="font-semibold text-sm line-clamp-1 mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {deck.title}
                  </h3>
                  <div
                    className="flex items-center gap-3 text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span>{t('guest.featuredDecks.cards', { total: deck.totalCards })}</span>
                    {deck.difficulty && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {deck.difficulty}
                      </span>
                    )}
                    {deck.averageRating && deck.averageRating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star size={12} className="text-amber-500 fill-amber-500" />
                        {deck.averageRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {deck.ownerName && (
                    <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                      {t('guest.featuredDecks.byAuthor', { author: deck.ownerName })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 4: Achievement Preview */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {t('guest.achievementPreview.title')}
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('guest.achievementPreview.subtitle')}
              </p>
            </div>
            <button
              onClick={() => onChangeView('achievements')}
              className="text-sm font-semibold flex items-center gap-1"
              style={{ color: 'var(--color-accent)' }}
            >
              {t('buttons.viewAll')}
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {previewAchievements.map(badge => {
              const BadgeSVG = badgeSVGs[badge.id];
              return (
                <div
                  key={badge.id}
                  className="relative rounded-2xl p-5 border text-center transition-all hover:-translate-y-1 hover:shadow-md"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  {/* Lock overlay */}
                  <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/10 backdrop-blur-sm flex items-center justify-center">
                    <Lock size={14} style={{ color: 'var(--text-muted)' }} />
                  </div>

                  <div className="flex items-center justify-center mx-auto mb-3">
                    {BadgeSVG ? (
                      <BadgeSVG size={56} unlocked={false} />
                    ) : (
                      <Trophy size={40} className="text-gray-400" />
                    )}
                  </div>
                  <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                    {t(`items.${badge.id}.title`, {
                      ns: 'achievements',
                      defaultValue: badge.title,
                    })}
                  </h3>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                    {t(`items.${badge.id}.description`, {
                      ns: 'achievements',
                      defaultValue: badge.description,
                    })}
                  </p>
                  <span className="text-xs font-bold" style={{ color: 'var(--color-accent)' }}>
                    +{badge.xpReward} XP
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 5: Value Proposition + CTA */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div
              className="rounded-2xl p-6 text-center"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: 'var(--color-accent-light)' }}
              >
                <Calendar size={24} style={{ color: 'var(--color-accent)' }} />
              </div>
              <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                {t('guest.valueProp.trackProgress')}
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {t('guest.valueProp.trackProgressDesc')}
              </p>
            </div>
            <div
              className="rounded-2xl p-6 text-center"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: 'var(--color-accent-light)' }}
              >
                <BarChart3 size={24} style={{ color: 'var(--color-accent)' }} />
              </div>
              <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                {t('guest.valueProp.earnXP')}
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {t('guest.valueProp.earnXPDesc')}
              </p>
            </div>
            <div
              className="rounded-2xl p-6 text-center"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: 'var(--color-accent-light)' }}
              >
                <Users size={24} style={{ color: 'var(--color-accent)' }} />
              </div>
              <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                {t('guest.valueProp.compete')}
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {t('guest.valueProp.competeDesc')}
              </p>
            </div>
          </div>

          {/* Final CTA */}
          <div
            className="rounded-2xl p-6 md:p-8 text-center"
            style={{ background: 'var(--color-accent-gradient)' }}
          >
            <p className="text-white text-lg font-bold mb-4">{t('guest.valueProp.finalCTA')}</p>
            <button
              onClick={handleRegisterClick}
              className="bg-white font-bold px-8 py-3 rounded-xl transition-all hover:shadow-lg active:scale-[0.98] flex items-center gap-2 mx-auto"
              style={{ color: 'var(--color-accent)' }}
            >
              {t('guest.hero.registerCTA')}
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
