import { useEffect } from 'react';
import { fetchCurrentUser } from '../api';
import { useAuthStore } from '../stores/authStore';

interface AuthBootstrapProps {
  children: JSX.Element;
}

export function AuthBootstrap({ children }: AuthBootstrapProps) {
  const setAuthReady = useAuthStore((state) => state.setAuthReady);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    let active = true;

    fetchCurrentUser()
      .then((currentUser) => {
        if (active) {
          setCurrentUser(currentUser);
        }
      })
      .catch(() => {
        if (active) {
          logout();
        }
      })
      .finally(() => {
        if (active) {
          setAuthReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, [logout, setAuthReady, setCurrentUser]);

  return children;
}
