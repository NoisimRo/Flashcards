import { api } from './client';
import type { TeacherCode, CreateTeacherCodeRequest } from '../types';

export async function getTeacherCodes(params?: {
  status?: 'all' | 'available' | 'used' | 'revoked';
  page?: number;
  limit?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.set('status', params.status);
  if (params?.page) queryParams.set('page', String(params.page));
  if (params?.limit) queryParams.set('limit', String(params.limit));
  const qs = queryParams.toString();
  return api.get<TeacherCode[]>(`/teacher-codes${qs ? `?${qs}` : ''}`);
}

export async function createTeacherCode(data?: CreateTeacherCodeRequest) {
  return api.post<TeacherCode>('/teacher-codes', data || {});
}

export async function revokeTeacherCode(id: string) {
  return api.delete<{ message: string }>(`/teacher-codes/${id}`);
}

export async function validateTeacherCode(code: string) {
  return api.get<{ valid: boolean }>(`/teacher-codes/validate/${encodeURIComponent(code)}`);
}
