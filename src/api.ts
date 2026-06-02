import axios from 'axios';
import { Bot, Building2, Headphones, ShoppingBag, Workflow } from 'lucide-react';
import type { AppVisibility, AuditLog, PortalApp } from './types';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 6000,
});

export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
  requestId: string;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResult {
  username: string;
  displayName: string;
  roles: string[];
  permissions: string[];
}

export interface RegisterPayload {
  username: string;
  password: string;
  checkPassword: string;
}

export interface CurrentUserResult {
  id: number;
  username: string;
  nickname: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  roles: string[];
  permissions: string[];
  apps: string[];
}

export type BackendUserStatus = 'PENDING' | 'ACTIVE' | 'DISABLED' | 'LOCKED' | 'DELETED';

export interface BackendUser {
  id: number;
  username: string;
  nickname: string;
  email: string;
  phone: string;
  avatarUrl: string;
  organizationId: number | null;
  organizationName: string | null;
  roles: string[];
  status: BackendUserStatus;
  lastLoginAt: string | null;
}

export interface UserUpsertPayload {
  username: string;
  password?: string;
  nickname?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  organizationId?: number | null;
  roles?: string[];
  status: BackendUserStatus;
}

export interface ProfileUpdatePayload {
  nickname?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}

export type RoleStatus = 'ACTIVE' | 'DISABLED';
export type PermissionType = 'APP' | 'MENU' | 'PAGE' | 'ACTION' | 'API';

export interface BackendRole {
  id: number;
  code: string;
  name: string;
  description: string;
  dataScope: string;
  status: RoleStatus;
  userCount: number;
  permissions: string[];
}

export interface RoleUpsertPayload {
  code: string;
  name: string;
  description?: string;
  dataScope?: string;
  status: RoleStatus;
  permissions?: string[];
}

export interface BackendPermission {
  id: number;
  code: string;
  name: string;
  type: PermissionType;
  parentId: number | null;
  resource: string;
  description: string;
  sortOrder: number;
  status: RoleStatus;
}

export interface PermissionUpsertPayload {
  code: string;
  name: string;
  type: PermissionType;
  parentId?: number | null;
  resource?: string;
  description?: string;
  sortOrder: number;
  status: RoleStatus;
}

export type OrganizationStatus = 'ACTIVE' | 'DISABLED';

export interface BackendOrganization {
  id: number;
  parentId: number | null;
  name: string;
  code: string;
  manager: string;
  userCount: number;
  sortOrder: number;
  status: OrganizationStatus;
}

export interface OrganizationUpsertPayload {
  parentId?: number | null;
  name: string;
  code: string;
  manager?: string;
  userCount: number;
  sortOrder: number;
  status: OrganizationStatus;
}

export type ClientType = 'SPA' | 'WEB' | 'SERVICE' | 'MOBILE';
export type ClientStatus = 'ENABLED' | 'DISABLED';

export interface BackendClient {
  id: number;
  clientId: string;
  clientName: string;
  clientType: ClientType;
  redirectUris: string;
  postLogoutRedirectUris: string;
  grantTypes: string;
  scopes: string;
  accessTokenTtl: number;
  refreshTokenTtl: number;
  requireConsent: boolean;
  status: ClientStatus;
}

export interface ClientUpsertPayload {
  clientId: string;
  clientSecret?: string;
  clientName: string;
  clientType: ClientType;
  redirectUris: string;
  postLogoutRedirectUris?: string;
  grantTypes: string;
  scopes: string;
  accessTokenTtl: number;
  refreshTokenTtl: number;
  requireConsent?: boolean;
  status: ClientStatus;
}

export interface BackendPortalApp {
  code: string;
  name: string;
  description: string;
  category: string;
  entryUrl: string;
  techTags: string;
  visibility?: AppVisibility;
  status: 'ENABLED' | 'DISABLED' | 'DRAFT';
}

export interface BackendAuditLog {
  id: number;
  actorName: string;
  eventType: string;
  targetType: string;
  targetId: string;
  result: 'SUCCESS' | 'FAILED';
  ipAddress: string;
  createdAt: string;
  userAgent?: string;
  failureReason?: string;
  requestId?: string;
  metadata?: string;
}

export interface AuditLogQuery {
  page?: number;
  size?: number;
  eventType?: string;
  result?: 'SUCCESS' | 'FAILED';
  keyword?: string;
}

export interface ConsentContext {
  client: {
    clientId: string;
    name: string;
    owner: string;
    redirectUri: string;
    homepage: string;
  };
  user: CurrentUserResult;
  scopes: Array<{
    code: string;
    title: string;
    description: string;
    required: boolean;
    risk: 'low' | 'medium' | 'high';
  }>;
}

export interface ConsentDecisionPayload {
  clientId: string;
  approved: boolean;
  scopes: string[];
}

export interface ConsentDecisionResult {
  clientId: string;
  approved: boolean;
  scopes: string[];
  redirectUri: string;
  result: string;
}

const iconMap = [Building2, Headphones, ShoppingBag, Bot, Workflow];
const accentMap = ['#48d7a6', '#76a7ff', '#f3c05d', '#e875b7', '#6fd6e8'];

export async function login(payload: LoginPayload) {
  const response = await api.post<ApiResponse<LoginResult>>('/auth/login', payload);
  return response.data.data;
}

export async function register(payload: RegisterPayload) {
  const response = await api.post<ApiResponse<BackendUser>>('/auth/register', payload);
  return response.data.data;
}

export async function fetchCurrentUser() {
  const response = await api.get<ApiResponse<CurrentUserResult>>('/auth/me');
  return response.data.data;
}

export async function logout() {
  await api.post<ApiResponse<void>>('/auth/logout');
}

export async function fetchPortalApps(): Promise<PortalApp[]> {
  const response = await api.get<ApiResponse<BackendPortalApp[]>>('/portal/apps');
  return response.data.data.map((app, index) => ({
    code: app.code,
    name: app.name,
    description: app.description,
    category: normalizeCategory(app.category),
    entryUrl: app.entryUrl,
    status: app.status === 'ENABLED' ? 'online' : app.status === 'DRAFT' ? 'draft' : 'restricted',
    visibility: app.visibility ?? (app.status === 'DRAFT' ? 'ADMIN' : 'LOGIN'),
    tags: parseList(app.techTags),
    accent: accentMap[index % accentMap.length],
    icon: iconMap[index % iconMap.length],
  }));
}

export async function fetchUsers(params?: { page?: number; size?: number }) {
  const response = await api.get<ApiResponse<PageResponse<BackendUser>>>('/admin/users', { params });
  return response.data.data;
}

export async function createUser(payload: UserUpsertPayload) {
  const response = await api.post<ApiResponse<BackendUser>>('/admin/users', payload);
  return response.data.data;
}

export async function updateUser(id: string | number, payload: UserUpsertPayload) {
  const response = await api.put<ApiResponse<BackendUser>>(`/admin/users/${id}`, payload);
  return response.data.data;
}

export async function updateUserStatus(id: string | number, status: BackendUserStatus) {
  const response = await api.patch<ApiResponse<BackendUser>>(`/admin/users/${id}/status`, { status });
  return response.data.data;
}

export async function resetUserPassword(id: string | number) {
  const response = await api.post<ApiResponse<{ password: string }>>(`/admin/users/${id}/reset-password`);
  return response.data.data;
}

export async function updateMyProfile(payload: ProfileUpdatePayload) {
  const response = await api.put<ApiResponse<BackendUser>>('/admin/users/me/profile', payload);
  return response.data.data;
}

export async function changeMyPassword(payload: { oldPassword: string; newPassword: string }) {
  await api.post<ApiResponse<void>>('/admin/users/me/password', payload);
}

export async function fetchRoles() {
  const response = await api.get<ApiResponse<BackendRole[]>>('/admin/roles');
  return response.data.data;
}

export async function createRole(payload: RoleUpsertPayload) {
  const response = await api.post<ApiResponse<BackendRole>>('/admin/roles', payload);
  return response.data.data;
}

export async function updateRole(id: string | number, payload: RoleUpsertPayload) {
  const response = await api.put<ApiResponse<BackendRole>>(`/admin/roles/${id}`, payload);
  return response.data.data;
}

export async function updateRoleStatus(id: string | number, status: RoleStatus) {
  const response = await api.patch<ApiResponse<BackendRole>>(`/admin/roles/${id}/status`, { status });
  return response.data.data;
}

export async function updateRolePermissions(id: string | number, permissions: string[]) {
  const response = await api.put<ApiResponse<BackendRole>>(`/admin/roles/${id}/permissions`, { permissions });
  return response.data.data;
}

export async function deleteRoleById(id: string | number) {
  await api.delete<ApiResponse<void>>(`/admin/roles/${id}`);
}

export async function fetchPermissions(type?: PermissionType) {
  const response = await api.get<ApiResponse<BackendPermission[]>>('/admin/permissions', {
    params: type ? { type } : undefined,
  });
  return response.data.data;
}

export async function createPermission(payload: PermissionUpsertPayload) {
  const response = await api.post<ApiResponse<BackendPermission>>('/admin/permissions', payload);
  return response.data.data;
}

export async function updatePermission(id: string | number, payload: PermissionUpsertPayload) {
  const response = await api.put<ApiResponse<BackendPermission>>(`/admin/permissions/${id}`, payload);
  return response.data.data;
}

