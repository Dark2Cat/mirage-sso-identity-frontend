import type { LucideIcon } from 'lucide-react';

export type AppStatus = 'online' | 'draft' | 'restricted';
export type AppVisibility = 'PUBLIC' | 'LOGIN' | 'AUTHORIZED' | 'ADMIN';

export interface PortalApp {
  code: string;
  name: string;
  description: string;
  category: string;
  entryUrl: string;
  status: AppStatus;
  visibility: AppVisibility;
  tags: string[];
  accent: string;
  icon: LucideIcon;
}

export interface AuditLog {
  id: string;
  actor: string;
  type: 'LOGIN' | 'TOKEN' | 'ADMIN' | 'SECURITY';
  event: string;
  target: string;
  result: 'SUCCESS' | 'FAILED';
  ip: string;
  userAgent: string;
  time: string;
  failureReason: string;
  requestId?: string;
  metadata?: string;
}
