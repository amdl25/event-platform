import { useState, useRef, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { FiBell, FiCalendar, FiCreditCard, FiLogOut, FiSearch, FiSettings, FiTrendingUp, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import '../styles/OrganizerDashboard.css';

const navItems = [
  { to: '/organizer/events', label: 'Evenimentele mele', icon: FiCalendar },
  { to: '/organizer/analytics', label: 'Statistici Evenimente', icon: FiTrendingUp },
  { to: '/organizer/billing', label: 'Abonament', icon: FiCreditCard },
  { to: '/organizer/settings', label: 'Setări', icon: FiSettings },
];

const formatRelativeTime = (dateString) => {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Acum';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}z`;
};

const OrganizerShell = ({
  user,
  handleLogout,
  title,
  subtitle,
  actions,
  children,
  notifications = [],
  onBellClick,
  searchValue = '',
  onSearchChange
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const initials = user?.firstName
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : 'OR';

  const handleBellClick = () => {
    const next = !dropdownOpen;
    setDropdownOpen(next);
    if (next) onBellClick?.();
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            <input
              type="text"
              placeholder="Caută evenimente..."
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />
          </div>

          <div className="organizer-topbar-right">
            <div className="organizer-notif-wrapper" ref={dropdownRef}>
              <button
                type="button"
                className="organizer-notification-button"
                aria-label="Notificări"
                onClick={handleBellClick}
              >
                <FiBell />
                {unreadCount > 0 ? <span>{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
              </button>

              {dropdownOpen ? (
                <div className="organizer-notif-dropdown">
                  <div className="organizer-notif-header">
                    <strong>Notificări</strong>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="organizer-notif-empty">Nicio notificare momentan.</p>
                  ) : (
                    <ul className="organizer-notif-list">
                      {notifications.map((n) => (
                        <li key={n.id} className={`organizer-notif-item${n.read ? ' read' : ''}`}>
                          <span className="organizer-notif-icon">
                            {n.type === 'verification_approved' ? <FiCheckCircle color="#22c55e" /> : <FiXCircle color="#ef4444" />}
                          </span>
                          <div className="organizer-notif-body">
                            <p>{n.message}</p>
                            <time>{formatRelativeTime(n.createdAt)}</time>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>

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
