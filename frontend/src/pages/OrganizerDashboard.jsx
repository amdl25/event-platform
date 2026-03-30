import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FiCalendar, FiEye, FiUsers, FiTrendingUp, FiMapPin, FiClock, FiGrid, FiSettings } from 'react-icons/fi';
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
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [organizerStatus, setOrganizerStatus] = useState(user?.organizerVerificationStatus || 'unverified');

  useEffect(() => {
    if (!user?.id) {
      navigate('/login');
      return;
    }

    if (user.role !== 'organizer') {
      navigate('/');
      return;
    }

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
        console.error('Nu am putut încărca datele organizer dashboard:', error);
      } finally {
        setLoading(false);
      }
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

    return {
      totalEvents,
      publishedEvents,
      totalParticipants,
      enrollmentRate
    };
  }, [events]);

  if (loading) {
    return <div className="organizer-loading">Se încarcă Organizer Hub...</div>;
  }

  return (
    <div className="organizer-shell">
      <header className="organizer-topbar">
        <Link to="/organizer/dashboard" className="organizer-logo" aria-label="EventHub Organizer Dashboard">
          <span className="organizer-logo-event">Event</span>
          <span className="organizer-logo-hub">Hub</span>
          <span className="organizer-logo-badge">Organizer</span>
        </Link>
        <div className="organizer-topbar-right">
          <div className="organizer-company">{user?.organizationName || `${user?.firstName || ''} ${user?.lastName || ''}`}</div>
          <button
            type="button"
            className="organizer-new-event-btn"
            onClick={() => navigate('/create-event')}
            disabled={organizerStatus !== 'verified'}
            title={organizerStatus !== 'verified' ? 'Completează profilul business pentru verificare înainte de publicare.' : ''}
          >
            + Eveniment nou
          </button>
          <button type="button" className="organizer-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="organizer-body">
        <aside className="organizer-sidebar">
          <nav className="organizer-nav">
            <NavLink to="/organizer/dashboard" className="organizer-nav-item">
              <FiGrid />
              Dashboard
            </NavLink>
            <button type="button" className="organizer-nav-item muted" disabled>
              <FiCalendar />
              Evenimentele mele
            </button>
            <button type="button" className="organizer-nav-item muted" disabled>
              <FiUsers />
              Participanți
            </button>
            <NavLink to="/organizer/settings" className="organizer-nav-item">
              <FiSettings />
              Setări
            </NavLink>
          </nav>

          <div className="organizer-summary-box">
            <h4>Sumar</h4>
            <p>Evenimente <strong>{stats.totalEvents}</strong></p>
            <p>Active <strong>{stats.publishedEvents}</strong></p>
            <p>Participanți <strong>{stats.totalParticipants}</strong></p>
          </div>
        </aside>

        <main className="organizer-content">
          {organizerStatus !== 'verified' ? (
            <button
              type="button"
              className="organizer-status-banner organizer-status-banner-action"
              onClick={() => navigate('/organizer/settings')}
            >
              {organizerStatus === 'pending'
                ? '⏳ Cerere în curs de procesare. Datele tale sunt analizate de un administrator. Vei putea publica evenimente imediat după aprobare.'
                : 'Cont neverificat. Completează profilul business pentru a trimite cererea spre aprobare.'}
              <span>{organizerStatus === 'pending' ? 'Vezi status' : 'Click pentru verificare'}</span>
            </button>
          ) : null}

          <div className="organizer-stat-grid">
            <article className="organizer-stat-card">
              <FiCalendar />
              <h3>{stats.totalEvents}</h3>
              <p>Total evenimente</p>
            </article>
            <article className="organizer-stat-card">
              <FiEye />
              <h3>{stats.publishedEvents}</h3>
              <p>Publicate</p>
            </article>
            <article className="organizer-stat-card">
              <FiUsers />
              <h3>{stats.totalParticipants}</h3>
              <p>Participanți</p>
            </article>
            <article className="organizer-stat-card">
              <FiTrendingUp />
              <h3>{stats.enrollmentRate}%</h3>
              <p>Rată înscriere</p>
            </article>
          </div>

          <div className="organizer-events-header">
            <h2>Evenimentele mele</h2>
            <span>{events.length} evenimente</span>
          </div>

          <div className="organizer-events-list">
            {events.length === 0 ? (
              <div className="organizer-empty">Nu ai evenimente încă. Creează primul eveniment nou.</div>
            ) : (
              events.map((event, index) => {
                const progress = Number(event.max_capacity || 0) > 0
                  ? Math.min(100, Math.round((Number(event.current_occupancy || 0) / Number(event.max_capacity || 1)) * 100))
                  : 0;
                const status = statusLabel(event);
                const colorClass = ['blue', 'orange', 'purple', 'green'][index % 4];

                return (
                  <article key={event.id} className="organizer-event-row">
                    <div className={`event-accent ${colorClass}`}></div>
                    <div className="event-main">
                      <div className="event-title-row">
                        <h3>{event.title}</h3>
                        <span className={`event-status ${status.className}`}>{status.text}</span>
                      </div>
                      <div className="event-meta-row">
                        <span><FiClock /> {new Date(event.start_date).toLocaleDateString('ro-RO')} • {new Date(event.start_date).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span><FiMapPin /> {event.location || 'Locație nespecificată'}</span>
                      </div>
                    </div>

                    <div className="event-participants">
                      <p>Participanți</p>
                      <div className="participants-bar">
                        <span style={{ width: `${progress}%` }}></span>
                      </div>
                      <strong>
                        {Number(event.current_occupancy || 0)}
                        {Number(event.max_capacity || 0) > 0 ? `/${Number(event.max_capacity)}` : ''}
                      </strong>
                    </div>

                    <div className="event-price">
                      {Number(event.price || 0) <= 0 ? 'Gratuit' : `${Number(event.price).toFixed(0)} RON`}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default OrganizerDashboard;
