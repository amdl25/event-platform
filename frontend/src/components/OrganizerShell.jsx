import { Link, NavLink } from 'react-router-dom';
import { FiBell, FiCalendar, FiLogOut, FiSearch, FiSettings, FiUsers } from 'react-icons/fi';
import '../styles/OrganizerDashboard.css';

const navItems = [
  { to: '/organizer/events', label: 'Evenimentele mele', icon: FiCalendar },
  { to: '/organizer/participants', label: 'Participanți', icon: FiUsers },
  { to: '/organizer/settings', label: 'Setări', icon: FiSettings }
];

const OrganizerShell = ({ user, handleLogout, title, subtitle, actions, children, notificationsCount = 0 }) => {
  const initials = user?.firstName
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : 'OR';

  return (
    <div className="organizer-shell">
      <aside className="organizer-sidebar">
        <Link to="/organizer/events" className="organizer-logo">
          <span className="organizer-logo-event">Event</span>
          <span className="organizer-logo-hub">Hub</span>
          <span className="organizer-logo-badge">ORGANIZER</span>
        </Link>

        <nav className="organizer-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `organizer-nav-item${isActive ? ' active' : ''}`}>
                <Icon />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="organizer-sidebar-footer">
          <div className="organizer-sidebar-account">
            <div className="organizer-sidebar-account-label">Cont</div>
            <Link to="/profile" className="organizer-sidebar-account-link">
              Profilul meu
            </Link>
          </div>
          <button type="button" className="organizer-sidebar-logout" onClick={handleLogout}>
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="organizer-main">
        <header className="organizer-topbar">
          <div className="organizer-search">
            <FiSearch className="organizer-search-icon" />
            <input type="text" placeholder="Caută evenimente, participanți..." />
          </div>

          <div className="organizer-topbar-right">
            <button type="button" className="organizer-notification-button" aria-label="Notificări">
              <FiBell />
              {notificationsCount > 0 ? <span>{notificationsCount > 9 ? '9+' : notificationsCount}</span> : null}
            </button>
            <div className="organizer-user-profile">
              <div className="user-avatar">{initials}</div>
              <span className="user-name">{user?.organizationName || user?.companyName || 'Organizator'}</span>
            </div>
          </div>
        </header>

        <section className="organizer-content-scroll">
          <div className="organizer-page-header">
            <div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            {actions ? <div className="organizer-page-actions">{actions}</div> : null}
          </div>
          {children}
        </section>
      </main>
    </div>
  );
};

export default OrganizerShell;
