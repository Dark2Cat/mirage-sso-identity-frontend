import { ArrowRight, LockKeyhole, Search, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPortalApps } from '../api';
import { AppCard } from '../components/AppCard';
import { PageHeader } from '../components/PageHeader';
import { portalApps } from '../data';
import { useAuthStore } from '../stores/authStore';
import type { PortalApp } from '../types';

const categories = ['全部', '业务系统', 'AI 应用', '工具系统', '实验项目'];

export function PortalPage() {
  const navigate = useNavigate();
  const auth = useAuthStore();
  const [apps, setApps] = useState<PortalApp[]>(portalApps);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    fetchPortalApps().then(setApps).catch(() => setApps(portalApps));
  }, []);

  const filteredApps = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return apps.filter((app) => {
      const categoryMatched = selectedCategory === '全部' || app.category === selectedCategory;
      const keywordMatched = !normalizedKeyword
        || app.name.toLowerCase().includes(normalizedKeyword)
        || app.description.toLowerCase().includes(normalizedKeyword)
        || app.category.toLowerCase().includes(normalizedKeyword)
        || app.tags.some((tag) => tag.toLowerCase().includes(normalizedKeyword));
      return categoryMatched && keywordMatched;
    });
  }, [apps, keyword, selectedCategory]);

  const accessibleApps = useMemo(
    () => apps.filter((app) => canAccessApp(app, auth.isAuthenticated, auth.apps, auth.roles)),
    [apps, auth.apps, auth.isAuthenticated, auth.roles],
  );

  function openApp(app: PortalApp) {
    const needsLogin = app.visibility !== 'PUBLIC' && !auth.isAuthenticated;
    if (needsLogin) {
      navigate('/login', { state: { redirectTo: '/portal' } });
      return;
    }
    if (!canAccessApp(app, auth.isAuthenticated, auth.apps, auth.roles)) {
      return;
    }
    if (app.entryUrl === '#') {
      return;
    }
    window.location.href = app.entryUrl;
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="SSO Portal"
        title="统一身份入口"
        description="集中展示并接入 OA、CRM、商城、AI 应用和后续个人项目，登录一次即可进入被授权的工作空间。"
        actions={
          auth.isAuthenticated ? (
            <button className="primary-button">
              新增接入
              <ArrowRight size={17} />
            </button>
          ) : (
            <button className="primary-button" onClick={() => navigate('/login')} type="button">
              登录访问
              <ArrowRight size={17} />
            </button>
          )
        }
      />

      {/*<section className="hero-panel portal-hero">
        <div className="hero-copy">
          <span className="signal">
            <CircleDot size={14} />
            Authorization Code + PKCE Ready
          </span>
          <h2>把每个项目都接入同一个身份平面</h2>
          <p>
            Mirage Identity Center 负责统一认证、授权、Token 生命周期、RBAC 权限和审计日志，
            业务系统只需要关注自己的领域能力。
          </p>
          <div className="hero-metrics">
            <Metric value={String(apps.length)} label="接入应用" />
            <Metric value={String(accessibleApps.length)} label="可访问应用" />
            <Metric value={auth.isAuthenticated ? auth.sessionLabel : 'Guest'} label="当前会话" />
          </div>
        </div>
        <div className="auth-flow" aria-label="认证流程">
          {['Client', 'Authorize', 'Token', 'UserInfo'].map((step, index) => (
            <div className="flow-node" key={step}>
              <span>0{index + 1}</span>
              <strong>{step}</strong>
              <CheckCircle2 size={17} />
            </div>
          ))}
        </div>
      </section>*/}

      <section className="portal-user-strip">
        <div>
          <UserRound size={18} />
          <span>{auth.isAuthenticated ? `${auth.displayName} / ${auth.role}` : '访客模式'}</span>
        </div>
        <p>
          {auth.isAuthenticated
            ? `已登录，可访问 ${accessibleApps.length} 个应用。`
            : '未登录用户可以浏览应用说明，访问受保护应用时会进入统一登录页。'}
        </p>
      </section>

      <section className="toolbar-row">
        <div className="search-box">
          <Search size={18} />
          <input
            aria-label="搜索应用"
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索应用、Scope、技术标签"
            value={keyword}
          />
        </div>
        <div className="segmented">
          {categories.map((category) => (
            <button
              className={selectedCategory === category ? 'selected' : ''}
              key={category}
              onClick={() => setSelectedCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section className="app-grid">
        {filteredApps.map((app) => {
          const needsLogin = app.visibility !== 'PUBLIC' && !auth.isAuthenticated;
          const canAccess = canAccessApp(app, auth.isAuthenticated, auth.apps, auth.roles);
          return (
            <AppCard
              accessText={getAccessText(app, canAccess, needsLogin)}
              app={app}
              canAccess={canAccess}
              isGuest={!auth.isAuthenticated}
              key={app.code}
              needsLogin={needsLogin}
              onOpen={openApp}
            />
          );
        })}
      </section>

      {filteredApps.length === 0 ? (
        <section className="empty-state">
          <LockKeyhole size={22} />
          <strong>没有匹配的应用</strong>
          <span>调整分类或搜索关键字后再试。</span>
        </section>
      ) : null}
    </section>
  );
}

function canAccessApp(app: PortalApp, isAuthenticated: boolean, userApps: string[], roles: string[]) {
  if (app.status === 'draft') {
    return false;
  }
  if (app.visibility === 'PUBLIC') {
    return true;
  }
  if (!isAuthenticated) {
    return false;
  }
  if (roles.includes('ADMIN')) {
    return true;
  }
  if (app.visibility === 'LOGIN') {
    return true;
  }
  return userApps.includes(app.code);
}

function getAccessText(app: PortalApp, canAccess: boolean, needsLogin: boolean) {
  if (needsLogin) {
    return '登录后访问';
  }
  if (app.status === 'draft') {
    return '建设中';
  }
  if (!canAccess) {
    return '申请授权';
  }
  return '进入应用';
}
