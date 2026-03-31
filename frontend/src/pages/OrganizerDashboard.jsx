import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FiCalendar, FiEye, FiUsers, FiTrendingUp, FiMapPin, FiClock, FiGrid, FiSettings, FiBell, FiImage } from 'react-icons/fi';
import API from '../api';
import '../styles/OrganizerDashboard.css';

const toLocalDateInput = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const toLocalTimeInput = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(11, 16);
};

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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [eventFormError, setEventFormError] = useState('');
  const [eventImagePreview, setEventImagePreview] = useState('');
  const [eventImageName, setEventImageName] = useState('');
  const [eventForm, setEventForm] = useState(() => {
    const now = new Date();
    const inTwoHours = new Date(now.getTime() + (2 * 60 * 60 * 1000));

    return {
      title: '',
      description: '',
      location: '',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      maxCapacity: 50,
      price: 0,
      pointsValue: 0,
      categoryId: ''
    };
  });

  useEffect(() => {
    if (!user?.id) { navigate('/'); return; }
    if (user.role !== 'organizer') { navigate('/'); return; }

    const loadData = async () => {
      try {
        const [eventsRes, statusRes, categoriesRes] = await Promise.all([
          API.get('/events'),
          API.get(`/auth/organizer/status/${user.id}`),
          API.get('/categories')
        ]);

        const organizerEvents = (eventsRes.data || []).filter((event) => {
          if (user.organizationId) return event.org_id === user.organizationId;
          return event.creator_id === user.id;
        });

        setEvents(organizerEvents);
        setOrganizerStatus(statusRes.data?.verificationStatus || user?.organizerVerificationStatus || 'unverified');
        const categoryList = categoriesRes.data || [];
        setCategories(categoryList);
        if (categoryList.length > 0) {
          setEventForm((prev) => ({
            ...prev,
            categoryId: prev.categoryId || categoryList[0].id
          }));
        }
      } catch (error) {
        console.error('Eroare dashboard:', error);
      } finally { setLoading(false); }
    };
    loadData();
  }, [navigate, user]);

  const handleCreateFormChange = (field, value) => {
    setEventForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpenCreateModal = () => {
    if (organizerStatus !== 'verified') {
      return;
    }
    setEventFormError('');
    setShowCreateModal(true);
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setEventImageName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setEventImagePreview(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsDataURL(file);
  };

  const handleCreateEvent = async (event) => {
    event.preventDefault();
    setEventFormError('');

    if (!eventForm.title.trim() || !eventForm.location.trim()) {
      setEventFormError('Titlul și locația sunt obligatorii.');
      return;
    }

    const startDateTime = new Date(`${eventForm.startDate}T${eventForm.startTime}`);
    const endDateTime = new Date(`${eventForm.endDate}T${eventForm.endTime}`);

    if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
      setEventFormError('Completează corect data și ora evenimentului.');
      return;
    }

    if (endDateTime <= startDateTime) {
      setEventFormError('Data/ora de final trebuie să fie după start.');
      return;
    }

    try {
      setIsSubmittingEvent(true);
      const response = await API.post('/events', {
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || null,
        location: eventForm.location.trim(),
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        max_capacity: Number(eventForm.maxCapacity || 0),
        price: Number(eventForm.price || 0),
        points_value: Number(eventForm.pointsValue || 0),
        org_id: user?.organizationId,
        category_id: eventForm.categoryId || null
      });

      const createdEvent = response.data;
      if (createdEvent?.id) {
        setEvents((prev) => [createdEvent, ...prev]);
      }

      setShowCreateModal(false);
      setEventForm((prev) => ({
        ...prev,
        title: '',
        description: '',
        location: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        price: 0,
        pointsValue: 0
      }));
      setEventImagePreview('');
      setEventImageName('');
    } catch (error) {
      setEventFormError(error.response?.data?.message || 'Nu am putut crea evenimentul.');
    } finally {
      setIsSubmittingEvent(false);
    }
  };

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
              onClick={handleOpenCreateModal}
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

      {showCreateModal ? (
        <div className="organizer-create-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="organizer-create-modal" onClick={(event) => event.stopPropagation()}>
            <div className="organizer-create-modal-header">
              <h3>Eveniment nou</h3>
              <button type="button" className="organizer-create-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <form className="organizer-create-form" onSubmit={handleCreateEvent}>
              <div className="organizer-create-modal-body">
                {eventFormError ? <div className="organizer-create-error">{eventFormError}</div> : null}

                <div className="organizer-create-field">
                  <label>Imagine eveniment</label>
                  <label className="organizer-image-upload-box">
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageSelect} hidden />
                    {eventImagePreview ? (
                      <img src={eventImagePreview} alt="Preview eveniment" className="organizer-image-preview" />
                    ) : (
                      <div className="organizer-image-placeholder">
                        <FiImage />
                        <p>Click pentru a adăuga o imagine</p>
                        <span>JPG, PNG, max 5MB</span>
                      </div>
                    )}
                  </label>
                  {eventImageName ? <small className="organizer-image-name">{eventImageName}</small> : null}
                </div>

                <div className="organizer-create-field">
                  <label>Titlu eveniment</label>
                  <input type="text" value={eventForm.title} onChange={(event) => handleCreateFormChange('title', event.target.value)} placeholder="ex: Tech Meetup Bucharest" required />
                </div>

                <div className="organizer-create-field">
                  <label>Descriere</label>
                  <textarea value={eventForm.description} onChange={(event) => handleCreateFormChange('description', event.target.value)} rows={3} placeholder="Descrie evenimentul tău..." />
                </div>

                <div className="organizer-create-field">
                  <label>Locație</label>
                  <input type="text" value={eventForm.location} onChange={(event) => handleCreateFormChange('location', event.target.value)} placeholder="ex: Hub-ul Digital, Str. Lipscani 45" required />
                </div>

                <div className="organizer-create-datetime-block">
                  <label className="organizer-create-section-title">Data si ora *</label>
                  <div className="organizer-create-datetime-grid">
                    <div className="organizer-create-datetime-col">
                      <span className="organizer-create-datetime-label">Început</span>
                      <input type="date" value={eventForm.startDate} onChange={(event) => handleCreateFormChange('startDate', event.target.value)} required />
                      <input type="time" value={eventForm.startTime} onChange={(event) => handleCreateFormChange('startTime', event.target.value)} required />
                    </div>

                    <div className="organizer-create-datetime-col">
                      <span className="organizer-create-datetime-label">Sfârșit</span>
                      <input type="date" value={eventForm.endDate} onChange={(event) => handleCreateFormChange('endDate', event.target.value)} required />
                      <input type="time" value={eventForm.endTime} onChange={(event) => handleCreateFormChange('endTime', event.target.value)} required />
                    </div>
                  </div>
                </div>

                <div className="organizer-create-grid-3">
                  <div className="organizer-create-field">
                    <label>Capacitate</label>
                    <input type="number" min="1" value={eventForm.maxCapacity} onChange={(event) => handleCreateFormChange('maxCapacity', event.target.value)} required />
                  </div>

                  <div className="organizer-create-field">
                    <label>Preț (RON)</label>
                    <input type="number" min="0" step="0.01" value={eventForm.price} onChange={(event) => handleCreateFormChange('price', event.target.value)} required />
                  </div>

                  <div className="organizer-create-field">
                    <label>Puncte</label>
                    <input type="number" min="0" value={eventForm.pointsValue} onChange={(event) => handleCreateFormChange('pointsValue', event.target.value)} />
                  </div>
                </div>

                <div className="organizer-create-field">
                  <label>Categorie</label>
                  <select value={eventForm.categoryId} onChange={(event) => handleCreateFormChange('categoryId', event.target.value)} required>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="organizer-create-modal-footer">
                <button type="button" className="organizer-create-cancel" onClick={() => setShowCreateModal(false)}>Anulează</button>
                <button type="submit" className="organizer-create-submit" disabled={isSubmittingEvent || categories.length === 0}>
                  {isSubmittingEvent ? 'Se creează...' : 'Creează eveniment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default OrganizerDashboard;