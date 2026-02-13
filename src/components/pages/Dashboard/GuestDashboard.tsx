import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Trophy,
  Star,
  ArrowRight,
  Lock,
  Target,
  Zap,
  Flame,
  Diamond,
  Crown,
  Award,
  Calendar,
  BarChart3,
  Users,
  Play,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import { getDecks } from '../../../api/decks';
import { useAuthActions } from '../../../hooks/useAuthActions';
import achievementsData from '../../../data/seed/achievements.json';
import type { Deck, DeckWithCards } from '../../../types';

const ICON_MAP: Record<string, React.ElementType> = {
  target: Target,
  star: Star,
  zap: Zap,
  flame: Flame,
  diamond: Diamond,
  crown: Crown,
  award: Award,
  trophy: Trophy,
};

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
        {/* Section 1: Two-Column Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Value Proposition + CTA */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* Main Card */}
            <div
              className="rounded-3xl p-6 md:p-8 border flex-1"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--color-accent-gradient)' }}
                >
                  <Sparkles size={18} className="text-white" />
                </div>
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'var(--color-accent)' }}
                >
                  AiMinte
                </span>
              </div>

              <h1
                className="text-2xl md:text-3xl font-bold mb-3 leading-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                {t('guest.hero.title')}
              </h1>
              <p
                className="text-sm md:text-base mb-6 leading-relaxed"
                style={{ color: 'var(--text-muted)' }}
              >
                {t('guest.hero.subtitle')}
              </p>

              {/* Feature checklist */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3">
                  <CheckCircle
                    size={18}
                    style={{ color: 'var(--color-accent)' }}
                    className="flex-shrink-0"
                  />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {t('guest.features.spacedRepetition')} —{' '}
                    {t('guest.features.spacedRepetitionDesc')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle
                    size={18}
                    style={{ color: 'var(--color-accent)' }}
                    className="flex-shrink-0"
                  />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {t('guest.features.xpAndLevels')} — {t('guest.features.xpAndLevelsDesc')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle
                    size={18}
                    style={{ color: 'var(--color-accent)' }}
                    className="flex-shrink-0"
                  />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {t('guest.features.achievements')} — {t('guest.features.achievementsDesc')}
                  </span>
                </div>
              </div>

              {/* CTA buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleRegisterClick}
                  className="text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{ background: 'var(--color-accent-gradient)' }}
                >
                  {t('guest.hero.registerCTA')}
                  <ArrowRight size={18} />
                </button>
                <button
                  onClick={() => onChangeView('study')}
                  className="font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{
                    color: 'var(--color-accent)',
                    backgroundColor: 'var(--color-accent-light)',
                  }}
                >
                  <BookOpen size={18} />
                  {t('guest.hero.exploreCTA')}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Product Preview (mini dashboard mockup) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Stats preview card */}
            <div
              className="rounded-2xl p-5 border"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
                    style={{ backgroundColor: 'var(--color-accent-light)' }}
                  >
                    <Flame size={20} style={{ color: 'var(--color-accent)' }} />
                  </div>
                  <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    0
                  </div>
                  <div className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                    Streak
                  </div>
                </div>
                <div className="text-center">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
                    style={{ backgroundColor: 'var(--color-accent-light)' }}
                  >
                    <Zap size={20} style={{ color: 'var(--color-accent)' }} />
                  </div>
                  <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    0
                  </div>
                  <div className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                    XP
                  </div>
                </div>
                <div className="text-center">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
                    style={{ backgroundColor: 'var(--color-accent-light)' }}
                  >
                    <Trophy size={20} style={{ color: 'var(--color-accent)' }} />
                  </div>
                  <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    0
                  </div>
                  <div className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                    Badge-uri
                  </div>
                </div>
              </div>
              {/* XP Progress bar placeholder */}
              <div className="mt-4">
                <div
                  className="flex justify-between text-[10px] font-semibold mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <span>Nivel 1</span>
                  <span>0 / 100 XP</span>
                </div>
                <div
                  className="h-2 w-full rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  <div
                    className="h-full rounded-full w-0"
                    style={{ background: 'var(--color-accent-gradient)' }}
                  />
                </div>
              </div>
            </div>

            {/* Quick start deck cards preview */}
            {quickStartDecks.slice(0, 2).map(deck => (
              <div
                key={deck.id}
                className="rounded-2xl p-4 border transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  borderColor: 'var(--border-subtle)',
                }}
                onClick={() => onStartSession(deck)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-bold text-sm line-clamp-1 mb-1"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {deck.title}
                    </h3>
                    <div
                      className="flex items-center gap-2 text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <span>{deck.totalCards} carduri</span>
                      {deck.averageRating && deck.averageRating > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Star size={11} className="text-amber-500 fill-amber-500" />
                          {deck.averageRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className="ml-3 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white transition-all active:scale-95"
                    style={{ background: 'var(--color-accent-gradient)' }}
                    onClick={e => {
                      e.stopPropagation();
                      onStartSession(deck);
                    }}
                  >
                    <Play size={16} />
                  </button>
                </div>
              </div>
            ))}

            {/* Activity calendar placeholder */}
            <div
              className="rounded-2xl p-4 border"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  {t('activityCalendar.title')}
                </span>
                <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 28 }, (_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-sm"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  />
                ))}
              </div>
            </div>
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
              const Icon = ICON_MAP[badge.icon] || Star;
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

                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${badge.color}`}
                  >
                    <Icon size={24} />
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
