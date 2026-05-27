import { Link, NavLink } from 'react-router-dom';
import { FiBell, FiGrid, FiList, FiLogOut, FiMenu, FiPieChart, FiShield, FiSettings, FiUsers } from 'react-icons/fi';
import '../styles/AdminPanel.css';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: FiGrid },
  { to: '/admin/verification-queue', label: 'Cereri Firme', icon: FiShield },
  { to: '/admin/organizations', label: 'Organizatori', icon: FiList },
  { to: '/admin/participants', label: 'Participanți', icon: FiUsers },
  { to: '/admin/events', label: 'Evenimente', icon: FiMenu },
  { to: '/admin/reports', label: 'Rapoarte', icon: FiPieChart },
  { to: '/admin/settings', label: 'Setări', icon: FiSettings }
];

const AdminShell = ({ handleLogout, title, subtitle, children, actions = null, notificationsCount = 0 }) => {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link to="/admin/dashboard" className="admin-brand">
          <span className="admin-brand-event">Event</span>
          <span className="admin-brand-hub">Hub</span>
          <span className="admin-brand-badge">ADMIN</span>
        </Link>

        <nav className="admin-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}>
                <Icon />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <button type="button" className="admin-sidebar-logout" onClick={handleLogout}>
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-search">
            <FiList className="admin-search-icon" />
            <input type="text" placeholder="Caută în baza de date..." />
          </div>

          <div className="admin-topbar-right">
            <button type="button" className="admin-notification-button" aria-label="Notificări">
              <FiBell />
              {notificationsCount > 0 ? <span>{notificationsCount > 9 ? '9+' : notificationsCount}</span> : null}
            </button>
          </div>
        </header>

        <section className="admin-content">
          <div className="admin-page-header">
            <div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            {actions ? <div className="admin-page-actions">{actions}</div> : null}
          </div>
          {children}
        </section>
      </main>
    </div>
  );
};

export default AdminShell;
