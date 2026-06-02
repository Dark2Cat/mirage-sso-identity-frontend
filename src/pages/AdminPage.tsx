import { ArrowUpRight, Database, KeyRound, ShieldAlert, ShieldCheck, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { adminMetrics, auditLogs } from '../data';
import { useAuthStore } from '../stores/authStore';

export function AdminPage() {
  const user = useAuthStore();
  const visibleModules = [
    { label: '用户管理', path: '/admin/users', permission: 'sso:user:read' },
    { label: '角色管理', path: '/admin/roles', permission: 'sso:role:manage' },
    { label: '组织管理', path: '/admin/organizations', permission: 'sso:user:manage' },
    { label: '权限管理', path: '/admin/permissions', permission: 'sso:role:manage' },
    { label: '客户端管理', path: '/admin/clients', permission: 'sso:client:manage' },
    { label: '审计日志', path: '/admin/audit-logs', permission: 'sso:audit:read' },
  ].filter((item) => user.roles.includes('ADMIN') || user.permissions.includes(item.permission));

  const todayLogin = auditLogs.filter((log) => log.type === 'LOGIN' && log.result === 'SUCCESS').length;
  const abnormalLogin = auditLogs.filter((log) => log.type === 'LOGIN' && log.result === 'FAILED').length;
  const securityEvents = auditLogs.filter((log) => log.type === 'SECURITY' || log.result === 'FAILED');

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Admin Console"
        title="管理后台"
        description="根据当前权限展示管理菜单，集中查看用户、角色、客户端、审计日志和安全事件。"
        actions={
          <Link className="secondary-button" to="/admin/audit-logs">
            导出审计
            <ArrowUpRight size={17} />
          </Link>
        }
      />

      <section className="metric-grid">
        {adminMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article className="metric-card" key={metric.label}>
              <Icon size={22} />
              <span>{metric.label}</span>
              <strong>
                {metric.label === '今日登录次数' ? todayLogin : metric.label === '异常登录次数' ? abnormalLogin : metric.value}
              </strong>
              <small>{metric.hint}</small>
            </article>
          );
        })}
      </section>

      <section className="ops-layout">
        <div className="ops-panel">
          <div className="panel-title">
            <ShieldCheck size={20} />
            <h2>可见管理模块</h2>
          </div>
          {visibleModules.map((module) => (
            <Link className="admin-module-row" key={module.path} to={module.path}>
              <span>{module.label}</span>
              <strong>{user.roles.includes('ADMIN') ? 'ADMIN' : module.permission}</strong>
            </Link>
          ))}
        </div>

        <div className="ops-panel">
          <div className="panel-title">
            <ShieldAlert size={20} />
            <h2>异常安全事件</h2>
          </div>
          {securityEvents.slice(0, 5).map((log) => (
            <div className="audit-mini" key={log.id}>
              <span>{log.event}</span>
              <strong>{log.result}</strong>
              <small>{log.ip}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="ops-layout">
        <div className="ops-panel">
          <div className="panel-title">
            <KeyRound size={20} />
            <h2>授权服务状态</h2>
          </div>
          {['/oauth2/authorize', '/oauth2/token', '/oauth2/jwks', '/userinfo'].map(
            (endpoint) => (
              <div className="health-row" key={endpoint}>
                <span>{endpoint}</span>
                <strong>healthy</strong>
              </div>
            ),
          )}
        </div>
        <div className="ops-panel">
          <div className="panel-title">
            <Database size={20} />
            <h2>最近管理操作</h2>
          </div>
          {auditLogs.filter((log) => log.type === 'ADMIN').slice(0, 4).map((log) => (
            <div className="audit-mini" key={log.id}>
              <span>{log.event}</span>
              <strong>{log.actor}</strong>
              <small>{log.time}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="ops-panel">
        <div className="panel-title">
          <UsersRound size={20} />
          <h2>管理操作规则</h2>
        </div>
        <div className="policy-grid">
          <span>创建用户、修改角色、注册客户端会在弹窗内保存。</span>
          <span>禁用、删除、重置密钥、重置密码等敏感操作需要二次确认。</span>
          <span>审计日志必须记录操作人、操作类型、对象、时间、IP、User-Agent、结果和失败原因。</span>
        </div>
      </section>
    </section>
  );
}
