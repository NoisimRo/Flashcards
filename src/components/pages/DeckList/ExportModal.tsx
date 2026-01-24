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
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('exportModal.title')}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('exportModal.subtitle', { title: deckTitle })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              {t('exportModal.selectFormat')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedFormat('csv')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 font-bold transition-all ${
                  selectedFormat === 'csv'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <FileSpreadsheet size={24} />
                <span>CSV</span>
                <span className="text-xs font-normal text-gray-500">
                  {t('exportModal.csvDesc')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedFormat('txt')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 font-bold transition-all ${
                  selectedFormat === 'txt'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <FileText size={24} />
                <span>TXT</span>
                <span className="text-xs font-normal text-gray-500">
                  {t('exportModal.txtDesc')}
                </span>
              </button>
            </div>
          </div>

          {/* Include Progress Option */}
          {selectedFormat === 'csv' && (
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={includeProgress}
                onChange={e => setIncludeProgress(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <span className="font-semibold text-gray-900">
                  {t('exportModal.includeProgress')}
                </span>
                <p className="text-xs text-gray-600">{t('exportModal.includeProgressDesc')}</p>
              </div>
            </label>
          )}

          {/* Format Preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-bold text-gray-700 mb-2">{t('exportModal.previewTitle')}</p>
            <div className="bg-white border border-gray-200 rounded-lg p-3 font-mono text-xs text-gray-600 overflow-x-auto">
              {selectedFormat === 'csv' ? (
                <div>
                  <div className="text-gray-400">
                    {includeProgress
                      ? 'Front,Back,Context,Status,Ease Factor,Interval'
                      : 'Front,Back,Context'}
                  </div>
                  <div>
                    &quot;Ce este un verb?&quot;,&quot;O parte de vorbire&quot;,&quot;Exemplu: a
                    merge&quot;
                  </div>
                  <div>
                    &quot;Ce este un substantiv?&quot;,&quot;Un cuvânt care
                    denumește&quot;,&quot;Exemplu: masă&quot;
                  </div>
                </div>
              ) : (
                <div>
                  <div>
                    Ce este un verb?{'\t'}O parte de vorbire{'\t'}Exemplu: a merge
                  </div>
                  <div>
                    Ce este un substantiv?{'\t'}Un cuvânt care denumește{'\t'}Exemplu: masă
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">{t('exportModal.previewNote')}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-white border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            {t('modal.cancel')}
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
