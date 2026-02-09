import { api } from './client';

export interface BugReportPayload {
  title: string;
  description: string;
  metadata: {
    url: string;
    userAgent: string;
    userName: string;
    userEmail: string;
    userRole: string;
    userLevel: number;
  };
  screenshot?: string;
}

export interface BugReportResponse {
  issueUrl: string;
  issueNumber: number;
}

export function submitBugReport(payload: BugReportPayload) {
  return api.post<BugReportResponse>('/feedback/bug', payload);
}
