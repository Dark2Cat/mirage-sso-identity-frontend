import { ArrowUpRight, LockKeyhole, Radio, ShieldAlert } from 'lucide-react';
import type { PortalApp } from '../types';

const statusText = {
  online: '在线',
  draft: '建设中',
  restricted: '需授权',
};

const visibilityText = {
  PUBLIC: '公开',
  LOGIN: '登录可见',
  AUTHORIZED: '授权访问',
  ADMIN: '管理员',
};

interface AppCardProps {
  app: PortalApp;
  accessText: string;
  canAccess: boolean;
  isGuest: boolean;
  needsLogin: boolean;
  onOpen: (app: PortalApp) => void;
}

export function AppCard({ app, accessText, canAccess, isGuest, needsLogin, onOpen }: AppCardProps) {
  const Icon = app.icon;

  return (
    <article className="app-card" style={{ '--accent': app.accent } as never}>
      <div className="app-card-top">
        {isGuest ? null : (
          <div className="app-icon">
            <Icon size={24} />
          </div>
        )}
        {isGuest ? <span className="guest-category">{app.category}</span> : (
          <span className={`status-pill ${app.status}`}>
            {app.status === 'restricted' || needsLogin ? <LockKeyhole size={13} /> : <Radio size={13} />}
            {needsLogin ? '需登录' : statusText[app.status]}
          </span>
        )}
      </div>
      <div className="app-copy">
        <span>{app.category}</span>
        <h2>{app.name}</h2>
        <p>{app.description}</p>
      </div>
      {isGuest ? null : (
        <>
          <div className="app-meta">
            <span>{visibilityText[app.visibility]}</span>
            <span>{app.entryUrl}</span>
          </div>
          <div className="tag-row">
            {app.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </>
      )}
      {isGuest ? null : (
        <button
          className="card-link"
          disabled={!canAccess && !needsLogin}
          onClick={() => onOpen(app)}
          type="button"
        >
          {!canAccess && !needsLogin ? <ShieldAlert size={16} /> : <ArrowUpRight size={16} />}
          {accessText}
        </button>
      )}
    </article>
  );
}
