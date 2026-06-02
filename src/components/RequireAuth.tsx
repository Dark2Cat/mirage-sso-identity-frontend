import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface RequireAuthProps {
  children: JSX.Element;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const authReady = useAuthStore((state) => state.authReady);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (!authReady) {
    return (
      <section className="page-stack">
        <div className="security-warning success">
          <span>正在恢复登录状态...</span>
        </div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ redirectTo: location.pathname }} to="/login" />;
  }

  return children;
}
