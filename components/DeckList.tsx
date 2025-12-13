import React, { useState } from 'react';
import { Deck, Difficulty } from '../types';
import { Plus, MoreVertical, Upload, Sparkles, Loader2, Trash2, Play, Edit, RotateCcw, ArrowRight } from 'lucide-react';
import { generateDeckWithAI } from '../services/geminiService';

interface DeckListProps {
  decks: Deck[];
  onAddDeck: (deck: Deck) => void;
  onEditDeck: (deck: Deck) => void;
  onDeleteDeck: (deckId: string) => void;
  onStartSession: (deck: Deck) => void;
  onResetDeck?: (deckId: string) => void;
}

const DeckList: React.FC<DeckListProps> = ({ decks, onAddDeck, onEditDeck, onDeleteDeck, onStartSession, onResetDeck }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // Form State
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Limba Română');
  const [difficulty, setDifficulty] = useState<Difficulty>('A2');
  const [importMode, setImportMode] = useState<'manual' | 'ai' | 'file'>('ai');

  const openCreateModal = () => {
    setEditingDeckId(null);
    setTitle('');
    setSubject('Limba Română');
    setDifficulty('A2');
    setImportMode('ai');
    setIsModalOpen(true);
  };

  const openEditModal = (deck: Deck) => {
    setEditingDeckId(deck.id);
    setTitle(deck.title);
    setSubject(deck.subject);
    setDifficulty(deck.difficulty);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    if (editingDeckId) {
      // EDIT MODE
      const existingDeck = decks.find(d => d.id === editingDeckId);
      if (existingDeck) {
        const updatedDeck: Deck = {
          ...existingDeck,
          title,
          subject,
          difficulty,
        };
        onEditDeck(updatedDeck);
      }
    } else {
      // CREATE MODE
      let newCards: any[] = [];
      if (importMode === 'ai') {
        try {
          newCards = await generateDeckWithAI(subject, title, difficulty);
        } catch (err) {
          alert("Eroare la generarea AI. Verifică consola.");
          setIsGenerating(false);
          return;
        }
      }
      
      const newDeck: Deck = {
        id: `d-${Date.now()}`,
        title,
        subject,
        topic: title, // Simplified
        difficulty,
        cards: newCards,
        totalCards: newCards.length,
        masteredCards: 0
      };
      onAddDeck(newDeck);
    }

    setIsGenerating(false);
    setIsModalOpen(false);
    setTitle('');
  };

  const toggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  // Close menus when clicking outside
  React.useEffect(() => {
    const closeMenu = () => setActiveMenuId(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-8 h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-gray-900">Deck-urile Mele</h1>
           <p className="text-gray-500">Gestionează și organizează colecțiile tale de flashcard-uri</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg transition-all hover:-translate-y-1"
        >
          <Plus size={20} /> Deck Nou
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
        {/* Create Card (Visual Placeholder) */}
        <div 
          onClick={openCreateModal}
          className="border-2 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center p-8 cursor-pointer hover:border-gray-900 hover:bg-gray-50 transition-all group min-h-[200px]"
        >
           <div className="w-16 h-16 bg-[#F8F6F1] rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
             <Plus className="text-gray-400 group-hover:text-gray-900" size={32} />
           </div>
           <h3 className="font-bold text-gray-900 text-lg">Creează un deck nou</h3>
           <p className="text-center text-gray-500 text-sm mt-2">Importă din CSV/TXT sau generează cu AI</p>
        </div>

        {/* Deck Cards */}
        {decks.map((deck) => {
          const percentage = deck.totalCards > 0 ? Math.round((deck.masteredCards / deck.totalCards) * 100) : 0;
          const hasProgress = percentage > 0 || (deck.sessionData && Object.keys(deck.sessionData.answers).length > 0);

          return (
            <div key={deck.id} className="bg-[#F8F6F1] p-6 rounded-3xl relative group hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm
                  ${deck.subject === 'Matematică' ? 'bg-blue-500' : 
                    deck.subject === 'Istorie' ? 'bg-orange-500' : 'bg-gray-900'}`
                }>
                  {deck.subject}
                </span>
                
                <div className="relative">
                  <button 
                    onClick={(e) => toggleMenu(e, deck.id)}
                    className="p-1 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <MoreVertical size={18} />
                  </button>
                  
                  {activeMenuId === deck.id && (
                    <div className="absolute right-0 top-8 bg-white shadow-xl rounded-xl p-2 min-w-[140px] z-10 border border-gray-100 animate-fade-in">
                       <button 
                        onClick={() => openEditModal(deck)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2 font-medium"
                       >
                         <Edit size={16} /> Editează
                       </button>
                       <button 
                        onClick={() => onDeleteDeck(deck.id)}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 font-medium"
                       >
                         <Trash2 size={16} /> Șterge
                       </button>
                    </div>
                  )}
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-1 truncate">{deck.title}</h3>
              <p className="text-sm text-gray-500 mb-6 font-medium">Nivel {deck.difficulty}</p>

              <div className="flex gap-2 mb-4">
                 <span className="bg-white border border-gray-200 px-3 py-1 rounded-full text-xs font-bold text-gray-600">{deck.totalCards} carduri</span>
                 <span className="bg-white border border-gray-200 px-3 py-1 rounded-full text-xs font-bold text-gray-600">{deck.masteredCards} învățate</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 h-2 rounded-full mb-2 overflow-hidden">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mb-6 font-medium">
                <span>Progres: {percentage}%</span>
                <span>{deck.totalCards - deck.masteredCards} rămase</span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                  {hasProgress && onResetDeck && (
                     <button 
                        onClick={(e) => { e.stopPropagation(); onResetDeck(deck.id); }}
                        className="px-4 py-3 border-2 border-gray-200 text-gray-600 rounded-xl hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-colors font-bold"
                        title="Resetează progresul"
                     >
                        <RotateCcw size={18} />
                     </button>
                  )}
                  
                  <button 
                    onClick={() => onStartSession(deck)}
                    className="flex-1 bg-white hover:bg-gray-900 hover:text-white border border-gray-900 text-gray-900 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {hasProgress ? (
                        <>Continuă <ArrowRight size={18} /></>
                    ) : (
                        <>Studiază <Play size={18} fill="currentColor" /></>
                    )}
                  </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for New/Edit Deck (Code omitted for brevity as it's identical to previous, just wrapped in same component) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-scale-up">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              {editingDeckId ? 'Editează Deck' : 'Deck Nou'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Form fields same as previous */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Subiect</label>
                <select 
                  className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 font-medium outline-none focus:border-indigo-500 transition-colors"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  <option>Limba Română</option>
                  <option>Matematică</option>
                  <option>Istorie</option>
                  <option>Geografie</option>
                  <option>Engleză</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Titlu / Tematică</label>
                <input 
                  type="text" 
                  className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 font-medium outline-none focus:border-indigo-500 transition-colors"
                  placeholder="ex: Verbe Neregulate"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Dificultate</label>
                <select 
                  className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 font-medium outline-none focus:border-indigo-500 transition-colors"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                >
                  <option value="A1">A1 - Începător</option>
                  <option value="A2">A2 - Elementar</option>
                  <option value="B1">B1 - Intermediar</option>
                  <option value="B2">B2 - Intermediar Avansat</option>
                  <option value="C1">C1 - Avansat</option>
                </select>
              </div>

              {!editingDeckId && (
                <div className="pt-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Metodă Creare</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setImportMode('ai')}
                      className={`p-3 rounded-xl border-2 text-sm flex flex-col items-center gap-1 font-bold transition-all ${importMode === 'ai' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                    >
                      <Sparkles size={20} /> AI Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode('file')}
                      className={`p-3 rounded-xl border-2 text-sm flex flex-col items-center gap-1 font-bold transition-all ${importMode === 'file' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                    >
                      <Upload size={20} /> Import
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode('manual')}
                      className={`p-3 rounded-xl border-2 text-sm flex flex-col items-center gap-1 font-bold transition-all ${importMode === 'manual' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                    >
                      <Plus size={20} /> Manual
                    </button>
                  </div>
                </div>
              )}

              {importMode === 'file' && !editingDeckId && (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50">
                  <input type="file" accept=".txt,.csv" className="w-full text-sm text-gray-500" />
                  <p className="text-xs text-gray-400 mt-2 font-medium">Format suportat: CSV, TXT (Front, Back)</p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-white border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Anulează
                </button>
                <button 
                  type="submit" 
                  disabled={isGenerating}
                  className="flex-1 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors flex justify-center items-center gap-2 shadow-lg hover:-translate-y-1"
                >
                  {isGenerating ? <Loader2 className="animate-spin" /> : (editingDeckId ? 'Salvează' : 'Creează Deck')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeckList;