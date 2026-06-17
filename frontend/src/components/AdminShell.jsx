import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FiBell, FiGrid, FiList, FiLogOut, FiMenu, FiShield, FiSettings, FiUsers } from 'react-icons/fi';
import '../styles/AdminPanel.css';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: FiGrid },
  { to: '/admin/verification-queue', label: 'Cereri Firme', icon: FiShield },
  { to: '/admin/organizations', label: 'Organizatori', icon: FiList },
  { to: '/admin/participants', label: 'Participanți', icon: FiUsers },
  { to: '/admin/events', label: 'Evenimente', icon: FiMenu },
  { to: '/admin/settings', label: 'Setări', icon: FiSettings }
];

const formatRelativeTime = (dateString) => {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Acum';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}z`;
};

const AdminShell = ({ handleLogout, title, subtitle, children, actions = null, notificationsCount = 0, notifications = [] }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const count = notifications.length > 0 ? notifications.length : notificationsCount;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotifClick = (notif) => {
    setDropdownOpen(false);
    if (notif.type === 'organization') navigate('/admin/verification-queue');
    else if (notif.type === 'event') navigate('/admin/events');
  };

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
            <div className="admin-notif-wrapper" ref={dropdownRef}>
              <button
                type="button"
                className="admin-notification-button"
                aria-label="Notificări"
                onClick={() => setDropdownOpen((prev) => !prev)}
              >
                <FiBell />
                {count > 0 ? <span>{count > 9 ? '9+' : count}</span> : null}
              </button>

              {dropdownOpen ? (
                <div className="admin-notif-dropdown">
                  <div className="admin-notif-header">
                    <strong>Notificări</strong>
                  </div>
                  {notifications.length === 0 && count === 0 ? (
                    <p className="admin-notif-empty">Nicio notificare momentan.</p>
                  ) : notifications.length === 0 ? (
                    <p className="admin-notif-empty">Navighează la pagina relevantă pentru detalii.</p>
                  ) : (
                    <ul className="admin-notif-list">
                      {notifications.map((notif) => (
                        <li key={notif.id} className="admin-notif-item admin-notif-item-clickable" onClick={() => handleNotifClick(notif)}>
                          <span className="admin-notif-icon">
                            <FiShield color="#f59e0b" />
                          </span>
                          <div className="admin-notif-body">
                            <strong>{notif.title}</strong>
                            <p>{notif.message}</p>
                            <time>{formatRelativeTime(notif.createdAt)}</time>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
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
