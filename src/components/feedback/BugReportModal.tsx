import React, { useState, useEffect, useCallback } from 'react';
import { X, Bug, Camera, RefreshCw, Send, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../ui/Toast';
import { submitBugReport } from '../../api/feedback';
import { useTranslation } from 'react-i18next';

interface BugReportModalProps {
  onClose: () => void;
}

export const BugReportModal: React.FC<BugReportModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useTranslation('sidebar');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(true);

  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const metadata = {
    url: window.location.href,
    userAgent: navigator.userAgent,
    userName: user?.name || 'Unknown',
    userEmail: user?.email || 'Unknown',
    userRole: user?.role || 'Unknown',
    userLevel: user?.level ?? 0,
  };

  const captureScreenshot = useCallback(async () => {
    setIsCapturing(true);
    // Hide the modal temporarily to capture the page behind it
    setModalVisible(false);

    // Wait for the DOM to update
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        scale: 1,
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      setScreenshot(dataUrl);
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      toast.error(
        t('bugReport.screenshotError', 'Eroare captură'),
        t('bugReport.screenshotErrorDetail', 'Nu s-a putut captura ecranul.')
      );
    } finally {
      setModalVisible(true);
      setIsCapturing(false);
    }
  }, [toast, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error(
        t('bugReport.titleRequired', 'Titlu obligatoriu'),
        t('bugReport.titleRequiredDetail', 'Te rog să adaugi un titlu pentru raport.')
      );
      return;
    }

    if (!description.trim()) {
      toast.error(
        t('bugReport.descriptionRequired', 'Descriere obligatorie'),
        t('bugReport.descriptionRequiredDetail', 'Te rog să descrii problema întâlnită.')
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await submitBugReport({
        title: title.trim(),
        description: description.trim(),
        metadata,
        screenshot: screenshot ?? undefined,
      });

      if (response.success && response.data) {
        toast.success(
          t('bugReport.successTitle', 'Raport trimis!'),
          t('bugReport.successDetail', 'Bug-ul a fost raportat cu succes pe GitHub.')
        );
        onClose();
      } else {
        toast.error(
          t('bugReport.errorTitle', 'Eroare'),
          response.error?.message || t('bugReport.errorDetail', 'Nu s-a putut trimite raportul.')
        );
      }
    } catch (error) {
      console.error('Error submitting bug report:', error);
      toast.error(
        t('bugReport.errorTitle', 'Eroare'),
        t('bugReport.errorDetail', 'Nu s-a putut trimite raportul.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!modalVisible) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-surface)] rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Bug size={24} className="text-red-600" />
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                {t('bugReport.title', 'Raportează un Bug')}
              </h2>
            </div>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">
              {t(
                'bugReport.subtitle',
                'Descrie problema întâlnită și vom crea un raport pe GitHub.'
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors"
          >
            <X size={24} className="text-[var(--text-tertiary)]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label
              htmlFor="bug-title"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              {t('bugReport.titleLabel', 'Titlu')} <span className="text-red-500">*</span>
            </label>
            <input
              id="bug-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
              required
              placeholder={t('bugReport.titlePlaceholder', 'Descriere scurtă a bug-ului...')}
              className="w-full px-4 py-3 border border-[var(--input-border)] rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-[var(--input-bg)] text-[var(--text-primary)]"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1 text-right">
              {title.length}/200
            </p>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="bug-description"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              {t('bugReport.descriptionLabel', 'Descriere')} <span className="text-red-500">*</span>
            </label>
            <textarea
              id="bug-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              maxLength={5000}
              required
              placeholder={t(
                'bugReport.descriptionPlaceholder',
                'Pași pentru a reproduce bug-ul...'
              )}
              className="w-full px-4 py-3 border border-[var(--input-border)] rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none bg-[var(--input-bg)] text-[var(--text-primary)]"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1 text-right">
              {description.length}/5000
            </p>
          </div>

          {/* Screenshot Section */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              {t('bugReport.screenshotLabel', 'Captură de ecran')}
            </label>

            {screenshot ? (
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden border border-[var(--border-secondary)]">
                  <img
                    src={screenshot}
                    alt="Screenshot preview"
                    className="w-full h-40 object-cover object-top"
                  />
                </div>
                <button
                  type="button"
                  onClick={captureScreenshot}
                  disabled={isCapturing}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                >
                  <RefreshCw size={14} />
                  {t('bugReport.recapture', 'Recaptură')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={captureScreenshot}
                disabled={isCapturing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[var(--border-secondary)] rounded-xl text-[var(--text-secondary)] hover:border-[var(--border-primary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
              >
                {isCapturing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {t('bugReport.capturing', 'Se capturează...')}
                  </>
                ) : (
                  <>
                    <Camera size={18} />
                    {t('bugReport.captureButton', 'Captură ecran')}
                  </>
                )}
              </button>
            )}
          </div>

          {/* Auto-collected Metadata Preview */}
          <div
            className="p-3 rounded-xl border text-xs space-y-1"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border-secondary)',
            }}
          >
            <p className="font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
              {t('bugReport.metadataTitle', 'Informații colectate automat')}
            </p>
            <p className="text-[var(--text-tertiary)]">
              <span className="font-medium text-[var(--text-secondary)]">URL:</span> {metadata.url}
            </p>
            <p className="text-[var(--text-tertiary)]">
              <span className="font-medium text-[var(--text-secondary)]">
                {t('bugReport.userLabel', 'Utilizator')}:
              </span>{' '}
              {metadata.userName} ({metadata.userRole})
            </p>
            <p className="text-[var(--text-tertiary)]">
              <span className="font-medium text-[var(--text-secondary)]">
                {t('bugReport.levelLabel', 'Nivel')}:
              </span>{' '}
              {metadata.userLevel}
            </p>
            <p className="text-[var(--text-tertiary)] truncate">
              <span className="font-medium text-[var(--text-secondary)]">Browser:</span>{' '}
              {metadata.userAgent}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 border border-[var(--border-primary)] text-[var(--text-secondary)] rounded-xl font-medium hover:bg-[var(--bg-surface-hover)] transition-colors disabled:opacity-50"
            >
              {t('bugReport.cancel', 'Anulează')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t('bugReport.sending', 'Se trimite...')}
                </>
              ) : (
                <>
                  <Send size={18} />
                  {t('bugReport.submit', 'Trimite raportul')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
