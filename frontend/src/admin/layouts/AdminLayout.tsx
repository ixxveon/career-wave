import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import '../styles/admin.css';

export default function AdminLayout() {
  return (
    <div className="admin-root">
      <AdminSidebar />
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
