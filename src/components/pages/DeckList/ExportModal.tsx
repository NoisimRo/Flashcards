import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { exportDeck, downloadExportedDeck } from '../../../api/decks';
import { useToast } from '../../ui/Toast';

interface ExportModalProps {
  isOpen: boolean;
  deckId: string;
  deckTitle: string;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, deckId, deckTitle, onClose }) => {
  const { t } = useTranslation('decks');
  const toast = useToast();
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'txt'>('csv');
  const [includeProgress, setIncludeProgress] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await exportDeck(deckId, selectedFormat, includeProgress);

      if (response.success && response.data) {
        downloadExportedDeck(response.data.fileName, response.data.content, response.data.mimeType);
        toast.success(t('toast.exportSuccess', { count: response.data.cardsCount }));
        onClose();
      } else {
        toast.error(response.error?.message || t('toast.exportError'));
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('toast.exportError'));
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--border-subtle)] flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              {t('exportModal.title')}
            </h2>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">
              {t('exportModal.subtitle', { title: deckTitle })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-bold text-[var(--text-secondary)] mb-3">
              {t('exportModal.selectFormat')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedFormat('csv')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 font-bold transition-all ${
                  selectedFormat === 'csv'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'border-[var(--border-secondary)] text-[var(--text-tertiary)] hover:bg-[var(--bg-surface-hover)]'
                }`}
              >
                <FileSpreadsheet size={24} />
                <span>CSV</span>
                <span className="text-xs font-normal text-[var(--text-tertiary)]">
                  {t('exportModal.csvDesc')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedFormat('txt')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 font-bold transition-all ${
                  selectedFormat === 'txt'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'border-[var(--border-secondary)] text-[var(--text-tertiary)] hover:bg-[var(--bg-surface-hover)]'
                }`}
              >
                <FileText size={24} />
                <span>TXT</span>
                <span className="text-xs font-normal text-[var(--text-tertiary)]">
                  {t('exportModal.txtDesc')}
                </span>
              </button>
            </div>
          </div>

          {/* Include Progress Option */}
          {selectedFormat === 'csv' && (
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-[var(--bg-tertiary)] rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors">
              <input
                type="checkbox"
                checked={includeProgress}
                onChange={e => setIncludeProgress(e.target.checked)}
                className="w-5 h-5 rounded border-[var(--input-border)] text-[var(--color-accent-text)] focus:ring-[var(--color-accent-ring)]"
              />
              <div className="flex-1">
                <span className="font-semibold text-[var(--text-primary)]">
                  {t('exportModal.includeProgress')}
                </span>
                <p className="text-xs text-[var(--text-secondary)]">
                  {t('exportModal.includeProgressDesc')}
                </p>
              </div>
            </label>
          )}

          {/* Format Preview */}
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-xl p-4">
            <p className="text-sm font-bold text-[var(--text-secondary)] mb-2">
              {t('exportModal.previewTitle')}
            </p>
            <div className="bg-[var(--bg-surface)] border border-[var(--border-secondary)] rounded-lg p-3 font-mono text-xs text-[var(--text-secondary)] overflow-x-auto whitespace-nowrap">
              {selectedFormat === 'csv' ? (
                <div className="space-y-1">
                  <div className="text-[var(--text-muted)]">
                    {includeProgress
                      ? 'Front,Back,Context,Type,Options,CorrectOptionIndex,Status,EaseFactor,Interval'
                      : 'Front,Back,Context,Type,Options,CorrectOptionIndex'}
                  </div>
                  <div className="text-green-700">
                    &quot;Ce este un verb?&quot;,&quot;O parte de vorbire&quot;,,standard,,
                  </div>
                  <div className="text-blue-700">
                    &quot;Câte litere are cheag?&quot;,&quot;5&quot;,,quiz,&quot;4|5|6|7&quot;,1
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-green-700">
                    Ce este un verb?{'  →  '}O parte de vorbire{'  →  '}context{'  →  '}standard
                  </div>
                  <div className="text-blue-700">
                    Câte litere?{'  →  '}5{'  →  '}context{'  →  '}quiz{'  →  '}4|5|6|7{'  →  '}1
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-2">
              {t('exportModal.previewNote')}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--border-subtle)] flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-[var(--bg-surface)] border-2 border-[var(--border-secondary)] text-[var(--text-secondary)] font-bold py-3 rounded-xl hover:bg-[var(--bg-surface-hover)] transition-colors"
          >
            {t('modal.cancel')}
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 bg-[var(--color-accent)] text-white font-bold py-3 rounded-xl hover:bg-[var(--color-accent-hover)] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <Download size={20} />
                {t('exportModal.exportBtn')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
