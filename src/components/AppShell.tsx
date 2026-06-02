import {
  Activity,
  AppWindow,
  Building2,
  ChevronRight,
  Fingerprint,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogIn,
  LogOut,
  Shield,
  UserRoundCog,
  UserPlus,
  UserRound,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { logout as logoutApi } from '../api';
import { useAuthStore } from '../stores/authStore';

const primaryNav = [
  { to: '/portal', label: '应用门户', icon: AppWindow },
  { to: '/login', label: '统一登录', icon: LogIn, guestOnly: true },
  { to: '/register', label: '用户注册', icon: UserPlus, guestOnly: true },
  { to: '/oauth/consent', label: '授权确认', icon: ListChecks, authOnly: true },
  { to: '/profile', label: '个人中心', icon: UserRound, authOnly: true },
];

const adminNav = [
  { to: '/admin', label: '控制台', icon: LayoutDashboard, permissions: ['sso:user:read', 'sso:user:manage', 'sso:role:manage', 'sso:client:manage', 'sso:audit:read'] },
  { to: '/admin/users', label: '用户管理', icon: UserRoundCog, permissions: ['sso:user:read', 'sso:user:manage'] },
  { to: '/admin/roles', label: '角色管理', icon: Shield, permissions: ['sso:role:manage'] },
  { to: '/admin/organizations', label: '组织管理', icon: Building2, permissions: ['sso:user:manage'] },
  { to: '/admin/permissions', label: '权限管理', icon: KeyRound, permissions: ['sso:role:manage'] },
  { to: '/admin/clients', label: '接入应用', icon: Shield, permissions: ['sso:client:manage'] },
  { to: '/admin/audit-logs', label: '审计日志', icon: Activity, permissions: ['sso:audit:read'] },
];

export function AppShell() {
  const navigate = useNavigate();
  const user = useAuthStore();
  const resetAuth = useAuthStore((state) => state.logout);
  const visibleAdminItems = adminNav.filter((item) =>
    canViewAdminItem(user.roles, user.permissions, item.permissions),
  );

  async function handleLogout() {
    try {
      await logoutApi();
    } finally {
      resetAuth();
      navigate('/login');
    }
  }

  return (
    <div className="app-frame">
      <aside className="side-rail" aria-label="主导航">
        <div className="brand-lockup">
          <div className="brand-mark">
            <Fingerprint size={26} strokeWidth={1.8} />
          </div>
          <div>
            <p>Mirage</p>
            <span>Identity Center</span>
          </div>
        </div>

        <nav className="nav-groups">
          <div className="nav-section">
            <span className="nav-kicker">Workspace</span>
            {primaryNav
              .filter((item) => !item.guestOnly || !user.isAuthenticated)
              .filter((item) => !item.authOnly || user.isAuthenticated)
              .map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
          </div>
          {user.isAuthenticated && visibleAdminItems.length > 0 ? (
            <div className="nav-section">
              <span className="nav-kicker">Administration</span>
              {visibleAdminItems.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          ) : null}
        </nav>

        <div className="identity-card">
          <button
            className="identity-profile-link"
            onClick={() => navigate(user.isAuthenticated ? '/profile' : '/login')}
            type="button"
          >
            <div className="identity-avatar">{avatarText(user.displayName)}</div>
            <div>
              <strong>{user.displayName}</strong>
              <span>{user.isAuthenticated ? `${user.role} · ${user.sessionLabel}` : '点击登录'}</span>
            </div>
          </button>
          {user.isAuthenticated ? (
            <button className="identity-action" onClick={handleLogout} title="退出登录" type="button">
              <LogOut size={16} />
            </button>
          ) : (
            <ChevronRight size={18} />
          )}
        </div>
      </aside>

      <main className="main-surface">
        <div className="ambient-grid" aria-hidden="true" />
        <Outlet />
      </main>
    </div>
  );
}

interface NavItemProps {
  to: string;
  label: string;
  icon: typeof Fingerprint;
  className?: string;
}

function NavItem({ to, label, icon: Icon, className = '' }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-item ${className} ${isActive ? 'active' : ''}`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  );
}

function avatarText(value: string) {
  if (!value || value === '访客') {
    return 'G';
  }
  return value
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function canViewAdminItem(roles: string[], permissions: string[], requiredPermissions: string[]) {
  if (roles.includes('ADMIN')) {
    return true;
  }
  return requiredPermissions.some((permission) => permissions.includes(permission));
}
