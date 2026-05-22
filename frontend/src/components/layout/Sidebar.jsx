import './Sidebar.css';

function Sidebar() {
  return (
    <aside className="cw-sidebar">
      <div className="cw-sidebar__brand">Career Wave</div>
      <nav className="cw-sidebar__nav">
        <a className="cw-sidebar__link" href="#">대시보드</a>
        <a className="cw-sidebar__link" href="#">채용 공고</a>
        <a className="cw-sidebar__link" href="#">커뮤니티</a>
      </nav>
    </aside>
  );
}

export default Sidebar;
