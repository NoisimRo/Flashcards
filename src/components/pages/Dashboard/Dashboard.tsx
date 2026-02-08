import React, { useMemo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Deck } from '../../../types';
import {
  getTodaysChallenges,
  DailyChallenge,
  getActivityCalendar,
  ActivityDay,
} from '../../../api/dailyChallenges';
import { getAchievements, Achievement } from '../../../api/achievements';
import { getUserCardStats, CardStats } from '../../../api/users';
import { getStudySessions } from '../../../api/studySessions';
import type { StudySession } from '../../../types/models';
import {
  Flame,
  Clock,
  Brain,
  TrendingUp,
  BookOpen,
  Trophy,
  Target,
  Zap,
  Star,
  Award,
  ChevronRight,
  Crown,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts';

interface DashboardProps {
  user: User;
  decks: Deck[];
  onStartSession: (deck: Deck) => void;
  onChangeView: (view: string) => void;
  onResumeSession?: (sessionId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  decks,
  onStartSession,
  onChangeView,
  onResumeSession,
}) => {
  const { t, i18n } = useTranslation('dashboard');

  // State for daily challenges
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallenge[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(true);

  // State for activity calendar
  const [activityCalendar, setActivityCalendar] = useState<ActivityDay[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);

  // State for achievements
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState(true);

  // State for card stats
  const [cardStats, setCardStats] = useState<CardStats | null>(null);
  const [cardStatsLoading, setCardStatsLoading] = useState(true);

  // State for active sessions
  const [activeSessions, setActiveSessions] = useState<StudySession[]>([]);
  const [activeSessionsLoading, setActiveSessionsLoading] = useState(true);
  const [totalActiveSessions, setTotalActiveSessions] = useState(0);

  // Fetch daily challenges, activity calendar, achievements, card stats, and active sessions on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          challengesResponse,
          calendarResponse,
          achievementsResponse,
          cardStatsResponse,
          activeSessionsResponse,
        ] = await Promise.all([
          getTodaysChallenges(),
          getActivityCalendar(),
          getAchievements(),
          getUserCardStats(user.id),
          getStudySessions({ status: 'active', limit: 100 }), // Fetch all active sessions
        ]);

        if (challengesResponse.success) {
          setDailyChallenges(challengesResponse.data.challenges);
        }

        if (calendarResponse.success) {
          setActivityCalendar(calendarResponse.data.calendar);
        }

        if (achievementsResponse.success) {
          setAchievements(achievementsResponse.data.achievements);
        }

        if (cardStatsResponse.success) {
          setCardStats(cardStatsResponse.data);
        }

        if (activeSessionsResponse.success) {
          const sessions = activeSessionsResponse.data;
          setActiveSessions(sessions);
          setTotalActiveSessions(sessions.length);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setDailyChallenges([]);
        setActivityCalendar([]);
        setAchievements([]);
        setCardStats(null);
        setActiveSessions([]);
      } finally {
        setChallengesLoading(false);
        setCalendarLoading(false);
        setAchievementsLoading(false);
        setCardStatsLoading(false);
        setActiveSessionsLoading(false);
      }
    };

    fetchData();
  }, [user.id]);

  // Calculate stats from real data
  const stats = useMemo(() => {
    const totalMastered = decks.reduce((sum, deck) => sum + deck.masteredCards, 0);
    const totalCards = decks.reduce((sum, deck) => sum + deck.totalCards, 0);
    // Success rate based on correct answers / total answers (not mastered/total cards)
    const successRate =
      user.totalAnswers > 0 ? Math.round((user.totalCorrectAnswers / user.totalAnswers) * 100) : 0;
    const hours = (user.totalTimeSpent / 60).toFixed(1);
    const activeDecks = decks.filter(d => d.masteredCards < d.totalCards && d.totalCards > 0);
    const completedDecks = decks.filter(d => d.masteredCards === d.totalCards && d.totalCards > 0);

    // Calculate XP progress to next level (using backend values)
    const xpForNextLevel = user.nextLevelXP;
    const xpProgress = user.currentXP;
    const xpNeeded = xpForNextLevel - xpProgress;
    const progressPercentage = Math.round((xpProgress / xpForNextLevel) * 100);

    return {
      totalCardsLearned: user.totalCardsLearned || totalMastered,
      totalTimeSpentFormatted: `${hours}h`,
      successRate: `${successRate}%`,
      successRateValue: successRate,
      totalCorrectAnswers: user.totalCorrectAnswers || 0,
      totalAnswers: user.totalAnswers || 0,
      streak: user.streak,
      longestStreak: user.longestStreak,
      totalXP: user.totalXP,
      level: user.level,
      currentXP: xpProgress,
      xpForNextLevel,
      xpNeeded,
      progressPercentage,
      totalDecksCompleted: user.totalDecksCompleted || completedDecks.length,
      activeDecksCount: activeDecks.length,
      completedDecksCount: completedDecks.length,
    };
  }, [user, decks]);

  // Get decks needing review (low progress)
  const decksNeedingReview = useMemo(() => {
    return decks
      .filter(d => d.totalCards > 0)
      .map(d => ({
        ...d,
        progress: d.totalCards > 0 ? (d.masteredCards / d.totalCards) * 100 : 0,
      }))
      .sort((a, b) => a.progress - b.progress)
      .slice(0, 3);
  }, [decks]);

  // Map icon names to icon components
  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      BookOpen,
      Clock,
      Flame,
    };
    return icons[iconName] || BookOpen;
  };

  // Map icon names to emojis for achievements
  const getAchievementEmoji = (iconName: string) => {
    const emojiMap: Record<string, string> = {
      target: '🎯',
      star: '⭐',
      zap: '⚡',
      library: '📚',
      flame: '🔥',
      diamond: '💎',
      crown: '👑',
      calendar: '📅',
    };
    return emojiMap[iconName] || '🏆';
  };

  // Recent achievements (unlocked, sorted by unlock date, limit 3)
  const recentAchievements = useMemo(() => {
    return achievements
      .filter(a => a.unlocked)
      .sort((a, b) => {
        const dateA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
        const dateB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
        return dateB - dateA; // Most recent first
      })
      .slice(0, 3)
      .map(a => ({
        icon: getAchievementEmoji(a.icon),
        title: a.title,
        color: a.color || 'bg-gray-100',
      }));
  }, [achievements]);

  // Calculate today's and weekly study time from activity calendar
  const studyTimeStats = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Get today's time
    const todayActivity = activityCalendar.find(day => day.date === todayStr);
    const todayMinutes = todayActivity?.timeSpent || 0;

    // Get weekly time (last 7 days including today)
    const last7Days = activityCalendar.slice(-7);
    const weeklyMinutes = last7Days.reduce((sum, day) => sum + (day.timeSpent || 0), 0);

    // Format date using locale
    const formatDate = (date: Date) => {
      return date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });
    };

    const todayFormatted = formatDate(today);

    // Weekly range: 6 days ago to today
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6);
    const weekStartFormatted = formatDate(weekStart);
    const weekEndFormatted = formatDate(today);

    return {
      todayMinutes,
      todayFormatted,
      weeklyMinutes,
      weekRange: `${weekStartFormatted}-${weekEndFormatted}`,
    };
  }, [activityCalendar, i18n.language]);

  // Radial chart data for XP progress
  const radialData = [
    {
      name: 'XP',
      value: stats.progressPercentage,
      fill: 'var(--color-accent)',
    },
  ];

  return (
    <div
      className="min-h-screen h-screen overflow-y-auto"
      style={{ background: 'var(--dashboard-bg)' }}
    >
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          {/* User Info with Level Badge */}
          <div className="flex items-start gap-4">
            <div className="relative">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg"
                style={{ background: 'var(--color-accent-gradient)' }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                <Crown size={10} />
                {stats.level}
              </div>
            </div>
            <div>
              <h1
                className="text-3xl font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: 'var(--color-accent-gradient)' }}
              >
                {t('header.welcome', { name: user.name })}
              </h1>
              <p className="font-medium mt-1" style={{ color: 'var(--text-tertiary)' }}>
                {t('header.level', { level: stats.level })} ·{' '}
                {t('header.totalXP', { xp: stats.totalXP.toLocaleString(i18n.language) })}
              </p>
              {/* XP Progress Bar */}
              <div className="mt-3 w-64">
                <div className="flex justify-between items-center text-xs font-semibold mb-1">
                  <span style={{ color: 'var(--color-accent)' }}>
                    {t('header.xpProgress', { current: stats.currentXP })}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {t('header.xpNext', { next: stats.xpForNextLevel })}
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden shadow-inner"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out shadow-lg"
                    style={{
                      width: `${stats.progressPercentage}%`,
                      background: 'var(--color-accent-gradient)',
                    }}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {stats.xpNeeded > 0
                    ? t('header.xpToNextLevel', { xp: stats.xpNeeded, level: stats.level + 1 })
                    : t('header.levelUp')}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                // Smart redirect based on user's current state
                if (decks.length === 0) {
                  // No decks exist: redirect to deck creation
                  onChangeView('decks');
                } else if (activeSessions.length === 0) {
                  // Decks exist but no active sessions: redirect to My Decks to create session
                  onChangeView('decks');
                } else {
                  // Active sessions exist: show sessions page
                  onChangeView('sessions');
                }
              }}
              className="text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              style={{ background: 'var(--color-accent-gradient)' }}
            >
              <Brain size={20} />
              {t('buttons.startSession')}
            </button>
            <button
              onClick={() => onChangeView('leaderboard')}
              className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
              style={{
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                borderWidth: '1px',
                borderColor: 'var(--border-secondary)',
              }}
            >
              <Trophy size={20} className="text-yellow-500" />
              {t('buttons.leaderboard')}
            </button>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Streak Card */}
          <div className="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
            <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-10">
              <Flame size={120} />
            </div>
            <div className="relative z-10 flex flex-col">
              <div className="text-5xl font-bold mb-2">{stats.streak}</div>
              <div className="text-base font-bold mb-1">{t('stats.streak')}</div>
              <div className="text-sm opacity-90">
                {t('stats.streakRecord', { days: stats.longestStreak })}
              </div>
            </div>
          </div>

          {/* Sesiuni active */}
          <div
            className="p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden"
            style={{
              background: 'var(--dashboard-stat-bg)',
              borderWidth: '1px',
              borderColor: 'var(--border-secondary)',
            }}
          >
            <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-10">
              <BookOpen size={120} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div className="relative z-10 flex flex-col">
              <div className="text-5xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                {cardStats?.activeSessions !== undefined
                  ? cardStats.activeSessions
                  : activeSessions.length}
              </div>
              <div className="text-base font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>
                {t('stats.activeSessions')}
              </div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {cardStats?.totalDecks || stats.activeDecksCount} {t('stats.decksCreated')} |{' '}
                {cardStats?.inStudy || 0} {t('stats.cardsInStudy')}
              </div>
            </div>
          </div>

          {/* Success Rate */}
          <div
            className="p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden"
            style={{
              background: 'var(--dashboard-stat-bg)',
              borderWidth: '1px',
              borderColor: 'var(--border-secondary)',
            }}
          >
            <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-10">
              <TrendingUp size={120} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div className="relative z-10 flex flex-col">
              <div className="text-5xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                {stats.successRate}
              </div>
              <div className="text-base font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>
                {t('stats.successRate')}
              </div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {stats.totalCorrectAnswers} {t('stats.correct')} | {stats.totalAnswers}{' '}
                {t('stats.completed')}
              </div>
            </div>
          </div>

          {/* Time Spent */}
          <div
            className="p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden"
            style={{
              background: 'var(--dashboard-stat-bg)',
              borderWidth: '1px',
              borderColor: 'var(--border-secondary)',
            }}
          >
            <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-10">
              <Clock size={120} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div className="relative z-10 flex flex-col">
              <div className="text-5xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                {stats.totalTimeSpentFormatted}
              </div>
              <div className="text-base font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>
                {t('stats.totalStudyTime')}
              </div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {studyTimeStats.todayMinutes} {t('stats.minutes')} - {studyTimeStats.todayFormatted}{' '}
                | {studyTimeStats.weeklyMinutes} {t('stats.minutes')} - {studyTimeStats.weekRange}
              </div>
            </div>
          </div>
        </div>

        {/* Daily Challenges & Study Streak */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Challenges */}
          <div
            className="lg:col-span-2 p-6 rounded-2xl shadow-lg"
            style={{
              backgroundColor: 'var(--card-bg)',
              borderWidth: '1px',
              borderColor: 'var(--card-border)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Target style={{ color: 'var(--color-accent)' }} size={24} />
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {t('dailyChallenges.title')}
                </h2>
              </div>
              <Sparkles className="text-yellow-500" size={20} />
            </div>
            <div className="space-y-4">
              {dailyChallenges.map(challenge => {
                const ChallengeIcon = getIconComponent(challenge.icon);
                const progress = Math.min((challenge.progress / challenge.target) * 100, 100);
                const completed = challenge.progress >= challenge.target;
                return (
                  <div
                    key={challenge.id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      completed ? 'bg-green-50 border-green-200' : ''
                    }`}
                    style={
                      !completed
                        ? {
                            backgroundColor: 'var(--bg-secondary)',
                            borderColor: 'var(--border-secondary)',
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 bg-gradient-to-br ${challenge.color} rounded-lg`}>
                          <ChallengeIcon size={20} className="text-white" />
                        </div>
                        <div>
                          <h3
                            className="font-bold"
                            style={{ color: 'var(--text-primary)' }}
                            title={
                              challenge.descriptionKey
                                ? String(t(challenge.descriptionKey))
                                : undefined
                            }
                          >
                            {challenge.titleKey
                              ? String(t(challenge.titleKey, challenge.titleParams || {}))
                              : challenge.title}
                          </h3>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {challenge.progress}/{challenge.target} ·{' '}
                            {t('dailyChallenges.reward', { xp: challenge.reward })}
                          </p>
                        </div>
                      </div>
                      {completed && (
                        <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <Star size={12} fill="white" />
                          {t('dailyChallenges.complete')}
                        </div>
                      )}
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${challenge.color} transition-all duration-500`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Study Streak Calendar */}
          <div
            className="p-6 rounded-2xl shadow-lg"
            style={{
              backgroundColor: 'var(--card-bg)',
              borderWidth: '1px',
              borderColor: 'var(--card-border)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Flame className="text-orange-500" size={20} />
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {t('activityCalendar.title')}
              </h2>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {activityCalendar.map((day, idx) => {
                const intensityColors = [
                  'bg-gray-100',
                  'bg-green-200',
                  'bg-green-400',
                  'bg-green-600',
                ];
                const tooltipText = day.studied
                  ? `${day.date}\n${t('activityCalendar.cardsLearned', { cards: day.cardsLearned })}\n${t('activityCalendar.timeSpent', { minutes: day.timeSpent })}`
                  : day.date;
                return (
                  <div
                    key={idx}
                    className={`aspect-square rounded-md ${intensityColors[day.intensity]} transition-all hover:scale-110 cursor-pointer`}
                    title={tooltipText}
                  />
                );
              })}
            </div>
            <div
              className="flex items-center justify-between mt-4 text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              <span>{t('activityCalendar.less')}</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-sm ${['bg-gray-100', 'bg-green-200', 'bg-green-400', 'bg-green-600'][i]}`}
                  />
                ))}
              </div>
              <span>{t('activityCalendar.more')}</span>
            </div>
          </div>
        </div>

        {/* Continue Learning - Active Sessions Preview */}
        <div
          className="p-6 rounded-2xl shadow-lg"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderWidth: '1px',
            borderColor: 'var(--card-border)',
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {t('continueLearning.title')}
            </h2>
            {activeSessions.length > 3 && (
              <button
                onClick={() => onChangeView('sessions')}
                className="font-semibold text-sm flex items-center gap-1"
                style={{ color: 'var(--color-accent)' }}
              >
                {t('buttons.viewAll')}
                <ChevronRight size={16} />
              </button>
            )}
          </div>

          {activeSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeSessions.slice(0, 3).map(session => {
                const progress = session.currentCardIndex
                  ? Math.round((session.currentCardIndex / (session.totalCards || 1)) * 100)
                  : 0;
                const cardsRemaining = (session.totalCards || 0) - (session.currentCardIndex || 0);

                return (
                  <div
                    key={session.id}
                    className="group p-5 rounded-xl border-2 hover:shadow-lg transition-all cursor-pointer"
                    style={{
                      borderColor: 'var(--border-secondary)',
                      backgroundColor: 'var(--bg-surface)',
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3
                          className="font-bold transition-colors mb-1"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {session.deck?.title || t('continueLearning.activeSession')}
                        </h3>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {t('continueLearning.cardsRemaining', { cards: cardsRemaining })} |{' '}
                          {t('continueLearning.percentComplete', { percent: progress })}
                        </p>
                      </div>
                      <div className="relative w-14 h-14">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            stroke="var(--bg-tertiary)"
                            strokeWidth="4"
                            fill="transparent"
                          />
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            stroke="var(--color-accent)"
                            strokeWidth="4"
                            fill="transparent"
                            strokeDasharray={150.8}
                            strokeDashoffset={150.8 - (150.8 * progress) / 100}
                            className="transition-all duration-1000"
                          />
                        </svg>
                        <span
                          className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          {progress}%
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (onResumeSession) {
                          onResumeSession(session.id);
                        } else {
                          onChangeView('sessions');
                        }
                      }}
                      className="w-full mt-3 text-white py-2 px-4 rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      style={{ background: 'var(--color-accent-gradient)' }}
                    >
                      <Brain size={16} />
                      {t('buttons.continueSession')}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="text-center py-12 rounded-xl border-2 border-dashed"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-secondary)',
              }}
            >
              <Brain size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                {t('continueLearning.noActiveSessions')}
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                {t('continueLearning.noActiveSessionsDescription')}
              </p>
              <button
                onClick={() => onChangeView('decks')}
                className="text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
                style={{ background: 'var(--color-accent-gradient)' }}
              >
                <Brain size={20} />
                {t('buttons.startSession')}
              </button>
            </div>
          )}
        </div>

        {/* Study Recommendations & Achievements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Study Recommendations */}
          <div
            className="p-6 rounded-2xl shadow-xl text-white"
            style={{ background: 'var(--color-accent-gradient)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap size={24} />
              <h2 className="text-xl font-bold">{t('recommendations.title')}</h2>
            </div>
            <div className="space-y-3">
              {decksNeedingReview.length > 0 ? (
                decksNeedingReview.map(deck => (
                  <div
                    key={deck.id}
                    className="bg-white/10 backdrop-blur-sm p-4 rounded-xl hover:bg-white/20 transition-all cursor-pointer group"
                    onClick={() => onStartSession(deck)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-white group-hover:text-yellow-300 transition-colors">
                          {deck.title}
                        </h3>
                        <p className="text-sm text-white/80 mt-1">
                          {t('recommendations.cards', { total: deck.totalCards })} |{' '}
                          {t('recommendations.inStudy', {
                            count: deck.totalCards - deck.masteredCards,
                          })}{' '}
                          | {t('recommendations.mastered', { count: deck.masteredCards })}
                        </p>
                      </div>
                      <ChevronRight className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-white/80">
                  <Brain size={32} className="mx-auto mb-2 opacity-60" />
                  <p className="text-sm">{t('recommendations.allUpToDate')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Achievements */}
          <div
            className="p-6 rounded-2xl shadow-lg"
            style={{
              backgroundColor: 'var(--card-bg)',
              borderWidth: '1px',
              borderColor: 'var(--card-border)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Award className="text-yellow-500" size={24} />
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {t('recentAchievements.title')}
              </h2>
            </div>
            <div className="space-y-3">
              {recentAchievements.length > 0 ? (
                recentAchievements.map((achievement, idx) => (
                  <div
                    key={idx}
                    className={`${achievement.color} p-4 rounded-xl flex items-center gap-3 hover:scale-105 transition-transform cursor-pointer`}
                  >
                    <div className="text-3xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                        {achievement.title}
                      </h3>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {t('recentAchievements.unlockedRecently')}
                      </p>
                    </div>
                    <Star className="text-yellow-500" size={20} fill="#EAB308" />
                  </div>
                ))
              ) : (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  <Trophy size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t('recentAchievements.startStudying')}</p>
                </div>
              )}
              <button
                onClick={() => onChangeView('achievements')}
                className="w-full mt-4 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                {t('buttons.viewAllAchievements')}
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
