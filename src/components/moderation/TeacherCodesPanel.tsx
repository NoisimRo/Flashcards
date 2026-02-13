import React, { useState, useEffect } from 'react';
import { KeyRound, Plus, Copy, XCircle, CheckCircle, Clock, Loader2, Search } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { getTeacherCodes, createTeacherCode, revokeTeacherCode } from '../../api/teacherCodes';
import type { TeacherCode } from '../../types';

type CodeFilter = 'all' | 'available' | 'used' | 'revoked';

function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  const intervals: [string, number][] = [
    ['an', 31536000],
    ['luna', 2592000],
    ['saptamana', 604800],
    ['zi', 86400],
    ['ora', 3600],
    ['minut', 60],
  ];

  for (const [name, secondsInInterval] of intervals) {
    const interval = Math.floor(seconds / secondsInInterval);
    if (interval >= 1) {
      return `acum ${interval} ${name}${interval > 1 ? (name === 'zi' ? 'le' : name === 'ora' ? 'e' : name === 'an' ? 'i' : 'i') : ''}`;
    }
  }
  return 'acum';
}

function getCodeStatus(code: TeacherCode): { label: string; color: string; bgColor: string } {
  if (code.isUsed) {
    return { label: 'Folosit', color: 'text-green-700', bgColor: 'bg-green-100' };
  }
  if (code.revokedAt) {
    return { label: 'Revocat', color: 'text-red-700', bgColor: 'bg-red-100' };
  }
  if (code.expiresAt && new Date(code.expiresAt) < new Date()) {
    return { label: 'Expirat', color: 'text-orange-700', bgColor: 'bg-orange-100' };
  }
  return { label: 'Disponibil', color: 'text-blue-700', bgColor: 'bg-blue-100' };
}

export const TeacherCodesPanel: React.FC = () => {
  const [codes, setCodes] = useState<TeacherCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filter, setFilter] = useState<CodeFilter>('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const toast = useToast();

  useEffect(() => {
    loadCodes();
  }, [filter]);

  const loadCodes = async () => {
    setIsLoading(true);
    try {
      const response = await getTeacherCodes({ status: filter, limit: 50 });
      if (response.success && response.data) {
        setCodes(response.data as TeacherCode[]);
      }
    } catch (error) {
      console.error('Error loading codes:', error);
      toast.error('Eroare', 'Nu s-au putut incarca codurile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await createTeacherCode({
        label: newLabel || undefined,
      });
      if (response.success && response.data) {
        const newCode = response.data as TeacherCode;
        toast.success('Cod generat', `Codul ${newCode.code} a fost creat`);
        setShowGenerateModal(false);
        setNewLabel('');
        // Optimistically add the new code to the top of the list
        setCodes(prev => [
          {
            ...newCode,
            isUsed: false,
            revokedAt: undefined,
            usedAt: undefined,
            usedByName: undefined,
          },
          ...prev,
        ]);
        // Then refresh from server in the background
        await loadCodes();
      } else {
        toast.error('Eroare', response.error?.message || 'Nu s-a putut genera codul');
      }
    } catch (error) {
      toast.error('Eroare', 'A aparut o eroare la generarea codului');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = async (code: TeacherCode) => {
    try {
      const response = await revokeTeacherCode(code.id);
      if (response.success) {
        toast.success('Cod revocat', `Codul ${code.code} a fost revocat`);
        loadCodes();
      } else {
        toast.error('Eroare', response.error?.message || 'Nu s-a putut revoca codul');
      }
    } catch (error) {
      toast.error('Eroare', 'A aparut o eroare la revocarea codului');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Copiat', 'Codul a fost copiat in clipboard');
  };

  const stats = {
    total: codes.length,
    available: codes.filter(c => !c.isUsed && !c.revokedAt).length,
    used: codes.filter(c => c.isUsed).length,
    revoked: codes.filter(c => c.revokedAt).length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'var(--text-primary)' },
          { label: 'Disponibile', value: stats.available, color: '#3b82f6' },
          { label: 'Folosite', value: stats.used, color: '#22c55e' },
          { label: 'Revocate', value: stats.revoked, color: '#ef4444' },
        ].map(stat => (
          <div key={stat.label} className="bg-[var(--bg-tertiary)] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="text-xs font-medium text-[var(--text-tertiary)]">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as CodeFilter)}
          className="px-4 py-2 border border-[var(--border-primary)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
        >
          <option value="all">Toate codurile</option>
          <option value="available">Disponibile</option>
          <option value="used">Folosite</option>
          <option value="revoked">Revocate</option>
        </select>

        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-white rounded-xl font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          <Plus size={18} />
          Genereaza cod nou
        </button>
      </div>

      {/* Codes List */}
      {isLoading ? (
        <div className="bg-[var(--card-bg)] rounded-2xl p-8 text-center">
          <Loader2 className="animate-spin mx-auto mb-2 text-[var(--text-tertiary)]" size={24} />
          <p className="text-[var(--text-tertiary)]">Se incarca codurile...</p>
        </div>
      ) : codes.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-2xl p-8 text-center">
          <KeyRound size={48} className="mx-auto mb-3 text-[var(--text-muted)]" />
          <p className="text-[var(--text-tertiary)]">Nu exista coduri cu aceste filtre</p>
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map(code => {
            const status = getCodeStatus(code);
            return (
              <div
                key={code.id}
                className="bg-[var(--card-bg)] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3"
              >
                {/* Code + Label */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-lg font-mono font-bold text-[var(--text-primary)] tracking-wider">
                      {code.code}
                    </code>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color} ${status.bgColor}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  {code.label && (
                    <p className="text-sm text-[var(--text-secondary)]">{code.label}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-[var(--text-tertiary)] mt-1">
                    <span>Creat de: {code.createdByName || '-'}</span>
                    <span>{timeAgo(new Date(code.createdAt))}</span>
                    {code.usedByName && <span>Folosit de: {code.usedByName}</span>}
                    {code.expiresAt && (
                      <span>Expira: {new Date(code.expiresAt).toLocaleDateString('ro-RO')}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => copyCode(code.code)}
                    className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                    title="Copiaza cod"
                  >
                    <Copy size={16} className="text-[var(--text-secondary)]" />
                  </button>
                  {!code.isUsed && !code.revokedAt && (
                    <button
                      onClick={() => handleRevoke(code)}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="Revoca cod"
                    >
                      <XCircle size={16} className="text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Generate Modal */}
      {showGenerateModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowGenerateModal(false)}
        >
          <div
            className="bg-[var(--bg-surface)] rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
              Genereaza cod de invitatie
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Nota (optional)
                </label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--border-primary)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                  placeholder="ex: Pentru profesoara Maria"
                  maxLength={100}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="flex-1 px-4 py-2 border border-[var(--border-primary)] rounded-xl text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Anuleaza
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex-1 px-4 py-2 bg-[var(--color-accent)] text-white rounded-xl font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Se genereaza...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Genereaza
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
