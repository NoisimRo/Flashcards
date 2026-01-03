import React, { useMemo } from 'react';
import { User, Deck } from '../types';
import { Flame, Clock, Brain, TrendingUp, BookOpen, Trophy } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DashboardProps {
  user: User;
  decks: Deck[];
  onStartSession: (deck: Deck) => void;
  onChangeView: (view: string) => void;
}

const StatCard = ({ label, value, subtext, icon: Icon, iconColor }: any) => (
  <div className="bg-[#F8F6F1] p-6 rounded-2xl">
    <div className="flex justify-between items-start mb-4">
      <div>
        <h3 className="text-gray-500 text-sm font-medium mb-1">{label}</h3>
        <div className="text-3xl font-bold text-gray-900">{value}</div>
      </div>
      {Icon && <Icon className={`w-6 h-6 ${iconColor}`} />}
    </div>
    <p className="text-xs text-gray-400 font-medium">{subtext}</p>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ user, decks, onStartSession, onChangeView }) => {
  // Calculate stats from real data
  const stats = useMemo(() => {
    // Calculate mastered cards across all decks
    const totalMastered = decks.reduce((sum, deck) => sum + deck.masteredCards, 0);
    const totalCards = decks.reduce((sum, deck) => sum + deck.totalCards, 0);

    // Calculate success rate
    const successRate = totalCards > 0 ? Math.round((totalMastered / totalCards) * 100) : 0;

    // Format time spent
    const hours = (user.totalTimeSpent / 60).toFixed(1);

    // Calculate active vs completed decks
    const activeDecks = decks.filter(d => d.masteredCards < d.totalCards && d.totalCards > 0);
    const completedDecks = decks.filter(d => d.masteredCards === d.totalCards && d.totalCards > 0);

    return {
      totalCardsLearned: user.totalCardsLearned || totalMastered,
      totalTimeSpentFormatted: `${hours}h`,
      successRate: `${successRate}%`,
      streak: user.streak,
      longestStreak: user.longestStreak,
      totalXP: user.totalXP,
      level: user.level,
      totalDecksCompleted: user.totalDecksCompleted || completedDecks.length,
      activeDecksCount: activeDecks.length,
      completedDecksCount: completedDecks.length,
    };
  }, [user, decks]);

  // Generate weekly data from decks (simplified - could be enhanced with API data)
  const weeklyData = useMemo(() => {
    const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const today = new Date().getDay();

    // Create empty data structure for the week
    return days.map((name, idx) => {
      // Simple distribution of user's total activity across the week
      const isToday = idx === (today === 0 ? 6 : today - 1);
      const baseCards = Math.floor(user.totalCardsLearned / 7);
      const baseTime = Math.floor(user.totalTimeSpent / 7);

      return {
        name,
        cards: isToday ? baseCards + Math.floor(Math.random() * 10) : baseCards,
        time: isToday ? baseTime + Math.floor(Math.random() * 15) : baseTime,
      };
    });
  }, [user.totalCardsLearned, user.totalTimeSpent]);

  // Get recent decks studied (for Recent Activity section)
  const recentDecks = useMemo(() => {
    return decks
      .filter(d => d.lastStudied)
      .sort((a, b) => new Date(b.lastStudied!).getTime() - new Date(a.lastStudied!).getTime())
      .slice(0, 2);
  }, [decks]);

  // Get active decks for Active Decks section (sorted by recent activity or progress)
  const activeDecksDisplay = useMemo(() => {
    return decks
      .filter(d => d.totalCards > 0 && d.masteredCards < d.totalCards) // Only active (not completed) decks
      .sort((a, b) => {
        // Sort by lastStudied if available, otherwise by progress
        if (a.lastStudied && b.lastStudied) {
          return new Date(b.lastStudied).getTime() - new Date(a.lastStudied).getTime();
        }
        if (a.lastStudied) return -1;
        if (b.lastStudied) return 1;
        // Fall back to progress percentage
        const aProgress = (a.masteredCards / a.totalCards) * 100;
        const bProgress = (b.masteredCards / b.totalCards) * 100;
        return bProgress - aProgress;
      })
      .slice(0, 3);
  }, [decks]);

  return (
    <div className="p-6 md:p-8 space-y-8 h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">
            Bine ai revenit, {user.name}! Nivel {stats.level} · {stats.totalXP} XP total
          </p>
        </div>
        <button
          onClick={() => onChangeView('sessions')}
          className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-lg"
        >
          <Brain size={20} />
          Începe Sesiune
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Carduri Învățate"
          value={stats.totalCardsLearned}
          icon={BookOpen}
          iconColor="text-indigo-500"
          subtext={`${stats.activeDecksCount} active | ${stats.completedDecksCount} finalizate`}
        />
        <StatCard
          label="Timp Petrecut"
          value={stats.totalTimeSpentFormatted}
          icon={Clock}
          iconColor="text-blue-500"
          subtext="timp total de studiu"
        />
        <StatCard
          label="Rata de Succes"
          value={stats.successRate}
          icon={TrendingUp}
          iconColor="text-green-500"
          subtext="carduri stăpânite"
        />
        <StatCard
          label="Streak Curent"
          value={stats.streak}
          icon={Flame}
          iconColor="text-orange-500"
          subtext={`Record: ${stats.longestStreak} zile`}
        />
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-[#F8F6F1] p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Progres Săptămânal</h2>
          <div className="h-64 w-full">
            {user.totalCardsLearned > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="colorCards" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EA580C" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#EA580C" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E0D5" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF' }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFF',
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cards"
                    name="Carduri"
                    stroke="#EA580C"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorCards)"
                  />
                  <Area
                    type="monotone"
                    dataKey="time"
                    name="Minute"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorTime)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <TrendingUp size={48} className="mb-4 opacity-50" />
                <p className="font-medium">Încă nu ai activitate</p>
                <p className="text-sm">Începe să studiezi pentru a vedea progresul</p>
              </div>
            )}
          </div>
        </div>

        {/* Active Decks Section */}
        <div className="bg-[#F8F6F1] p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Deck-uri Active</h2>
          <div className="space-y-4">
            {activeDecksDisplay.length > 0 ? (
              activeDecksDisplay.map(deck => {
                const percentage =
                  deck.totalCards > 0
                    ? Math.round((deck.masteredCards / deck.totalCards) * 100)
                    : 0;
                const remaining = deck.totalCards - deck.masteredCards;
                return (
                  <div
                    key={deck.id}
                    className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => onStartSession(deck)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{deck.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {deck.masteredCards}/{deck.totalCards} carduri • {remaining} rămase
                        </p>
                      </div>
                      {/* Circular Progress */}
                      <div className="relative w-12 h-12 flex-shrink-0 ml-3">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke="#F3F4F6"
                            strokeWidth="4"
                            fill="transparent"
                          />
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke={
                              percentage > 66 ? '#22C55E' : percentage > 33 ? '#F59E0B' : '#3B82F6'
                            }
                            strokeWidth="4"
                            fill="transparent"
                            strokeDasharray={126}
                            strokeDashoffset={126 - (126 * percentage) / 100}
                            className="transition-all duration-1000 ease-out"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                    {deck.lastStudied && (
                      <p className="text-xs text-green-600 font-medium">
                        Studiat: {getTimeAgo(deck.lastStudied)}
                      </p>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-400">
                <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Niciun deck activ</p>
                <p className="text-xs mt-1">Creează un deck nou pentru a începe</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[#F8F6F1] p-6 rounded-2xl">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Activitate Recentă</h2>
        <div className="space-y-4">
          {recentDecks.length > 0 ? (
            recentDecks.map(deck => {
              const timeAgo = getTimeAgo(deck.lastStudied!);
              return (
                <div
                  key={deck.id}
                  className="flex items-center justify-between bg-white p-4 rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                      Studiat
                    </span>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{deck.title}</p>
                      <p className="text-xs text-gray-500">
                        {deck.masteredCards}/{deck.totalCards} carduri · {timeAgo}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-green-600">+{deck.masteredCards * 10} XP</span>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Trophy size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nicio activitate recentă</p>
              <p className="text-xs mt-1">Începe să studiezi pentru a vedea istoricul</p>
            </div>
          )}

          {/* Show streak achievement if applicable */}
          {stats.streak >= 3 && (
            <div className="flex items-center justify-between bg-white p-4 rounded-xl">
              <div className="flex items-center gap-4">
                <span className="bg-gray-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Realizare
                </span>
                <div>
                  <p className="font-bold text-sm text-gray-900">
                    🔥 Streak de {stats.streak} zile!
                  </p>
                  <p className="text-xs text-gray-500">Continuă tot așa!</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
