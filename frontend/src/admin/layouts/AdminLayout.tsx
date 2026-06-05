import { Navigate, Outlet } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import { adminSession } from '../api/adminAuthApi';
import '../styles/admin.css';

export default function AdminLayout() {
  if (!adminSession.getToken()) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="admin-root">
      <AdminSidebar />
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
