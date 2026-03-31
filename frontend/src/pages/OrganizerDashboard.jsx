import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FiCalendar, FiEye, FiUsers, FiTrendingUp, FiMapPin, FiClock, FiGrid, FiSettings, FiBell } from 'react-icons/fi';
import API from '../api';
import '../styles/OrganizerDashboard.css';

const statusLabel = (event) => {
  const now = new Date();
  const start = event.start_date ? new Date(event.start_date) : null;
  const end = event.end_date ? new Date(event.end_date) : null;

  if (end && end < now) return { text: 'Încheiat', className: 'ended' };
  if ((event.current_occupancy || 0) === 0 && start && start > now) return { text: 'Draft', className: 'draft' };
  return { text: 'Publicat', className: 'published' };
};

const OrganizerDashboard = ({ user, handleLogout }) => {
  const statusLabels = {
    unverified: 'Neverificat',
    pending: 'În așteptare',
    verified: 'Verificat',
    rejected: 'Respins'
  };

  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [organizerStatus, setOrganizerStatus] = useState(user?.organizerVerificationStatus || 'unverified');

  useEffect(() => {
    if (!user?.id) { navigate('/'); return; }
    if (user.role !== 'organizer') { navigate('/'); return; }

    const loadData = async () => {
      try {
        const [eventsRes, statusRes] = await Promise.all([
          API.get('/events'),
          API.get(`/auth/organizer/status/${user.id}`)
        ]);

        const organizerEvents = (eventsRes.data || []).filter((event) => {
          if (user.organizationId) return event.org_id === user.organizationId;
          return event.creator_id === user.id;
        });

        setEvents(organizerEvents);
        setOrganizerStatus(statusRes.data?.verificationStatus || user?.organizerVerificationStatus || 'unverified');
      } catch (error) {
        console.error('Eroare dashboard:', error);
      } finally { setLoading(false); }
    };
    loadData();
  }, [navigate, user]);

  const stats = useMemo(() => {
    const totalEvents = events.length;
    const publishedEvents = events.filter((event) => statusLabel(event).text === 'Publicat').length;
    const totalParticipants = events.reduce((sum, event) => sum + Number(event.current_occupancy || 0), 0);
    const capacityEvents = events.filter((event) => Number(event.max_capacity || 0) > 0);
    const totalCapacity = capacityEvents.reduce((sum, event) => sum + Number(event.max_capacity || 0), 0);
    const occupancyForRated = capacityEvents.reduce((sum, event) => sum + Number(event.current_occupancy || 0), 0);
    const enrollmentRate = totalCapacity > 0 ? Math.round((occupancyForRated / totalCapacity) * 100) : 0;

    return { totalEvents, publishedEvents, totalParticipants, enrollmentRate };
  }, [events]);

  if (loading) return <div className="organizer-loading">Se încarcă...</div>;

  return (
    <div className="organizer-shell">
      <aside className="organizer-sidebar">
        <div className="organizer-sidebar-header">
          <Link to="/organizer/dashboard" className="organizer-logo">
            <span className="organizer-logo-event">Event</span>
            <span className="organizer-logo-hub">Hub</span>
            <span className="organizer-logo-badge">ORGANIZER</span>
          </Link>
        </div>

        <nav className="organizer-nav">
          <NavLink to="/organizer/dashboard" className="organizer-nav-item">
            <FiGrid /> Dashboard
          </NavLink>
          <button className="organizer-nav-item muted" disabled><FiCalendar /> Evenimentele mele</button>
          <button className="organizer-nav-item muted" disabled><FiUsers /> Participanți</button>
          <NavLink to="/organizer/settings" className="organizer-nav-item">
            <FiSettings /> Setări
          </NavLink>
        </nav>

        <div className="organizer-summary-box">
          <label>SUMAR ACTIVITATE</label>
          <p>Evenimente <span>{stats.totalEvents}</span></p>
          <p>Active <span>{stats.publishedEvents}</span></p>
          <p>Participanți <span>{stats.totalParticipants}</span></p>
        </div>
      </aside>

      <main className="organizer-main">
        <header className="organizer-topbar">
          <div className="organizer-search">
             {organizerStatus !== 'verified' && (
               <>
                 <FiClock style={{marginRight: '8px', opacity: 0.5}} />
                 <span>Status: {statusLabels[organizerStatus]}</span>
               </>
             )}
          </div>
          <div className="organizer-topbar-right">
            <button 
                className="organizer-new-event-btn" 
                onClick={() => navigate('/create-event')}
                disabled={organizerStatus !== 'verified'}
            >
              + Eveniment nou
            </button>
            <div className="organizer-user-profile">
              <div className="user-avatar">OR</div>
              <span className="user-name">{user?.organizationName || 'Organizator'}</span>
            </div>
            <button className="organizer-logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <div className="organizer-content-scroll">
          {organizerStatus !== 'verified' && (
            <div className="organizer-status-banner-new" onClick={() => navigate('/organizer/settings')}>
              <p>
                {organizerStatus === 'pending'
                  ? '⏳ Cerere în curs de procesare. Datele tale sunt analizate de un administrator.'
                  : 'Cont neverificat. Completează profilul business pentru a publica evenimente.'}
              </p>
              <button>{organizerStatus === 'pending' ? 'Vezi status' : 'Click pentru verificare'}</button>
            </div>
          )}

          <section className="organizer-stat-grid">
            <div className="stat-card">
              <div className="stat-info">
                <label>TOTAL EVENIMENTE</label>
                <h3>{stats.totalEvents}</h3>
              </div>
              <div className="stat-icon"><FiCalendar /></div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <label>PUBLICATE</label>
                <h3 className="text-green">{stats.publishedEvents}</h3>
              </div>
              <div className="stat-icon icon-green"><FiEye /></div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <label>PARTICIPANȚI</label>
                <h3 className="text-blue">{stats.totalParticipants}</h3>
              </div>
              <div className="stat-icon icon-blue"><FiUsers /></div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <label>RATĂ ÎNSCRIERE</label>
                <h3 className="text-orange">{stats.enrollmentRate}%</h3>
              </div>
              <div className="stat-icon icon-orange"><FiTrendingUp /></div>
            </div>
          </section>

          <section className="organizer-panel">
            <div className="panel-header">
              <h2>Evenimentele mele</h2>
              <span>{events.length} evenimente</span>
            </div>

            <div className="events-table-wrapper">
              {events.length === 0 ? (
                <div className="organizer-empty">Nu ai evenimente încă. Creează primul eveniment nou.</div>
              ) : (
                events.map((event, index) => {
                  const progress = Number(event.max_capacity || 0) > 0
                    ? Math.min(100, Math.round((Number(event.current_occupancy || 0) / Number(event.max_capacity || 1)) * 100))
                    : 0;
                  const status = statusLabel(event);
                  return (
                    <article key={event.id} className="event-row-new">
                      <div className="event-info-cell">
                        <div className="event-icon-box"><FiCalendar /></div>
                        <div>
                          <h4>{event.title}</h4>
                          <span className={`status-tag ${status.className}`}>{status.text}</span>
                        </div>
                      </div>
                      
                      <div className="event-meta-cell">
                        <p><FiClock /> {new Date(event.start_date).toLocaleDateString('ro-RO')}</p>
                        <p className="sub"><FiMapPin /> {event.location || 'Locație'}</p>
                      </div>

                      <div className="event-progress-cell">
                         <p>Participanți: <strong>{event.current_occupancy || 0}/{event.max_capacity || '∞'}</strong></p>
                         <div className="progress-bg"><div className="progress-fill" style={{width: `${progress}%`}}></div></div>
                      </div>

                      <div className="event-price-cell">
                        {Number(event.price || 0) <= 0 ? 'Gratuit' : `${Number(event.price).toFixed(0)} RON`}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default OrganizerDashboard;