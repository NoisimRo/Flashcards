import React from 'react';
import { Deck } from '../types';
import { BookOpen, Play, Clock, Trophy } from 'lucide-react';

interface StudyNowProps {
  decks: Deck[];
  onStartSession: (deck: Deck) => void;
}

const StudyNow: React.FC<StudyNowProps> = ({ decks, onStartSession }) => {
  // Filter decks that have cards (using totalCards from API)
  const studyableDecks = decks.filter(d => (d.totalCards || 0) > 0);

  return (
    <div className="p-6 md:p-8 space-y-8 h-full overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Studiază Acum</h1>
        <p className="text-gray-500 mt-2">Alege un deck și începe să înveți chiar acum</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#F8F6F1] p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <BookOpen className="text-indigo-600" size={24} />
            <div>
              <p className="text-2xl font-bold text-gray-900">{studyableDecks.length}</p>
              <p className="text-xs text-gray-500">Deck-uri disponibile</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F8F6F1] p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <Clock className="text-blue-600" size={24} />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {decks.reduce((sum, d) => sum + d.totalCards, 0)}
              </p>
              <p className="text-xs text-gray-500">Total carduri</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F8F6F1] p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <Trophy className="text-green-600" size={24} />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {decks.reduce((sum, d) => sum + d.masteredCards, 0)}
              </p>
              <p className="text-xs text-gray-500">Carduri învățate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Decks List */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Deck-uri Active</h2>

        {studyableDecks.length === 0 ? (
          <div className="bg-[#F8F6F1] rounded-2xl p-12 text-center">
            <BookOpen className="mx-auto mb-4 text-gray-300" size={48} />
            <h3 className="text-lg font-bold text-gray-600 mb-2">Niciun deck disponibil</h3>
            <p className="text-gray-500 text-sm">
              Creează un deck nou sau generează carduri pentru deck-urile existente
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {studyableDecks.map(deck => {
              const progress =
                deck.totalCards > 0 ? Math.round((deck.masteredCards / deck.totalCards) * 100) : 0;
              const remaining = deck.totalCards - deck.masteredCards;

              return (
                <div
                  key={deck.id}
                  className="bg-white border-2 border-gray-100 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-lg transition-all group"
                >
                  {/* Deck Header */}
                  <div className="mb-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white mb-3 ${
                        deck.subject === 'Matematică'
                          ? 'bg-blue-500'
                          : deck.subject === 'Istorie'
                            ? 'bg-orange-500'
                            : 'bg-gray-900'
                      }`}
                    >
                      {deck.subject}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{deck.title}</h3>
                    <p className="text-sm text-gray-500">Nivel {deck.difficulty}</p>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-600 mb-2">
                      <span>{deck.masteredCards} învățate</span>
                      <span>{remaining} rămase</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          progress > 66
                            ? 'bg-green-500'
                            : progress > 33
                              ? 'bg-yellow-500'
                              : 'bg-blue-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-center">{progress}% completat</p>
                  </div>

                  {/* Study Button */}
                  <button
                    onClick={() => onStartSession(deck)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 group-hover:bg-indigo-700"
                  >
                    <Play size={18} fill="currentColor" />
                    <span>Studiază Acum</span>
                  </button>

                  {/* Last Studied */}
                  {deck.lastStudied && (
                    <p className="text-xs text-gray-400 text-center mt-3">
                      Ultima sesiune: {new Date(deck.lastStudied).toLocaleDateString('ro-RO')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyNow;
