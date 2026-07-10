import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import './MainLayout.css';

function MainLayout() {
  const { pathname } = useLocation();
  const hideFooter = pathname.startsWith('/interview');

  return (
    <>
      <Header />
      <div className="cw-app-layout">
        <main className="cw-app-main">
          <Outlet />
        </main>
      </div>
      {!hideFooter && <Footer />}
    </>
  );
}

export default MainLayout;
