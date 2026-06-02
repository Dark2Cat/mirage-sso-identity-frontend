import { create } from 'zustand';
import type { CurrentUserResult, LoginResult } from '../api';

interface UserState {
  id?: number;
  username: string;
  displayName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  role: string;
  roles: string[];
  permissions: string[];
  apps: string[];
  authReady: boolean;
  isAuthenticated: boolean;
  rememberMe: boolean;
  sessionLabel: string;
  setAuthReady: (ready: boolean) => void;
  setLoginResult: (result: LoginResult, rememberMe: boolean) => void;
  setCurrentUser: (result: CurrentUserResult) => void;
  setUser: (username: string) => void;
  logout: () => void;
}

const guestState = {
  id: undefined,
  username: '',
  displayName: '访客',
  email: '',
  phone: '',
  avatarUrl: '',
  role: 'Guest',
  roles: [] as string[],
  permissions: [] as string[],
  apps: [] as string[],
  authReady: false,
  isAuthenticated: false,
  rememberMe: false,
  sessionLabel: '未登录',
};

export const useAuthStore = create<UserState>((set) => ({
  ...guestState,
  setAuthReady: (ready) =>
    set({
      authReady: ready,
    }),
  setLoginResult: (result, rememberMe) =>
    set({
      id: undefined,
      username: result.username,
      displayName: result.displayName || result.username,
      email: `${result.username}@mirage.local`,
      phone: '',
      avatarUrl: '',
      role: result.roles[0] ?? 'USER',
      roles: result.roles,
      permissions: result.permissions,
      apps: ['oa', 'crm', 'mall', 'ai-lab'],
      authReady: true,
      isAuthenticated: true,
      rememberMe,
      sessionLabel: rememberMe ? '长会话 7 天' : '标准会话 2 小时',
    }),
  setCurrentUser: (result) =>
    set({
      id: result.id,
      username: result.username,
      displayName: result.nickname || result.username,
      email: result.email,
      phone: result.phone ?? '',
      avatarUrl: result.avatarUrl ?? '',
      role: result.roles[0] ?? 'USER',
      roles: result.roles,
      permissions: result.permissions,
      apps: result.apps,
      authReady: true,
      isAuthenticated: true,
    }),
  setUser: (username) =>
    set({
      username,
      displayName: username ? `${username}` : 'Mirage Admin',
      email: username ? `${username}@mirage.local` : '',
      phone: '',
      avatarUrl: '',
      authReady: true,
      isAuthenticated: Boolean(username),
    }),
  logout: () => set({ ...guestState, authReady: true }),
}));
