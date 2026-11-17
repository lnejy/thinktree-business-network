import { request } from './cardApi';
import type { Employee, UserRole } from './data';

export interface Session {
  user: Employee & { role: UserRole };
  employees: Employee[];
}

export const getSession = (signal?: AbortSignal) => request<Session>('/api/auth/me', { signal });
export const endSession = () => request<void>('/api/auth/logout', { method: 'POST' });

export function submitCredentials(values: { username: string; password: string; name?: string; inviteCode?: string }, signup: boolean) {
  return request<Session>(`/api/auth/${signup ? 'signup' : 'login'}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  });
}
