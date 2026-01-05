import React, { useMemo, useEffect, useState } from 'react';
import { User, Deck } from '../types';
import {
  getTodaysChallenges,
  DailyChallenge,
  getActivityCalendar,
  ActivityDay,
} from '../src/api/dailyChallenges';
import { getAchievements, Achievement } from '../src/api/achievements';
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
}

const Dashboard: React.FC<DashboardProps> = ({ user, decks, onStartSession, onChangeView }) => {
  // State for daily challenges
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallenge[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(true);

  // State for activity calendar
  const [activityCalendar, setActivityCalendar] = useState<ActivityDay[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);

  // State for achievements
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState(true);

  // Fetch daily challenges, activity calendar, and achievements on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [challengesResponse, calendarResponse, achievementsResponse] = await Promise.all([
          getTodaysChallenges(),
          getActivityCalendar(),
          getAchievements(),
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
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setDailyChallenges([]);
        setActivityCalendar([]);
        setAchievements([]);
      } finally {
        setChallengesLoading(false);
        setCalendarLoading(false);
        setAchievementsLoading(false);
      }
    };

    fetchData();
  }, []);

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

    // Calculate XP progress to next level
    const xpForNextLevel = calculateXPForLevel(user.level + 1);
    const xpProgress = user.currentXP;
    const xpNeeded = xpForNextLevel - user.totalXP;
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

  // Radial chart data for XP progress
  const radialData = [
    {
      name: 'XP',
      value: stats.progressPercentage,
      fill: '#8b5cf6',
    },
  ];

  return (
    <div className="min-h-screen h-screen overflow-y-auto bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          {/* User Info with Level Badge */}
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                <Crown size={10} />
                {stats.level}
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Bine ai revenit, {user.name}!
              </h1>
              <p className="text-gray-600 font-medium mt-1">
                Nivel {stats.level} · {stats.totalXP.toLocaleString()} XP total
              </p>
              {/* XP Progress Bar */}
              <div className="mt-3 w-64">
                <div className="flex justify-between items-center text-xs font-semibold mb-1">
                  <span className="text-purple-600">{stats.currentXP} XP</span>
                  <span className="text-gray-400">{stats.xpForNextLevel} XP</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 rounded-full transition-all duration-1000 ease-out shadow-lg"
                    style={{ width: `${stats.progressPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.xpNeeded > 0
                    ? `${stats.xpNeeded} XP până la nivelul ${stats.level + 1}`
                    : 'Level up!'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => onChangeView('sessions')}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Brain size={20} />
              Începe Sesiune
            </button>
            <button
              onClick={() => onChangeView('leaderboard')}
              className="bg-white hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-md hover:shadow-lg border border-gray-200"
            >
              <Trophy size={20} className="text-yellow-500" />
              Clasament
            </button>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Streak Card */}
          <div className="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-10">
              <Flame size={120} />
            </div>
            <div className="relative z-10">
              <Flame size={24} className="mb-2" />
              <div className="text-4xl font-bold mb-1">{stats.streak}</div>
              <div className="text-sm opacity-90 font-medium">Zile consecutive</div>
              <div className="text-xs opacity-75 mt-2">Record: {stats.longestStreak} zile</div>
            </div>
          </div>

          {/* Cards Learned */}
          <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <BookOpen size={24} className="text-blue-600" />
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">{stats.totalCardsLearned}</div>
                <div className="text-sm text-gray-500 font-medium">Carduri în Studiu</div>
              </div>
            </div>
            <div className="text-xs text-gray-400 font-medium">
              {stats.activeDecksCount} active · {stats.completedDecksCount} finalizate
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <TrendingUp size={24} className="text-green-600" />
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">{stats.successRate}</div>
                <div className="text-sm text-gray-500 font-medium">Rată de Succes</div>
              </div>
            </div>
            <div className="text-xs text-gray-400 font-medium">
              {stats.totalCorrectAnswers} răspunse corect | {stats.totalAnswers} parcurse
            </div>
          </div>

          {/* Time Spent */}
          <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Clock size={24} className="text-purple-600" />
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">
                  {stats.totalTimeSpentFormatted}
                </div>
                <div className="text-sm text-gray-500 font-medium">Timp Petrecut</div>
              </div>
            </div>
            <div className="text-xs text-gray-400 font-medium">Timp total de studiu</div>
          </div>
        </div>

        {/* Daily Challenges & Study Streak */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Challenges */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Target className="text-indigo-600" size={24} />
                <h2 className="text-xl font-bold text-gray-900">Provocări Zilnice</h2>
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
                      completed
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 bg-gradient-to-br ${challenge.color} rounded-lg`}>
                          <ChallengeIcon size={20} className="text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{challenge.title}</h3>
                          <p className="text-xs text-gray-500">
                            {challenge.progress}/{challenge.target} · +{challenge.reward} XP
                          </p>
                        </div>
                      </div>
                      {completed && (
                        <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <Star size={12} fill="white" />
                          Complet
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
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="text-orange-500" size={20} />
              <h2 className="text-lg font-bold text-gray-900">Activitate (28 zile)</h2>
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
                  ? `${day.date}\n${day.cardsLearned} carduri în studiu\n${day.timeSpent} min studiate`
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
            <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
              <span>Mai puțin</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-sm ${['bg-gray-100', 'bg-green-200', 'bg-green-400', 'bg-green-600'][i]}`}
                  />
                ))}
              </div>
              <span>Mai mult</span>
            </div>
          </div>
        </div>

        {/* Study Recommendations & Achievements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Study Recommendations */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-xl text-white">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={24} />
              <h2 className="text-xl font-bold">Recomandări de Studiu</h2>
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
                          {deck.totalCards} carduri | {deck.totalCards - deck.masteredCards} în
                          studiu | {deck.masteredCards} învățate
                        </p>
                      </div>
                      <ChevronRight className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-white/80">
                  <Brain size={32} className="mx-auto mb-2 opacity-60" />
                  <p className="text-sm">Toate deck-urile sunt la zi!</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Achievements */}
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Award className="text-yellow-500" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Realizări Recente</h2>
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
                      <h3 className="font-bold text-gray-900">{achievement.title}</h3>
                      <p className="text-xs text-gray-600">Deblocat recent</p>
                    </div>
                    <Star className="text-yellow-500" size={20} fill="#EAB308" />
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Trophy size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Începe să studiezi pentru realizări!</p>
                </div>
              )}
              <button
                onClick={() => onChangeView('achievements')}
                className="w-full mt-4 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                Vezi Toate Realizările
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Continue Learning Section */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Continuă Învățarea</h2>
            <button
              onClick={() => onChangeView('decks')}
              className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm flex items-center gap-1"
            >
              Vezi Tot
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.slice(0, 3).map(deck => {
              const percentage =
                deck.totalCards > 0 ? Math.round((deck.masteredCards / deck.totalCards) * 100) : 0;
              return (
                <div
                  key={deck.id}
                  className="group p-5 rounded-xl border-2 border-gray-200 hover:border-indigo-400 hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-white to-gray-50"
                  onClick={() => onStartSession(deck)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors mb-1">
                        {deck.title}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {deck.totalCards} carduri | {deck.totalCards - deck.masteredCards} în studiu
                        | {deck.masteredCards} învățate
                      </p>
                    </div>
                    <div className="relative w-14 h-14">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="28"
                          cy="28"
                          r="24"
                          stroke="#E5E7EB"
                          strokeWidth="4"
                          fill="transparent"
                        />
                        <circle
                          cx="28"
                          cy="28"
                          r="24"
                          stroke={
                            percentage > 66 ? '#22C55E' : percentage > 33 ? '#F59E0B' : '#6366F1'
                          }
                          strokeWidth="4"
                          fill="transparent"
                          strokeDasharray={150.8}
                          strokeDashoffset={150.8 - (150.8 * percentage) / 100}
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                  {deck.lastStudied && (
                    <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Studiat: {getTimeAgo(deck.lastStudied)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to calculate XP needed for a level
function calculateXPForLevel(level: number): number {
  // Base XP for level 1 is 100, increases by 20% per level
  const baseXP = 100;
  let totalXP = 0;
  for (let i = 1; i < level; i++) {
    totalXP += Math.floor(baseXP * Math.pow(1.2, i - 1));
  }
  return totalXP + Math.floor(baseXP * Math.pow(1.2, level - 1));
}

// Helper function to format time ago
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Acum';
  if (diffMins < 60) return `Acum ${diffMins} min`;
  if (diffHours < 24) return `Acum ${diffHours} ore`;
  if (diffDays === 1) return 'Ieri';
  if (diffDays < 7) return `Acum ${diffDays} zile`;
  return date.toLocaleDateString('ro-RO');
}

export default Dashboard;
