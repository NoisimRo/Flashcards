import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Difficulty, Card, DeckWithCards } from '../../../types';
import { Plus, Upload, Sparkles, Loader2, Lock } from 'lucide-react';
import { generateDeckWithAI, importDeck } from '../../../api/decks';
import { useToast } from '../../ui/Toast';
import { getSubjectId } from '../../../constants/subjects';
import { useAuth } from '../../../store/AuthContext';
import { useUIStore } from '../../../store/uiStore';

interface GenerateCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'generate' | 'addCards';
  existingDeck?: {
    id: string;
    title: string;
    subject: string;
    difficulty: Difficulty;
    language?: string;
  } | null;
  onAddDeck: (deck: DeckWithCards) => void;
  onEditDeck: (deck: DeckWithCards) => void;
  onCardsAdded?: (deckId: string, cardsCount: number) => void;
  decks: Array<{ id: string; title: string; subject: string; difficulty: Difficulty }>;
}

export const GenerateCardsModal: React.FC<GenerateCardsModalProps> = ({
  isOpen,
  onClose,
  mode,
  existingDeck,
  onAddDeck,
  onEditDeck,
  onCardsAdded,
  decks,
}) => {
  const { t, i18n } = useTranslation('decks');
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const isGuest = !isAuthenticated;

  // Form State
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Limba Română');
  const [difficulty, setDifficulty] = useState<Difficulty>('A2');
  const [importMode, setImportMode] = useState<'manual' | 'ai' | 'file'>('ai');
  const [numberOfCards, setNumberOfCards] = useState(10);
  const [selectedCardTypes, setSelectedCardTypes] = useState<
    Array<'standard' | 'quiz' | 'type-answer' | 'multiple-answer'>
  >(['standard', 'quiz', 'type-answer', 'multiple-answer']);
  const [selectedLanguage, setSelectedLanguage] = useState('ro');
  const [extraContext, setExtraContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');

  // Loading messages for "The Dealer's Table" loading state
  const dealerMessages = t('loading.dealerMessages', { returnObjects: true }) as string[];
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // Available languages with flags
  const languages = useMemo(
    () => [
      { code: 'ro', name: 'Română', flag: '🇷🇴' },
      { code: 'en', name: 'English', flag: '🇬🇧' },
      { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    ],
    []
  );

  // Rotate loading messages every 3 seconds
  useEffect(() => {
    if (!isGenerating) return;

    const interval = setInterval(() => {
      setCurrentMessageIndex(prev => (prev + 1) % dealerMessages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isGenerating, dealerMessages.length]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && existingDeck) {
        setTitle(existingDeck.title);
        setSubject(existingDeck.subject);
        setDifficulty(existingDeck.difficulty);
        if (existingDeck.language) {
          setSelectedLanguage(existingDeck.language);
        }
      } else if (mode === 'generate' && existingDeck) {
        setTitle(existingDeck.title || '');
        setSubject(existingDeck.subject);
        setDifficulty(existingDeck.difficulty);
        setImportMode('ai');
        setNumberOfCards(10);
        setSelectedCardTypes(['standard', 'quiz', 'type-answer', 'multiple-answer']);
      } else if (mode === 'addCards' && existingDeck) {
        // Add cards mode - use existing deck's settings
        setTitle(existingDeck.title || '');
        setSubject(existingDeck.subject);
        setDifficulty(existingDeck.difficulty);
        setImportMode('ai'); // Default to AI, but allow file/manual
        setNumberOfCards(10);
        setSelectedCardTypes(['standard', 'quiz', 'type-answer', 'multiple-answer']);
      } else {
        setTitle('');
        setSubject('Limba Română');
        setDifficulty('A2');
        setImportMode(isGuest ? 'manual' : 'ai');
        setNumberOfCards(10);
        setSelectedCardTypes(['standard', 'quiz', 'type-answer', 'multiple-answer']);
      }

      // Default to current app language
      const currentLang = i18n.language?.split('-')[0] || 'ro';
      setSelectedLanguage(['ro', 'en', 'it'].includes(currentLang) ? currentLang : 'ro');
      setExtraContext('');
      setSelectedFile(null);
      setFileContent('');
    }
  }, [isOpen, mode, existingDeck, i18n.language, isGuest]);

  const toggleCardType = (type: 'standard' | 'quiz' | 'type-answer' | 'multiple-answer') => {
    setSelectedCardTypes(prev => {
      if (prev.includes(type)) {
        // Don't allow deselecting if it's the last selected type
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    try {
      const content = await file.text();
      setFileContent(content);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error(t('toast.fileReadError'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guest users: show login prompt instead of saving
    if (isGuest) {
      useUIStore.getState().setShowLoginPrompt(true, {
        title: t('guestPrompt.createDeck.title'),
        message: t('guestPrompt.createDeck.message'),
      });
      onClose();
      return;
    }

    setIsGenerating(true);

    try {
      if (mode === 'edit' && existingDeck) {
        // EDIT MODE (metadata only - no cards)
        const existingDeckData = decks.find(d => d.id === existingDeck.id);
        if (existingDeckData) {
          const updatedDeck: DeckWithCards = {
            ...existingDeckData,
            id: existingDeck.id,
            ownerId: '',
            title,
            subject,
            topic: title,
            difficulty,
            language: selectedLanguage,
            isPublic: false,
            tags: [],
            cards: [],
            totalCards: 0,
            masteredCards: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          onEditDeck(updatedDeck);
        }
      } else if (mode === 'generate' && existingDeck) {
        // GENERATE CARDS FOR EXISTING DECK (AI only - legacy mode)
        const newCards: Card[] = [];

        if (importMode === 'ai') {
          const response = await generateDeckWithAI(
            subject,
            title,
            difficulty,
            numberOfCards,
            selectedCardTypes,
            selectedLanguage,
            extraContext || undefined
          );
          if (response.success && response.data) {
            newCards.push(
              ...response.data.map((card, index) => ({
                ...card,
                tags: card.tag ? [card.tag] : [],
                id: `ai-${Date.now()}-${index}`,
                deckId: existingDeck.id,
                position: index,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }))
            );
          } else {
            toast.error(response.error?.message || t('toast.generationError'));
            setIsGenerating(false);
            return;
          }
        }

        const existingDeckData = decks.find(d => d.id === existingDeck.id);
        if (existingDeckData) {
          const updatedDeck: DeckWithCards = {
            ...existingDeckData,
            id: existingDeck.id,
            ownerId: '',
            topic: title,
            isPublic: false,
            tags: [],
            cards: newCards,
            totalCards: newCards.length,
            masteredCards: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          onEditDeck(updatedDeck);
        }
      } else if (mode === 'addCards' && existingDeck) {
        // ADD CARDS TO EXISTING DECK (AI, file, or manual)
        if (importMode === 'ai') {
          const response = await generateDeckWithAI(
            subject,
            title,
            difficulty,
            numberOfCards,
            selectedCardTypes,
            selectedLanguage,
            extraContext || undefined
          );
          if (response.success && response.data) {
            const newCards = response.data.map((card, index) => ({
              ...card,
              tags: card.tag ? [card.tag] : [],
              id: `ai-${Date.now()}-${index}`,
              deckId: existingDeck.id,
              position: index,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));

            const existingDeckData = decks.find(d => d.id === existingDeck.id);
            if (existingDeckData) {
              const updatedDeck: DeckWithCards = {
                ...existingDeckData,
                id: existingDeck.id,
                ownerId: '',
                topic: title,
                isPublic: false,
                tags: [],
                cards: newCards,
                totalCards: (existingDeckData as any).totalCards + newCards.length,
                masteredCards: (existingDeckData as any).masteredCards || 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              onEditDeck(updatedDeck);
            }
            toast.success(t('toast.cardsAdded', { count: newCards.length }));
            if (onCardsAdded) {
              onCardsAdded(existingDeck.id, newCards.length);
            }
          } else {
            toast.error(response.error?.message || t('toast.generationError'));
            setIsGenerating(false);
            return;
          }
        } else if (importMode === 'file' && fileContent) {
          // Import from file to existing deck
          const format = selectedFile?.name.endsWith('.csv') ? 'csv' : 'txt';
          const response = await importDeck({
            format,
            data: fileContent,
            deckId: existingDeck.id, // Add to existing deck
          });

          if (response.success && response.data) {
            toast.success(t('toast.cardsAdded', { count: response.data.cardsImported }));
            if (onCardsAdded) {
              onCardsAdded(existingDeck.id, response.data.cardsImported);
            }
          } else {
            const errorMessage = response.error?.message || t('toast.importError');
            console.error('Import error:', response.error);
            toast.error(errorMessage);
            setIsGenerating(false);
            return;
          }
        } else if (importMode === 'manual') {
          // Open the edit cards modal for this deck (handled by parent)
          toast.success(t('toast.openEditCards'));
          if (onCardsAdded) {
            onCardsAdded(existingDeck.id, 0); // Signal to open edit cards modal
          }
        }
      } else {
        // CREATE MODE
        if (importMode === 'ai') {
          const response = await generateDeckWithAI(
            subject,
            title,
            difficulty,
            numberOfCards,
            selectedCardTypes,
            selectedLanguage,
            extraContext || undefined
          );

          if (response.success && response.data) {
            const newCards = response.data.map((card, index) => ({
              ...card,
              tags: card.tag ? [card.tag] : [],
              id: `ai-${Date.now()}-${index}`,
              deckId: `d-${Date.now()}`,
              position: index,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));

            const newDeck: DeckWithCards = {
              id: `d-${Date.now()}`,
              ownerId: '',
              title,
              subject,
              topic: title,
              difficulty,
              language: selectedLanguage,
              isPublic: false,
              tags: [],
              cards: newCards,
              totalCards: newCards.length,
              masteredCards: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            onAddDeck(newDeck);
          } else {
            toast.error(response.error?.message || t('toast.generationError'));
            setIsGenerating(false);
            return;
          }
        } else if (importMode === 'file' && fileContent) {
          // Import from file
          const format = selectedFile?.name.endsWith('.csv') ? 'csv' : 'txt';
          const response = await importDeck({
            format,
            data: fileContent,
            title: title || undefined,
            subject: getSubjectId(subject),
            difficulty: difficulty || undefined,
          });

          if (response.success && response.data) {
            toast.success(t('toast.importSuccess', { count: response.data.cardsImported }));
            // Notify parent and close modal
            if (onCardsAdded) {
              onCardsAdded(response.data.deckId, response.data.cardsImported);
            }
            setIsGenerating(false);
            onClose();
            return;
          } else {
            // Show detailed error message
            const errorMessage = response.error?.message || t('toast.importError');
            console.error('Import error:', response.error);
            toast.error(errorMessage);
            setIsGenerating(false);
            return;
          }
        } else if (importMode === 'manual') {
          // Create empty deck
          const newDeck: DeckWithCards = {
            id: `d-${Date.now()}`,
            ownerId: '',
            title,
            subject,
            topic: title,
            difficulty,
            language: selectedLanguage,
            isPublic: false,
            tags: [],
            cards: [],
            totalCards: 0,
            masteredCards: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          onAddDeck(newDeck);
        }
      }

      setIsGenerating(false);
      onClose();
    } catch (error) {
      console.error('Error in form submission:', error);
      toast.error(t('toast.generationError'));
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-8 shadow-2xl animate-scale-up relative"
        onClick={e => e.stopPropagation()}
      >
        {/* "The Dealer's Table" Loading Overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/95 to-purple-900/95 rounded-3xl flex flex-col items-center justify-center z-50 backdrop-blur-sm">
            {/* Juggling Cards Animation */}
            <div className="relative w-32 h-32 mb-8">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute animate-juggle-1">
                  <div className="w-16 h-24 bg-gradient-to-br from-white to-gray-100 rounded-lg shadow-2xl border-2 border-gray-200 flex items-center justify-center text-3xl font-bold text-indigo-600">
                    A
                  </div>
                </div>
                <div className="absolute animate-juggle-2" style={{ animationDelay: '0.33s' }}>
                  <div className="w-16 h-24 bg-gradient-to-br from-white to-gray-100 rounded-lg shadow-2xl border-2 border-gray-200 flex items-center justify-center text-3xl font-bold text-purple-600">
                    K
                  </div>
                </div>
                <div className="absolute animate-juggle-3" style={{ animationDelay: '0.66s' }}>
                  <div className="w-16 h-24 bg-gradient-to-br from-white to-gray-100 rounded-lg shadow-2xl border-2 border-gray-200 flex items-center justify-center text-3xl font-bold text-pink-600">
                    Q
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Rotating Messages */}
            <p className="text-white text-center font-semibold text-base px-8 max-w-sm leading-relaxed animate-fade-in">
              {dealerMessages[currentMessageIndex]}
            </p>

            {/* Loading spinner */}
            <Loader2 className="text-white animate-spin mt-6" size={24} />
          </div>
        )}

        <h2 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">
          {mode === 'edit'
            ? t('modal.editDeck')
            : mode === 'generate'
              ? t('modal.generateCards')
              : mode === 'addCards'
                ? t('modal.addCards')
                : t('modal.newDeck')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Row 1: Subject (2/3) + Language (1/3) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                {t('modal.subject')}
              </label>
              <select
                className="w-full border-2 border-[var(--border-subtle)] bg-[var(--bg-tertiary)] rounded-xl p-3 font-medium outline-none focus:border-[var(--color-accent)] transition-colors text-[var(--text-primary)]"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              >
                <option>Limba Română</option>
                <option>Matematică</option>
                <option>Istorie</option>
                <option>Geografie</option>
                <option>Engleză</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                {t('modal.language')}
              </label>
              <select
                className="w-full border-2 border-[var(--border-subtle)] bg-[var(--bg-tertiary)] rounded-xl p-3 font-medium outline-none focus:border-[var(--color-accent)] transition-colors text-[var(--text-primary)]"
                value={selectedLanguage}
                onChange={e => setSelectedLanguage(e.target.value)}
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Title/Topic (full width) */}
          <div>
            <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
              {t('modal.titleLabel')}
            </label>
            <input
              type="text"
              className="w-full border-2 border-[var(--border-subtle)] bg-[var(--bg-tertiary)] rounded-xl p-3 font-medium outline-none focus:border-[var(--color-accent)] transition-colors text-[var(--text-primary)]"
              placeholder={t('modal.titlePlaceholder')}
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          {mode !== 'edit' && (
            <>
              {/* Row 3: Number of Cards (50%) + Difficulty (50%) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                    {importMode === 'ai' ? t('modal.numberOfCardsAI') : t('modal.numberOfCards')}
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={numberOfCards}
                    onChange={e => setNumberOfCards(parseInt(e.target.value) || 10)}
                    className="w-full border-2 border-[var(--border-subtle)] bg-[var(--bg-tertiary)] rounded-xl p-3 font-medium outline-none focus:border-[var(--color-accent)] transition-colors text-[var(--text-primary)] disabled:opacity-50"
                    disabled={importMode !== 'ai'}
                  />
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    {importMode === 'ai'
                      ? t('modal.cardsRecommendation')
                      : t('modal.cardsFromFile')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                    {t('modal.difficultyLabel')}
                  </label>
                  <select
                    className="w-full border-2 border-[var(--border-subtle)] bg-[var(--bg-tertiary)] rounded-xl p-3 font-medium outline-none focus:border-[var(--color-accent)] transition-colors text-[var(--text-primary)]"
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as Difficulty)}
                  >
                    <option value="A1">A1 - {t('difficulty.A1')}</option>
                    <option value="A2">A2 - {t('difficulty.A2')}</option>
                    <option value="B1">B1 - {t('difficulty.B1')}</option>
                    <option value="B2">B2 - {t('difficulty.B2')}</option>
                    <option value="C1">C1 - {t('difficulty.C1')}</option>
                  </select>
                </div>
              </div>

              {(mode === 'create' || mode === 'addCards') && (
                <div className="pt-2">
                  <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                    {mode === 'addCards' ? t('modal.addMethod') : t('modal.creationMethod')}
                  </label>
                  <div className={`grid gap-3 ${isGuest ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {!isGuest && (
                      <button
                        type="button"
                        onClick={() => setImportMode('ai')}
                        className={`p-3 rounded-xl border-2 text-sm flex flex-col items-center gap-1 font-bold transition-all ${
                          importMode === 'ai'
                            ? 'bg-[var(--color-accent-light)] border-[var(--color-accent)] text-[var(--color-accent-text)]'
                            : 'border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:bg-[var(--bg-surface-hover)]'
                        }`}
                      >
                        <Sparkles size={20} /> {t('modal.aiAuto')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setImportMode('file')}
                      className={`p-3 rounded-xl border-2 text-sm flex flex-col items-center gap-1 font-bold transition-all ${
                        importMode === 'file'
                          ? 'bg-[var(--color-accent-light)] border-[var(--color-accent)] text-[var(--color-accent-text)]'
                          : 'border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:bg-[var(--bg-surface-hover)]'
                      }`}
                    >
                      <Upload size={20} /> {t('modal.import')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode('manual')}
                      className={`p-3 rounded-xl border-2 text-sm flex flex-col items-center gap-1 font-bold transition-all ${
                        importMode === 'manual'
                          ? 'bg-[var(--color-accent-light)] border-[var(--color-accent)] text-[var(--color-accent-text)]'
                          : 'border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:bg-[var(--bg-surface-hover)]'
                      }`}
                    >
                      <Plus size={20} /> {t('modal.manual')}
                    </button>
                  </div>
                  {isGuest && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      <Lock size={12} />
                      {t('guestPrompt.aiGeneration.title')}
                    </p>
                  )}
                </div>
              )}

              {importMode === 'ai' && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-[var(--text-secondary)] mb-3">
                      {t('modal.cardTypes')}
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-[var(--bg-tertiary)] rounded-xl hover:bg-[var(--bg-surface-hover)] transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedCardTypes.includes('standard')}
                          onChange={() => toggleCardType('standard')}
                          className="w-5 h-5 rounded border-[var(--border-primary)] text-[var(--color-accent)] focus:ring-[var(--color-accent-ring)]"
                        />
                        <div className="flex-1">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {t('modal.standard')}
                          </span>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {t('modal.standardDesc')}
                          </p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-[var(--bg-tertiary)] rounded-xl hover:bg-[var(--bg-surface-hover)] transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedCardTypes.includes('quiz')}
                          onChange={() => toggleCardType('quiz')}
                          className="w-5 h-5 rounded border-[var(--border-primary)] text-[var(--color-accent)] focus:ring-[var(--color-accent-ring)]"
                        />
                        <div className="flex-1">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {t('modal.quiz')}
                          </span>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {t('modal.quizDesc')}
                          </p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-[var(--bg-tertiary)] rounded-xl hover:bg-[var(--bg-surface-hover)] transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedCardTypes.includes('type-answer')}
                          onChange={() => toggleCardType('type-answer')}
                          className="w-5 h-5 rounded border-[var(--border-primary)] text-[var(--color-accent)] focus:ring-[var(--color-accent-ring)]"
                        />
                        <div className="flex-1">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {t('modal.typeAnswer')}
                          </span>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {t('modal.typeAnswerDesc')}
                          </p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-[var(--bg-tertiary)] rounded-xl hover:bg-[var(--bg-surface-hover)] transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedCardTypes.includes('multiple-answer')}
                          onChange={() => toggleCardType('multiple-answer')}
                          className="w-5 h-5 rounded border-[var(--border-primary)] text-[var(--color-accent)] focus:ring-[var(--color-accent-ring)]"
                        />
                        <div className="flex-1">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {t('modal.multipleAnswer')}
                          </span>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {t('modal.multipleAnswerDesc')}
                          </p>
                        </div>
                      </label>
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)] mt-2">
                      {t('modal.deselectCardType')}
                    </p>
                  </div>

                  {/* Extra Context textarea */}
                  <div>
                    <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                      {t('modal.extraContext')}
                    </label>
                    <textarea
                      className="w-full border-2 border-[var(--border-subtle)] bg-[var(--bg-tertiary)] rounded-xl p-3 font-medium outline-none focus:border-[var(--color-accent)] transition-colors text-[var(--text-primary)] min-h-[120px] resize-y"
                      placeholder={t('modal.extraContextPlaceholder')}
                      value={extraContext}
                      onChange={e => setExtraContext(e.target.value)}
                      maxLength={2000}
                    />
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                      {t('modal.extraContextHelper')}
                    </p>
                  </div>
                </>
              )}

              {importMode === 'file' && (mode === 'create' || mode === 'addCards') && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-[var(--border-primary)] rounded-xl p-6 text-center bg-[var(--bg-tertiary)]">
                    <input
                      type="file"
                      accept=".txt,.csv"
                      onChange={handleFileSelect}
                      className="w-full text-sm text-[var(--text-tertiary)]"
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-2 font-medium">
                      {t('modal.fileImport')}
                    </p>
                    {selectedFile && (
                      <p className="text-sm text-green-600 mt-2 font-medium">
                        {t('modal.fileSelected', { name: selectedFile.name })}
                      </p>
                    )}
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm font-bold text-blue-800 mb-2">
                      {t('modal.importFormatTitle')}
                    </p>
                    <div className="text-xs text-blue-700 space-y-1">
                      <p>
                        <strong>CSV:</strong> {t('modal.importFormatCSV')}
                      </p>
                      <p>
                        <strong>TXT:</strong> {t('modal.importFormatTXT')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[var(--bg-surface)] border-2 border-[var(--border-secondary)] text-[var(--text-secondary)] font-bold py-3 rounded-xl hover:bg-[var(--bg-surface-hover)] transition-colors"
            >
              {t('modal.cancel')}
            </button>
            <button
              type="submit"
              disabled={
                isGenerating ||
                (importMode === 'file' &&
                  !fileContent &&
                  (mode === 'create' || mode === 'addCards'))
              }
              className="flex-1 bg-[var(--color-accent)] text-white font-bold py-3 rounded-xl hover:bg-[var(--color-accent-hover)] transition-colors flex justify-center items-center gap-2 shadow-lg hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <Loader2 className="animate-spin" />
              ) : mode === 'edit' ? (
                t('modal.save')
              ) : mode === 'generate' ? (
                t('modal.generateCardsBtn')
              ) : mode === 'addCards' ? (
                t('modal.addCardsBtn')
              ) : (
                t('modal.createDeck')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