export async function updatePermissionStatus(id: string | number, status: RoleStatus) {
  const response = await api.patch<ApiResponse<BackendPermission>>(`/admin/permissions/${id}/status`, { status });
  return response.data.data;
}

export async function deletePermissionById(id: string | number) {
  await api.delete<ApiResponse<void>>(`/admin/permissions/${id}`);
}

export async function fetchOrganizations() {
  const response = await api.get<ApiResponse<BackendOrganization[]>>('/admin/organizations');
  return response.data.data;
}

export async function createOrganization(payload: OrganizationUpsertPayload) {
  const response = await api.post<ApiResponse<BackendOrganization>>('/admin/organizations', payload);
  return response.data.data;
}

export async function updateOrganization(id: string | number, payload: OrganizationUpsertPayload) {
  const response = await api.put<ApiResponse<BackendOrganization>>(`/admin/organizations/${id}`, payload);
  return response.data.data;
}

export async function updateOrganizationStatus(id: string | number, status: OrganizationStatus) {
  const response = await api.patch<ApiResponse<BackendOrganization>>(`/admin/organizations/${id}/status`, { status });
  return response.data.data;
}

export async function deleteOrganizationById(id: string | number) {
  await api.delete<ApiResponse<void>>(`/admin/organizations/${id}`);
}

export async function fetchClients() {
  const response = await api.get<ApiResponse<BackendClient[]>>('/admin/clients');
  return response.data.data;
}

export async function createClient(payload: ClientUpsertPayload) {
  const response = await api.post<ApiResponse<BackendClient>>('/admin/clients', payload);
  return response.data.data;
}

export async function updateClient(id: string | number, payload: ClientUpsertPayload) {
  const response = await api.put<ApiResponse<BackendClient>>(`/admin/clients/${id}`, payload);
  return response.data.data;
}

export async function updateClientStatus(id: string | number, status: ClientStatus) {
  const response = await api.patch<ApiResponse<BackendClient>>(`/admin/clients/${id}/status`, { status });
  return response.data.data;
}

export async function resetClientSecret(id: string | number) {
  const response = await api.post<ApiResponse<{ secret: string }>>(`/admin/clients/${id}/reset-secret`);
  return response.data.data;
}

export async function deleteClientById(id: string | number) {
  await api.delete<ApiResponse<void>>(`/admin/clients/${id}`);
}

export async function assignAppAccess(payload: { userId?: number; roleCode?: string; appCodes: string[] }) {
  const response = await api.put<ApiResponse<{ userId?: number; roleCode?: string; appCodes: string[] }>>(
    '/admin/clients/access-assignments',
    payload,
  );
  return response.data.data;
}

export async function fetchAuditLogs(query?: AuditLogQuery): Promise<PageResponse<AuditLog>> {
  const response = await api.get<ApiResponse<PageResponse<BackendAuditLog>>>('/admin/audit-logs', { params: query });
  const page = response.data.data;
  return {
    ...page,
    items: page.items.map((log) => ({
      id: String(log.id),
      actor: log.actorName,
      type: inferAuditType(log.eventType),
      event: log.eventType,
      target: `${log.targetType}:${log.targetId}`,
      result: log.result,
      ip: log.ipAddress,
      userAgent: log.userAgent ?? '-',
      time: formatDateTime(log.createdAt),
      failureReason: log.failureReason ?? '',
      requestId: log.requestId ?? '',
      metadata: log.metadata ?? '',
    })),
  };
}

export async function fetchConsentContext(clientId: string) {
  const response = await api.get<ApiResponse<ConsentContext>>('/oauth/consent', {
    params: { client_id: clientId },
  });
  return response.data.data;
}

export async function submitConsentDecision(payload: ConsentDecisionPayload) {
  const response = await api.post<ApiResponse<ConsentDecisionResult>>('/oauth/consent', payload);
  return response.data.data;
}

export function parseList(value?: string | null) {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map(String);
    }
  } catch {
    // Comma separated values are also accepted by the backend for admin forms.
  }
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function normalizeCategory(category: string) {
  if (category === '交易系统') {
    return '业务系统';
  }
  if (category === '基础设施') {
    return '工具系统';
  }
  return category;
}

function inferAuditType(eventType: string): AuditLog['type'] {
  if (eventType.includes('LOGIN') || eventType.includes('LOGOUT')) {
    return 'LOGIN';
  }
  if (eventType.includes('TOKEN')) {
    return 'TOKEN';
  }
  if (eventType.includes('INVALID') || eventType.includes('LOCKED') || eventType.includes('FAIL')) {
    return 'SECURITY';
  }
  return 'ADMIN';
}

function formatDateTime(value: string) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.replace('T', ' ') : date.toLocaleString();
}
