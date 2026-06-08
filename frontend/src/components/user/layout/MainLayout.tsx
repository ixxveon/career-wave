import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import './MainLayout.css';

function MainLayout() {
  return (
    <>
      <div className="cw-app-layout">
        <Header />
        <main className="cw-app-main">
          <Outlet />
        </main>
      </div>
      <Footer />
    </>
  );
}

export default MainLayout;
