import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, UserPlus, Search, Check, X, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '../../ui/Toast';
import {
  getTeachersForAssignment,
  getAssignments,
  assignStudents,
  removeAssignment,
  getUnassignedStudents,
} from '../../../api/catalog';
import type { TeacherForAssignment, StudentAssignment } from '../../../types';
import { AVATARS } from '../Settings/AvatarPicker';

function getAvatarEmoji(avatarId?: string): string | null {
  if (!avatarId || avatarId === 'default') return null;
  const avatar = AVATARS.find(a => a.id === avatarId);
  return avatar?.emoji || null;
}

interface Props {
  onBack: () => void;
}

export const AssignStudentsPanel: React.FC<Props> = ({ onBack }) => {
  const toast = useToast();

  const [teachers, setTeachers] = useState<TeacherForAssignment[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [unassigned, setUnassigned] = useState<
    Array<{ id: string; name: string; email: string; avatar?: string; level: number }>
  >([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [searchUnassigned, setSearchUnassigned] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    loadTeachers();
  }, []);

  useEffect(() => {
    if (selectedTeacherId) {
      loadAssignments();
      loadUnassigned();
    }
  }, [selectedTeacherId]);

  useEffect(() => {
    if (selectedTeacherId) {
      const timeout = setTimeout(() => loadUnassigned(), 300);
      return () => clearTimeout(timeout);
    }
  }, [searchUnassigned]);

  const loadTeachers = async () => {
    setIsLoading(true);
    try {
      const response = await getTeachersForAssignment();
      if (response.success && response.data) {
        setTeachers(response.data as TeacherForAssignment[]);
        if ((response.data as TeacherForAssignment[]).length > 0) {
          setSelectedTeacherId((response.data as TeacherForAssignment[])[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading teachers:', error);
      toast.error('Eroare', 'Nu s-au putut incarca profesorii');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssignments = async () => {
    if (!selectedTeacherId) return;
    try {
      const response = await getAssignments(selectedTeacherId);
      if (response.success && response.data) {
        setAssignments(response.data as StudentAssignment[]);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const loadUnassigned = async () => {
    if (!selectedTeacherId) return;
    try {
      const response = await getUnassignedStudents(
        selectedTeacherId,
        searchUnassigned || undefined
      );
      if (response.success && response.data) {
        setUnassigned(
          response.data as Array<{
            id: string;
            name: string;
            email: string;
            avatar?: string;
            level: number;
          }>
        );
      }
    } catch (error) {
      console.error('Error loading unassigned:', error);
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedStudentIds(new Set(unassigned.map(s => s.id)));
  };

  const deselectAll = () => {
    setSelectedStudentIds(new Set());
  };

  const handleAssign = async () => {
    if (!selectedTeacherId || selectedStudentIds.size === 0) return;
    setIsAssigning(true);
    try {
      const response = await assignStudents(selectedTeacherId, Array.from(selectedStudentIds));
      if (response.success && response.data) {
        const data = response.data as { assigned: number; alreadyAssigned: number };
        toast.success(
          'Elevi alocati',
          `${data.assigned} elevi alocati${data.alreadyAssigned > 0 ? `, ${data.alreadyAssigned} deja alocati` : ''}`
        );
        setSelectedStudentIds(new Set());
        loadAssignments();
        loadUnassigned();
      } else {
        toast.error('Eroare', response.error?.message || 'Nu s-au putut aloca elevii');
      }
    } catch (error) {
      toast.error('Eroare', 'A aparut o eroare la alocarea elevilor');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const response = await removeAssignment(assignmentId);
      if (response.success) {
        toast.success('Alocare eliminata');
        loadAssignments();
        loadUnassigned();
      } else {
        toast.error('Eroare', response.error?.message || 'Nu s-a putut elimina alocarea');
      }
    } catch (error) {
      toast.error('Eroare', 'A aparut o eroare');
    }
  };

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] p-6 flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--text-tertiary)]" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Inapoi la catalog
        </button>

        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-3">
          <UserPlus size={28} className="text-[var(--color-accent-text)]" />
          Gestionare alocari elevi
        </h1>

        {teachers.length === 0 ? (
          <div className="bg-[var(--card-bg)] rounded-2xl p-8 text-center">
            <Users size={48} className="mx-auto mb-3 text-[var(--text-muted)]" />
            <p className="text-[var(--text-tertiary)]">Nu exista profesori inregistrati</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Teacher Selection */}
            <div className="lg:col-span-1">
              <div className="bg-[var(--card-bg)] rounded-2xl p-4 shadow-sm sticky top-6">
                <h2 className="text-sm font-bold text-[var(--text-tertiary)] mb-3 uppercase tracking-wider">
                  Profesori
                </h2>
                <div className="space-y-2">
                  {teachers.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTeacherId(t.id);
                        setSelectedStudentIds(new Set());
                      }}
                      className={`w-full text-left p-3 rounded-xl transition-all ${
                        selectedTeacherId === t.id
                          ? 'bg-[var(--color-accent)] text-white shadow-sm'
                          : 'hover:bg-[var(--bg-tertiary)]'
                      }`}
                    >
                      <div className="font-medium text-sm">{t.name}</div>
                      <div
                        className={`text-xs ${selectedTeacherId === t.id ? 'text-white/70' : 'text-[var(--text-tertiary)]'}`}
                      >
                        {t.studentCount} elevi alocati
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Assignment Management */}
            <div className="lg:col-span-2 space-y-6">
              {/* Current Assignments */}
              <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
                  Elevi alocati la {selectedTeacher?.name} ({assignments.length})
                </h2>
                {assignments.length === 0 ? (
                  <p className="text-sm text-[var(--text-tertiary)]">
                    Niciun elev alocat acestui profesor
                  </p>
                ) : (
                  <div className="space-y-2">
                    {assignments.map(a => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                            style={{
                              background: 'var(--color-accent-gradient)',
                              color: 'var(--text-inverse)',
                            }}
                          >
                            {getAvatarEmoji(a.studentAvatar) ||
                              a.studentName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[var(--text-primary)]">
                              {a.studentName}
                            </div>
                            <div className="text-xs text-[var(--text-tertiary)]">
                              {a.studentEmail} · Nivel {a.studentLevel}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveAssignment(a.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          title="Elimina alocare"
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Students */}
              <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">Adauga elevi</h2>
                  {selectedStudentIds.size > 0 && (
                    <button
                      onClick={handleAssign}
                      disabled={isAssigning}
                      className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-white rounded-xl font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
                    >
                      {isAssigning ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <UserPlus size={16} />
                      )}
                      Aloca {selectedStudentIds.size} elev{selectedStudentIds.size > 1 ? 'i' : ''}
                    </button>
                  )}
                </div>

                {/* Search */}
                <div className="relative mb-3">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <input
                    type="text"
                    value={searchUnassigned}
                    onChange={e => setSearchUnassigned(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-[var(--border-primary)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                    placeholder="Cauta elevi nealocati..."
                  />
                </div>

                {/* Select All / Deselect All */}
                {unassigned.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={selectAll}
                      className="text-xs font-medium text-[var(--color-accent)] hover:underline"
                    >
                      Selecteaza toti
                    </button>
                    {selectedStudentIds.size > 0 && (
                      <button
                        onClick={deselectAll}
                        className="text-xs font-medium text-[var(--text-secondary)] hover:underline"
                      >
                        Deselecteaza
                      </button>
                    )}
                  </div>
                )}

                {/* Student List */}
                {unassigned.length === 0 ? (
                  <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
                    {searchUnassigned
                      ? 'Niciun elev gasit'
                      : 'Toti elevii sunt deja alocati acestui profesor'}
                  </p>
                ) : (
                  <div className="space-y-1 max-h-80 overflow-y-auto">
                    {unassigned.map(s => (
                      <button
                        key={s.id}
                        onClick={() => toggleStudent(s.id)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
                          selectedStudentIds.has(s.id)
                            ? 'bg-[var(--color-accent)]/10 ring-1 ring-[var(--color-accent)]'
                            : 'hover:bg-[var(--bg-tertiary)]'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                            selectedStudentIds.has(s.id)
                              ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                              : 'border-[var(--border-primary)]'
                          }`}
                        >
                          {selectedStudentIds.has(s.id) && (
                            <Check size={12} className="text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {s.name}
                          </div>
                          <div className="text-xs text-[var(--text-tertiary)]">
                            {s.email} · Nivel {s.level}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
