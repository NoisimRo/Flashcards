import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Search,
  ChevronUp,
  ChevronDown,
  Loader2,
  Flame,
  Star,
  BookOpen,
  AlertTriangle,
  Users,
  UserPlus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../../store/AuthContext';
import { useToast } from '../../ui/Toast';
import { getCatalogStudents } from '../../../api/catalog';
import type { CatalogStudent } from '../../../types';
import { StudentDetailView } from './StudentDetailView';
import { AssignStudentsPanel } from './AssignStudentsPanel';
import { AVATARS } from '../Settings/AvatarPicker';

function getAvatarEmoji(avatarId?: string): string | null {
  if (!avatarId || avatarId === 'default') return null;
  const avatar = AVATARS.find(a => a.id === avatarId);
  return avatar?.emoji || null;
}

type SortField = 'name' | 'level' | 'totalXP' | 'streak' | 'createdAt';

export const StudentCatalog: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const toast = useToast();

  const [students, setStudents] = useState<CatalogStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showAssignPanel, setShowAssignPanel] = useState(false);

  useEffect(() => {
    loadStudents();
  }, [search, sortBy, sortOrder, page]);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const response = await getCatalogStudents({
        page,
        limit: 20,
        search: search || undefined,
        sortBy,
        sortOrder,
      });
      if (response.success && response.data) {
        setStudents(response.data as CatalogStudent[]);
        if (response.meta) {
          setTotalPages(response.meta.totalPages || 1);
          setTotal(response.meta.total || 0);
        }
      }
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Eroare', 'Nu s-au putut incarca elevii');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  // If a student is selected, show the detail view
  if (selectedStudentId) {
    return (
      <StudentDetailView studentId={selectedStudentId} onBack={() => setSelectedStudentId(null)} />
    );
  }

  // If showing assignment panel (admin only)
  if (showAssignPanel) {
    return (
      <AssignStudentsPanel
        onBack={() => {
          setShowAssignPanel(false);
          loadStudents();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <GraduationCap size={32} className="text-[var(--color-accent-text)]" />
            <h1 className="text-4xl font-bold text-[var(--text-primary)]">Catalog elevi</h1>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowAssignPanel(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-white rounded-xl font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              <UserPlus size={18} />
              Gestioneaza alocari
            </button>
          )}
        </div>
        <p className="text-[var(--text-secondary)]">
          {total} {total === 1 ? 'elev' : 'elevi'} in catalog
        </p>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Search & Sort Bar */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="text"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-[var(--border-primary)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:ring-2 focus:ring-[var(--color-accent-ring)] focus:border-transparent"
                placeholder="Cauta elevi dupa nume sau email..."
              />
            </div>
            <div className="flex gap-2">
              {(['name', 'level', 'totalXP', 'streak'] as SortField[]).map(field => (
                <button
                  key={field}
                  onClick={() => handleSort(field)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    sortBy === field
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
                  }`}
                >
                  {field === 'name'
                    ? 'Nume'
                    : field === 'level'
                      ? 'Nivel'
                      : field === 'totalXP'
                        ? 'XP'
                        : 'Streak'}
                  <SortIcon field={field} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Students List */}
        {isLoading ? (
          <div className="bg-[var(--card-bg)] rounded-2xl p-8 text-center">
            <Loader2 className="animate-spin mx-auto mb-2 text-[var(--text-tertiary)]" size={24} />
            <p className="text-[var(--text-tertiary)]">Se incarca elevii...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-[var(--card-bg)] rounded-2xl p-8 text-center">
            <Users size={48} className="mx-auto mb-3 text-[var(--text-muted)]" />
            <p className="text-[var(--text-tertiary)]">
              {search ? 'Niciun elev gasit pentru cautarea curenta' : 'Nu exista elevi alocati'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map(student => {
              const accuracy =
                student.totalAnswers > 0
                  ? Math.round((student.totalCorrectAnswers / student.totalAnswers) * 100)
                  : 0;
              const avatarEmoji = getAvatarEmoji(student.avatar);

              return (
                <div
                  key={student.id}
                  className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-sm cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                  onClick={() => setSelectedStudentId(student.id)}
                >
                  {/* Student Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{
                        background: 'var(--color-accent-gradient)',
                        color: 'var(--text-inverse)',
                      }}
                    >
                      {avatarEmoji ? (
                        <span className="text-lg">{avatarEmoji}</span>
                      ) : (
                        student.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[var(--text-primary)] truncate">
                        {student.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-medium">
                          Nivel {student.level}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Star size={14} className="text-yellow-500 shrink-0" />
                      <span className="text-sm text-[var(--text-secondary)]">
                        {student.totalXP.toLocaleString('ro-RO')} XP
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Flame size={14} className="text-orange-500 shrink-0" />
                      <span className="text-sm text-[var(--text-secondary)]">
                        {student.streak} zile streak
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen size={14} className="text-blue-500 shrink-0" />
                      <span className="text-sm text-[var(--text-secondary)]">
                        {student.decksStudied} deck-uri
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <GraduationCap size={14} className="text-green-500 shrink-0" />
                      <span className="text-sm text-[var(--text-secondary)]">
                        {student.totalCardsLearned} carduri
                      </span>
                    </div>
                  </div>

                  {/* Accuracy & Problem Cards */}
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-16 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${accuracy}%`,
                            backgroundColor:
                              accuracy >= 80 ? '#22c55e' : accuracy >= 60 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium text-[var(--text-tertiary)]">
                        {accuracy}% acuratete
                      </span>
                    </div>
                    {student.frequentlyIncorrectCount > 0 && (
                      <div className="flex items-center gap-1 text-orange-500">
                        <AlertTriangle size={12} />
                        <span className="text-xs font-medium">
                          {student.frequentlyIncorrectCount} problematice
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-30"
            >
              <ChevronLeft size={20} className="text-[var(--text-secondary)]" />
            </button>
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              Pagina {page} din {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-30"
            >
              <ChevronRight size={20} className="text-[var(--text-secondary)]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
