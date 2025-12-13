import React from 'react';
import { LeaderboardEntry } from '../types';
import { Trophy, Flame, Medal } from 'lucide-react';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

const Leaderboard: React.FC<LeaderboardProps> = ({ entries }) => {
  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto">
      <h1 className="text-3xl font-bold text-gray-900">Clasament Global</h1>
      <p className="text-gray-500 mb-8">Compară-te cu ceilalți și urcă în top</p>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#F8F6F1] p-6 rounded-2xl flex flex-col items-center justify-center text-center">
           <h3 className="text-gray-500 mb-2">Poziția Ta</h3>
           <div className="text-4xl font-bold text-gray-900">#247</div>
           <p className="text-xs text-gray-400 mt-1">din 1,842 utilizatori</p>
        </div>
        <div className="bg-[#F8F6F1] p-6 rounded-2xl flex flex-col items-center justify-center text-center">
           <h3 className="text-gray-500 mb-2">XP Săptămânal</h3>
           <div className="text-4xl font-bold text-gray-900">845</div>
           <p className="text-xs text-green-500 font-bold mt-1">↗ +12%</p>
        </div>
        <div className="bg-[#F8F6F1] p-6 rounded-2xl flex flex-col items-center justify-center text-center">
           <h3 className="text-gray-500 mb-2">Până la Top 100</h3>
           <div className="text-4xl font-bold text-gray-900">1,230</div>
           <p className="text-xs text-gray-400 mt-1">XP necesare</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b bg-gray-50 text-gray-500 font-bold text-sm">
           <div className="col-span-2 md:col-span-1 text-center">Poziție</div>
           <div className="col-span-6 md:col-span-5">Utilizator</div>
           <div className="col-span-2 text-center hidden md:block">Nivel</div>
           <div className="col-span-2 text-center">XP Total</div>
           <div className="col-span-2 text-center hidden md:block">Streak</div>
        </div>

        {entries.map((entry) => (
          <div 
            key={entry.id}
            className={`grid grid-cols-12 gap-4 p-4 items-center border-b last:border-0 hover:bg-gray-50 transition-colors
              ${entry.isCurrentUser ? 'bg-[#FDFBF7] border-l-4 border-l-gray-900' : ''}
            `}
          >
             <div className="col-span-2 md:col-span-1 flex justify-center">
               {entry.position === 1 && <Medal className="text-yellow-400 fill-yellow-400" />}
               {entry.position === 2 && <Medal className="text-gray-400 fill-gray-400" />}
               {entry.position === 3 && <Medal className="text-orange-400 fill-orange-400" />}
               {entry.position > 3 && <span className="font-bold text-gray-500">{entry.position}</span>}
             </div>
             
             <div className="col-span-6 md:col-span-5 flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-700">
                 {entry.name.split(' ').map(n=>n[0]).join('')}
               </div>
               <div>
                 <p className={`font-bold ${entry.isCurrentUser ? 'text-gray-900' : 'text-gray-700'}`}>
                   {entry.name} {entry.isCurrentUser && '(Tu)'}
                 </p>
               </div>
             </div>

             <div className="col-span-2 text-center hidden md:block">
               <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                 entry.position <= 3 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
               }`}>
                 Nivel {entry.level}
               </span>
             </div>

             <div className="col-span-2 text-center font-bold text-gray-900">
               {entry.xpTotal.toLocaleString()}
             </div>

             <div className="col-span-2 text-center hidden md:flex items-center justify-center gap-1 text-orange-500 font-bold">
               <Flame size={16} fill="currentColor" /> {entry.streak}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;