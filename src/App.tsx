import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { RequireAuth } from './components/RequireAuth';
import { AdminPage } from './pages/AdminPage';
import { AuditPage } from './pages/AuditPage';
import { ClientsPage } from './pages/ClientsPage';
import { ConsentPage } from './pages/ConsentPage';
import { LoginPage } from './pages/LoginPage';
import { OrganizationsPage } from './pages/OrganizationsPage';
import { PermissionsPage } from './pages/PermissionsPage';
import { PortalPage } from './pages/PortalPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { RolesPage } from './pages/RolesPage';
import { UsersPage } from './pages/UsersPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="/portal" replace />} />
        <Route path="portal" element={<PortalPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="oauth/consent" element={<RequireAuth><ConsentPage /></RequireAuth>} />
        <Route path="profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
        <Route path="admin/users" element={<RequireAuth><UsersPage /></RequireAuth>} />
        <Route path="admin/roles" element={<RequireAuth><RolesPage /></RequireAuth>} />
        <Route path="admin/organizations" element={<RequireAuth><OrganizationsPage /></RequireAuth>} />
        <Route path="admin/permissions" element={<RequireAuth><PermissionsPage /></RequireAuth>} />
        <Route path="admin/clients" element={<RequireAuth><ClientsPage /></RequireAuth>} />
        <Route path="admin/audit-logs" element={<RequireAuth><AuditPage /></RequireAuth>} />
      </Route>
    </Routes>
  );
}
