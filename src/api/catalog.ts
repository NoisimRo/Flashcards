import { api } from './client';
import type {
  CatalogStudent,
  StudentDetail,
  ProgressReport,
  TeacherForAssignment,
  StudentAssignment,
} from '../types';

export async function getCatalogStudents(params?: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', String(params.page));
  if (params?.limit) queryParams.set('limit', String(params.limit));
  if (params?.search) queryParams.set('search', params.search);
  if (params?.sortBy) queryParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) queryParams.set('sortOrder', params.sortOrder);
  const qs = queryParams.toString();
  return api.get<CatalogStudent[]>(`/catalog/students${qs ? `?${qs}` : ''}`);
}

export async function getStudentDetail(studentId: string) {
  return api.get<StudentDetail>(`/catalog/students/${studentId}/details`);
}

export async function generateAIReport(studentId: string) {
  return api.post<ProgressReport>(`/catalog/students/${studentId}/ai-report`);
}

export async function getStudentReports(studentId: string) {
  return api.get<ProgressReport[]>(`/catalog/students/${studentId}/reports`);
}

export async function getTeachersForAssignment() {
  return api.get<TeacherForAssignment[]>('/catalog/teachers');
}

export async function getAssignments(teacherId?: string) {
  const qs = teacherId ? `?teacherId=${teacherId}` : '';
  return api.get<StudentAssignment[]>(`/catalog/assignments${qs}`);
}

export async function assignStudents(teacherId: string, studentIds: string[]) {
  return api.post<{ assigned: number; alreadyAssigned: number; invalidIds: number }>(
    '/catalog/assignments',
    { teacherId, studentIds }
  );
}

export async function removeAssignment(id: string) {
  return api.delete<{ message: string }>(`/catalog/assignments/${id}`);
}

export async function getUnassignedStudents(teacherId: string, search?: string) {
  const queryParams = new URLSearchParams({ teacherId });
  if (search) queryParams.set('search', search);
  return api.get<
    Array<{ id: string; name: string; email: string; avatar?: string; level: number }>
  >(`/catalog/unassigned-students?${queryParams.toString()}`);
}
