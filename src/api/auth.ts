import { api, setTokens, clearTokens } from './client';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types';

export async function login(email: string, password: string) {
  const response = await api.post<AuthResponse>('/auth/login', { email, password });

  if (response.success && response.data) {
    setTokens(response.data.accessToken, response.data.refreshToken);
  }

  return response;
}

export async function register(data: RegisterRequest) {
  const response = await api.post<AuthResponse>('/auth/register', data);

  if (response.success && response.data) {
    setTokens(response.data.accessToken, response.data.refreshToken);
  }

  return response;
}

export async function logout() {
  const response = await api.post('/auth/logout');
  clearTokens();
  return response;
}

export async function getMe() {
  return api.get<AuthResponse['user']>('/auth/me');
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return api.post('/auth/change-password', { currentPassword, newPassword });
}

export async function refreshSession() {
  // This is handled automatically by the client
  return api.post<AuthResponse>('/auth/refresh');
}
