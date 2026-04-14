import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiClock, FiDollarSign, FiEdit2, FiEye, FiImage, FiMapPin, FiPlus, FiShoppingBag, FiTrash2, FiTrendingUp } from 'react-icons/fi';
import API from '../api';
import OrganizerShell from '../components/OrganizerShell';
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
  const end = event.end_date ? new Date(event.end_date) : null;

  if (end && end < now) return { text: 'Încheiat', className: 'ended' };
  if (event.moderation_status === 'hidden') {
    return { text: 'Draft', className: 'draft' };
  }
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
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [organizerStatus, setOrganizerStatus] = useState(user?.organizerVerificationStatus || 'unverified');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [eventFormError, setEventFormError] = useState('');
  const [eventImagePreview, setEventImagePreview] = useState('');
  const [eventImageName, setEventImageName] = useState('');
  const [editingEventId, setEditingEventId] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [overviewStats, setOverviewStats] = useState({
    totalRevenue: 0,
    soldTickets: 0,
    activeEvents: 0
  });
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
        const [eventsRes, statusRes, categoriesRes, dashboardRes] = await Promise.all([
          API.get('/events'),
          API.get(`/auth/organizer/status/${user.id}`),
          API.get('/categories'),
          API.get('/organizer/dashboard')
        ]);

        const organizerEvents = (eventsRes.data || []).filter((event) => {
          if (user.organizationId) return event.org_id === user.organizationId;
          return event.creator_id === user.id;
        });

        setEvents(organizerEvents);
        setOrganizerStatus(statusRes.data?.verificationStatus || user?.organizerVerificationStatus || 'unverified');
        setOverviewStats({
          totalRevenue: Number(dashboardRes.data?.stats?.totalRevenue || 0),
          soldTickets: Number(dashboardRes.data?.stats?.soldTickets || 0),
          activeEvents: Number(dashboardRes.data?.stats?.activeEvents || 0)
        });
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const editEventId = params.get('editEvent');
    if (!editEventId) return;

    const loadEventForEditing = async () => {
      try {
        const response = await API.get(`/events/${editEventId}`);
        const eventToEdit = response.data;
        if (!eventToEdit) return;

        const startDate = eventToEdit.start_date ? toLocalDateInput(new Date(eventToEdit.start_date)) : '';
        const startTime = eventToEdit.start_date ? toLocalTimeInput(new Date(eventToEdit.start_date)) : '';
        const endDate = eventToEdit.end_date ? toLocalDateInput(new Date(eventToEdit.end_date)) : '';
        const endTime = eventToEdit.end_date ? toLocalTimeInput(new Date(eventToEdit.end_date)) : '';

        setEditingEventId(eventToEdit.id);
        setEventForm({
          title: eventToEdit.title || '',
          description: eventToEdit.description || '',
          location: eventToEdit.location || '',
          startDate,
          startTime,
          endDate,
          endTime,
          maxCapacity: Number(eventToEdit.max_capacity || 50),
          price: Number(eventToEdit.price || 0),
          pointsValue: Number(eventToEdit.points_value || 0),
          categoryId: eventToEdit.categories?.[0]?.id || categories[0]?.id || ''
        });
        setEventImagePreview(eventToEdit.image_url || '');
        setEventImageName('');
        setEventFormError('');
        setShowCreateModal(true);
      } catch (error) {
        console.error('Eroare la încărcarea evenimentului pentru editare:', error);
      }
    };

    loadEventForEditing();
  }, [categories, location.search]);

  const handleCreateFormChange = (field, value) => {
    setEventForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpenCreateModal = () => {
    if (organizerStatus !== 'verified') {
      return;
    }
    setEventFormError('');
    setEditingEventId('');
    setEventForm((prev) => ({
      ...prev,
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
      categoryId: categories[0]?.id || ''
    }));
    setEventImagePreview('');
    setEventImageName('');
    setShowCreateModal(true);
  };

  const handleViewEvent = (eventId) => {
    navigate(`/event/${eventId}`);
  };

  const handleEditEvent = (eventId) => {
    navigate(`/organizer/events?editEvent=${eventId}`);
  };

  const handleDeleteEvent = async (event) => {
    const confirmed = window.confirm(`Sigur vrei să ștergi evenimentul "${event.title}"?`);
    if (!confirmed) return;

    try {
      await API.delete(`/events/${event.id}`);
      setEvents((prev) => prev.filter((item) => item.id !== event.id));
    } catch (error) {
      setEventFormError(error.response?.data?.message || 'Nu am putut șterge evenimentul.');
    }
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

  const handleCreateEvent = async (event, targetStatus = 'published') => {
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
      const payload = {
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || null,
        location: eventForm.location.trim(),
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        max_capacity: Number(eventForm.maxCapacity || 0),
        price: Number(eventForm.price || 0),
        points_value: Number(eventForm.pointsValue || 0),
        moderation_status: targetStatus,
        org_id: user?.organizationId,
        category_id: eventForm.categoryId || null
      };

      const response = editingEventId
        ? await API.patch(`/events/${editingEventId}`, payload)
        : await API.post('/events', payload);

      const createdEvent = response.data;
      if (createdEvent?.id) {
        setEvents((prev) => {
          if (editingEventId) {
            return prev.map((item) => (item.id === createdEvent.id ? createdEvent : item));
          }
          return [createdEvent, ...prev];
        });
      }

      setShowCreateModal(false);
      setEditingEventId('');
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

  const totalEvents = useMemo(() => events.length, [events]);
  const formatMoney = (value) => `${Number(value || 0).toFixed(0)} RON`;

  const filteredEvents = useMemo(() => {
    if (activeTab === 'all') return events;
    if (activeTab === 'published') return events.filter((event) => statusLabel(event).text === 'Publicat');
    if (activeTab === 'draft') return events.filter((event) => statusLabel(event).text === 'Draft');
    if (activeTab === 'ended') return events.filter((event) => statusLabel(event).text === 'Încheiat');
    return events;
  }, [activeTab, events]);

  const emptyStateMessage = useMemo(() => {
    if (activeTab === 'published') return 'Nu ai evenimente publicate în acest moment.';
    if (activeTab === 'draft') return 'Nu ai drafturi salvate momentan.';
    if (activeTab === 'ended') return 'Nu ai evenimente încheiate.';
    return 'Nu ai evenimente încă. Creează primul eveniment nou.';
  }, [activeTab]);

  const actions = (
    <button
      className="organizer-primary-button organizer-primary-button-large"
      onClick={handleOpenCreateModal}
      disabled={organizerStatus !== 'verified'}
      type="button"
    >
      <FiPlus />
      <span>Eveniment nou</span>
    </button>
  );

  if (loading) {
    return <OrganizerShell user={user} handleLogout={handleLogout} title="Evenimentele mele" subtitle="Se încarcă..." actions={actions}><div className="organizer-card">Se încarcă...</div></OrganizerShell>;
  }

  return (
    <>
      <OrganizerShell user={user} handleLogout={handleLogout} title="Evenimentele mele" subtitle={`${totalEvents} evenimente total`} actions={actions}>
      <section className="organizer-stat-grid organizer-status-row" style={{ marginTop: 0 }}>
        <div className="organizer-stat-card compact">
          <div className="organizer-stat-info">
            <label>VENITURI</label>
            <h3>{formatMoney(overviewStats.totalRevenue)}</h3>
          </div>
          <div className="organizer-stat-icon icon-orange"><FiDollarSign /></div>
        </div>
        <div className="organizer-stat-card compact">
          <div className="organizer-stat-info">
            <label>BILETE VÂNDUTE</label>
            <h3 className="text-blue">{overviewStats.soldTickets}</h3>
          </div>
          <div className="organizer-stat-icon icon-blue"><FiShoppingBag /></div>
        </div>
        <div className="organizer-stat-card compact">
          <div className="organizer-stat-info">
            <label>EVENIMENTE ACTIVE</label>
            <h3 className="text-green">{overviewStats.activeEvents}</h3>
          </div>
          <div className="organizer-stat-icon icon-green"><FiTrendingUp /></div>
        </div>
      </section>

      <div className="organizer-events-toolbar">
        <div className="organizer-tabs">
          <button type="button" className={`organizer-tab${activeTab === 'all' ? ' active' : ''}`} onClick={() => setActiveTab('all')}>Toate</button>
          <button type="button" className={`organizer-tab${activeTab === 'published' ? ' active' : ''}`} onClick={() => setActiveTab('published')}>Publicate</button>
          <button type="button" className={`organizer-tab${activeTab === 'draft' ? ' active' : ''}`} onClick={() => setActiveTab('draft')}>Draft</button>
          <button type="button" className={`organizer-tab${activeTab === 'ended' ? ' active' : ''}`} onClick={() => setActiveTab('ended')}>Încheiate</button>
        </div>
      </div>

      <section className="organizer-events-panel">
        <div className="events-table-wrapper">
          {filteredEvents.length === 0 ? (
            <div className="organizer-empty">{emptyStateMessage}</div>
          ) : (
            filteredEvents.map((event) => {
              const progress = Number(event.max_capacity || 0) > 0
                ? Math.min(100, Math.round((Number(event.current_occupancy || 0) / Number(event.max_capacity || 1)) * 100))
                : 0;
              const status = statusLabel(event);
              return (
                <article key={event.id} className="event-row-new">
                  <div className={`event-accent ${status.className}`} />
                  <div className="event-info-cell">
                    <div className="event-info-main">
                      <div className="event-title-row">
                      <h4>{event.title}</h4>
                      <span className={`status-tag ${status.className}`}>{status.text}</span>
                    </div>
                      <div className="event-meta-line">
                        <p><FiClock /> {new Date(event.start_date).toLocaleDateString('ro-RO')}</p>
                        <p className="sub"><FiMapPin /> {event.location || 'Locație'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="event-progress-cell">
                    <p>Participanți: <strong>{event.current_occupancy || 0}/{event.max_capacity || '∞'}</strong></p>
                    <div className="progress-bg"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                  </div>

                  <div className="event-price-cell">
                    <span className={`event-price-value${Number(event.price || 0) <= 0 ? ' free' : ''}`}>
                      {Number(event.price || 0) <= 0 ? 'Gratuit' : `${Number(event.price).toFixed(0)} RON`}
                    </span>
                    <div className="event-actions-cell">
                      <button type="button" className="event-icon-action view" onClick={() => handleViewEvent(event.id)} title="Vizualizare" aria-label="Vizualizare">
                        <FiEye />
                      </button>
                      <button type="button" className="event-icon-action edit" onClick={() => handleEditEvent(event.id)} title="Modificare" aria-label="Modificare">
                        <FiEdit2 />
                      </button>
                      <button
                        type="button"
                        className="event-icon-action delete"
                        onClick={() => handleDeleteEvent(event)}
                        title="Ștergere"
                        aria-label="Ștergere"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
      </OrganizerShell>

      {showCreateModal ? (
        <div className="organizer-create-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="organizer-create-modal" onClick={(event) => event.stopPropagation()}>
            <div className="organizer-create-modal-header">
              <h3>{editingEventId ? 'Editează eveniment' : 'Eveniment nou'}</h3>
              <button type="button" className="organizer-create-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <form className="organizer-create-form" onSubmit={(event) => handleCreateEvent(event, 'published')}>
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
                <button
                  type="button"
                  className="organizer-create-draft"
                  onClick={(event) => handleCreateEvent(event, 'hidden')}
                  disabled={isSubmittingEvent || categories.length === 0}
                >
                  {isSubmittingEvent ? 'Se salvează...' : 'Salvează draft'}
                </button>
                <button type="submit" className="organizer-create-submit" disabled={isSubmittingEvent || categories.length === 0}>
                  {isSubmittingEvent ? (editingEventId ? 'Se salvează...' : 'Se creează...') : (editingEventId ? 'Publică modificările' : 'Publică evenimentul')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default OrganizerDashboard;