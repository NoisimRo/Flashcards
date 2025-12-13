import React from 'react';
import { User, Deck } from '../types';
import { Flame, Clock, Brain, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { WEEKLY_DATA } from '../constants';

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
  return (
    <div className="p-6 md:p-8 space-y-8 h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Bine ai revenit! Hai să continuăm învățarea.</p>
        </div>
        <button 
          onClick={() => onChangeView('study')}
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
          value={user.cardsLearnedThisWeek} 
          subtext="↗ +23 săptămâna aceasta" 
        />
        <StatCard 
          label="Timp Petrecut" 
          value={`${(user.totalTimeSpent / 60).toFixed(1)}h`} 
          subtext="în această săptămână" 
        />
        <StatCard 
          label="Rata de Succes" 
          value="87%" 
          subtext="↗ +5% față de luna trecută" 
        />
        <StatCard 
          label="Streak Curent" 
          value={user.streak} 
          icon={Flame} 
          iconColor="text-orange-500"
          subtext="Record personal: 18 zile" 
        />
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-[#F8F6F1] p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Progres Săptămânal</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={WEEKLY_DATA}>
                <defs>
                  <linearGradient id="colorCards" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EA580C" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#EA580C" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E0D5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFF', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Area type="monotone" dataKey="cards" stroke="#EA580C" strokeWidth={3} fillOpacity={1} fill="url(#colorCards)" />
                <Area type="monotone" dataKey="time" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorTime)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Decks Section */}
        <div className="bg-[#F8F6F1] p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Deck-uri Active</h2>
          <div className="space-y-4">
            {decks.slice(0, 3).map(deck => {
              const percentage = Math.round((deck.masteredCards / deck.totalCards) * 100) || 0;
              return (
                <div 
                  key={deck.id} 
                  className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer flex justify-between items-center"
                  onClick={() => onStartSession(deck)}
                >
                  <div>
                    <h3 className="font-bold text-gray-900">{deck.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{deck.totalCards} carduri</p>
                  </div>
                  
                  {/* Circular Progress (Simple CSS implementation) */}
                  <div className="relative w-12 h-12">
                     <svg className="w-full h-full transform -rotate-90">
                       <circle cx="24" cy="24" r="20" stroke="#F3F4F6" strokeWidth="4" fill="transparent" />
                       <circle 
                        cx="24" cy="24" r="20" 
                        stroke="#1F2937" 
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
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[#F8F6F1] p-6 rounded-2xl">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Activitate Recentă</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl">
             <div className="flex items-center gap-4">
                <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">Completat</span>
                <div>
                  <p className="font-bold text-sm text-gray-900">Sesiune Limba Română - Sinonime</p>
                  <p className="text-xs text-gray-500">20 carduri · 15 min · Acum 2 ore</p>
                </div>
             </div>
             <span className="font-bold text-green-600">+120 XP</span>
          </div>
          <div className="flex items-center justify-between bg-white p-4 rounded-xl">
             <div className="flex items-center gap-4">
                <span className="bg-gray-900 text-white text-xs font-bold px-3 py-1 rounded-full">Realizare</span>
                <div>
                  <p className="font-bold text-sm text-gray-900">🏆 Streak Master - 10 zile consecutive</p>
                  <p className="text-xs text-gray-500">Acum 1 zi</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;