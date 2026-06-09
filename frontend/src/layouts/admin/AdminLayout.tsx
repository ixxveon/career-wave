import { Navigate, Outlet } from 'react-router-dom';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { adminSession } from '../../api/admin/adminAuthApi';
import '../../styles/admin/admin.css';

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
