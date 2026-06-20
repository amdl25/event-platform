import React, { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiCheck, FiCopy, FiEdit2, FiLink, FiLock, FiMapPin, FiMoreHorizontal, FiPlus, FiRefreshCw, FiTrash2, FiUsers } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import EventDetailsModal from '../components/EventDetailsModal';
import '../styles/MyEventsPage.css';

const formatDateLabel = (startValue, endValue) => {
  const startDate = new Date(startValue);
  if (Number.isNaN(startDate.getTime())) return '';
  const dateLabel = startDate.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });
  const startTimeLabel = startDate.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  if (!endValue) return `${dateLabel}, ${startTimeLabel}`;
  const endDate = new Date(endValue);
  if (Number.isNaN(endDate.getTime()) || endDate.getTime() === startDate.getTime()) return `${dateLabel}, ${startTimeLabel}`;
  const endTimeLabel = endDate.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  return `${dateLabel}, ${startTimeLabel} – ${endTimeLabel}`;
};

const getDateParts = (dateValue) => {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return { day: '—', month: '—' };
  return {
    day: d.getDate(),
    month: d.toLocaleDateString('ro-RO', { month: 'short' }).replace('.', '').toUpperCase()
  };
};

const MyEventsPage = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createdEvents, setCreatedEvents] = useState([]);
  const [invitedEvents, setInvitedEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('created');
  const [openMenuEventId, setOpenMenuEventId] = useState('');
  const [editingEvent, setEditingEvent] = useState(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [modalInitialMode, setModalInitialMode] = useState('edit');
  const [loadingEventId, setLoadingEventId] = useState('');
  const [regeneratingEventId, setRegeneratingEventId] = useState('');
  const [togglingGuestListEventId, setTogglingGuestListEventId] = useState('');
  const [copiedId, setCopiedId] = useState('');

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await API.get('/events/private/mine', { params: { userId: user?.id } });
      setCreatedEvents(response.data?.created || []);
      setInvitedEvents(response.data?.invited || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Nu am putut încărca evenimentele private.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) { navigate('/login'); return; }
    loadEvents();
  }, [navigate, user?.id]);

  const now = new Date();

  const activeCreatedEvents = useMemo(() =>
    createdEvents.filter((e) => new Date(e.start_date) > now),
    [createdEvents]
  );

  const activeInvitedEvents = useMemo(() =>
    invitedEvents.filter((e) => new Date(e.event?.start_date) > now),
    [invitedEvents]
  );

  const counts = useMemo(() => ({
    created: activeCreatedEvents.length,
    invited: activeInvitedEvents.length
  }), [activeCreatedEvents.length, activeInvitedEvents.length]);

  const copyInviteLink = async (eventId, inviteLink) => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedId(eventId);
      setTimeout(() => setCopiedId(''), 2000);
    } catch { }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await API.delete(`/events/private/${eventId}`);
      setCreatedEvents((prev) => prev.filter((item) => item.id !== eventId));
      setOpenMenuEventId('');
    } catch {
      setError('Nu am putut șterge evenimentul.');
    }
  };

  const loadEventForModal = async (eventId, mode = 'view') => {
    try {
      setLoadingEventId(eventId);
      setOpenMenuEventId('');
      const response = await API.get(`/events/${eventId}`);
      setEditingEvent(response.data);
      setModalInitialMode(mode);
      setIsEventModalOpen(true);
    } catch {
      setError('Nu am putut încărca evenimentul pentru editare.');
    } finally {
      setLoadingEventId('');
    }
  };

  const handleOpenEditModal = (eventId) => loadEventForModal(eventId, 'edit');
  const openEventFromCard = (eventId) => loadEventForModal(eventId, 'view');
  const stopProp = (e) => e.stopPropagation();

  const handleRegenerateInviteLink = async (eventId) => {
    try {
      setRegeneratingEventId(eventId);
      setOpenMenuEventId('');
      const response = await API.post(`/events/private/${eventId}/regenerate-link`);
      const newInviteLink = response.data?.inviteLink;
      const newInviteExpiresAt = response.data?.expiresAt || null;
      if (newInviteLink) {
        setCreatedEvents((prev) => prev.map((item) =>
          item.id === eventId ? { ...item, inviteLink: newInviteLink, inviteExpiresAt: newInviteExpiresAt } : item
        ));
      }
    } catch {
      setError('Nu am putut regenera linkul de invitație.');
    } finally {
      setRegeneratingEventId('');
    }
  };

  const handleToggleGuestListVisibility = async (eventId, currentValue) => {
    try {
      setTogglingGuestListEventId(eventId);
      setOpenMenuEventId('');
      const response = await API.patch(`/events/private/${eventId}/settings`, { show_guest_list: !currentValue });
      const updatedValue = Boolean(response.data?.showGuestList);
      setCreatedEvents((prev) => prev.map((item) =>
        item.id === eventId ? { ...item, showGuestList: updatedValue } : item
      ));
    } catch {
      setError('Nu am putut actualiza vizibilitatea listei de invitați.');
    } finally {
      setTogglingGuestListEventId('');
    }
  };

  const handleModalClose = () => { setIsEventModalOpen(false); setEditingEvent(null); };

  const handleEventSaved = (updatedEvent) => {
    setCreatedEvents((prev) => prev.map((item) => item.id === updatedEvent.id ? { ...item, ...updatedEvent } : item));
    setEditingEvent(updatedEvent);
  };

  const handleInviteAction = async (participationId, action) => {
    try {
      await API.patch(`/events/private/invitations/${participationId}`, { action });
      setInvitedEvents((prev) => prev.map((item) =>
        item.participationId !== participationId ? item : { ...item, inviteStatus: action === 'accept' ? 'accepted' : 'rejected' }
      ));
    } catch {
      setError('Nu am putut actualiza invitația.');
    }
  };

  if (loading) return <div className="mep-shell" aria-busy="true" />;

  return (
    <div className="mep-shell">
      <div className="mep-container">

        <header className="mep-header">
          <div>
            <h1 className="mep-title">Evenimentele mele</h1>
            <p className="mep-subtitle">Spații private pentru tine și oamenii care contează.</p>
          </div>
          <button type="button" className="mep-create-btn" onClick={() => navigate('/create-event')}>
            <FiPlus /> Eveniment nou
          </button>
        </header>

        <div className="mep-tabs">
          <button type="button" className={`mep-tab${activeTab === 'created' ? ' active' : ''}`} onClick={() => setActiveTab('created')}>
            Organizate <span className="mep-tab-count">{counts.created}</span>
          </button>
          <button type="button" className={`mep-tab${activeTab === 'invited' ? ' active' : ''}`} onClick={() => setActiveTab('invited')}>
            Invitații <span className="mep-tab-count">{counts.invited}</span>
          </button>
        </div>

        {error ? <div className="mep-error">{error}</div> : null}

        {activeTab === 'created' ? (
          <section>
            {activeCreatedEvents.length === 0 ? (
              <div className="mep-empty-state">
                <div className="mep-empty-icon"><FiLock /></div>
                <h3>Niciun eveniment organizat</h3>
                <p>Creează un eveniment privat și invită oamenii importanți pentru tine.</p>
                <button type="button" className="mep-create-btn" onClick={() => navigate('/create-event')}>
                  <FiPlus /> Creează eveniment
                </button>
              </div>
            ) : (
              <div className="mep-grid">
                {activeCreatedEvents.map((eventItem) => {
                  const isFuture = new Date(eventItem.start_date) > new Date();
                  const { day, month } = getDateParts(eventItem.start_date);
                  const isCopied = copiedId === eventItem.id;

                  return (
                    <article
                      key={eventItem.id}
                      className="mep-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => openEventFromCard(eventItem.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEventFromCard(eventItem.id); } }}
                    >
                      <div className="mep-card-visual">
                        {eventItem.image_url
                          ? <img src={eventItem.image_url} alt={eventItem.title} className="mep-card-img" />
                          : <div className="mep-card-no-img" />}
                        <div className="mep-card-img-scrim" />

                        <div className="mep-card-menu-wrap" onClick={stopProp}>
                          <button
                            type="button"
                            className="mep-menu-trigger"
                            onClick={(e) => { e.stopPropagation(); setOpenMenuEventId(openMenuEventId === eventItem.id ? '' : eventItem.id); }}
                            aria-label="Opțiuni"
                          >
                            <FiMoreHorizontal />
                          </button>
                          {openMenuEventId === eventItem.id ? (
                            <div className="mep-dropdown">
                              <button type="button" onClick={(e) => { e.stopPropagation(); handleOpenEditModal(eventItem.id); }} disabled={loadingEventId === eventItem.id}>
                                <FiEdit2 /> Editează
                              </button>
                              <button type="button" onClick={(e) => { e.stopPropagation(); handleRegenerateInviteLink(eventItem.id); }} disabled={regeneratingEventId === eventItem.id}>
                                <FiRefreshCw /> {regeneratingEventId === eventItem.id ? 'Se regenerează...' : 'Regenerează link'}
                              </button>
                              <button type="button" onClick={(e) => { e.stopPropagation(); handleToggleGuestListVisibility(eventItem.id, eventItem.showGuestList); }} disabled={togglingGuestListEventId === eventItem.id}>
                                <FiUsers /> {eventItem.showGuestList ? 'Ascunde lista' : 'Afișează lista'}
                              </button>
                              <button type="button" onClick={(e) => { e.stopPropagation(); copyInviteLink(eventItem.id, eventItem.inviteLink); }}>
                                <FiLink /> Copiază link
                              </button>
                              <button type="button" className="danger" onClick={(e) => { e.stopPropagation(); handleDeleteEvent(eventItem.id); }}>
                                <FiTrash2 /> Șterge
                              </button>
                            </div>
                          ) : null}
                        </div>

                        <div className="mep-card-visual-bar">
                          <div className="mep-date-chip">
                            <span className="mep-date-day">{day}</span>
                            <span className="mep-date-month">{month}</span>
                          </div>
                          <span className={`mep-status-chip${isFuture ? ' future' : ' past'}`}>
                            {isFuture ? 'Viitor' : 'Trecut'}
                          </span>
                        </div>
                      </div>

                      <div className="mep-card-content">
                        <h3 className="mep-card-title">{eventItem.title}</h3>
                        <div className="mep-card-meta">
                          {eventItem.location ? <span><FiMapPin />{eventItem.location}</span> : null}
                          <span><FiUsers />{eventItem.confirmedCount || 0} participanți</span>
                        </div>
                      </div>

                      <div className="mep-card-footer" onClick={stopProp}>
                        <button
                          type="button"
                          className={`mep-copy-link-btn${isCopied ? ' copied' : ''}`}
                          onClick={(e) => { e.stopPropagation(); copyInviteLink(eventItem.id, eventItem.inviteLink); }}
                        >
                          {isCopied ? <><FiCheck /> Copiat!</> : <><FiCopy /> Copiază linkul de invitație</>}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section>
            {activeInvitedEvents.length === 0 ? (
              <div className="mep-empty-state">
                <div className="mep-empty-icon"><FiUsers /></div>
                <h3>Nicio invitație</h3>
                <p>Când cineva te invită la un eveniment privat, îl vei găsi aici.</p>
              </div>
            ) : (
              <div className="mep-grid">
                {activeInvitedEvents.map((inviteItem) => {
                  const eventItem = inviteItem.event;
                  const { day, month } = getDateParts(eventItem.start_date);
                  const statusClass = inviteItem.inviteStatus === 'accepted' ? 'future' : inviteItem.inviteStatus === 'rejected' ? 'past' : 'pending';
                  const statusLabel = { accepted: 'Acceptat', rejected: 'Refuzat', pending: 'În așteptare' }[inviteItem.inviteStatus] || 'În așteptare';

                  return (
                    <article
                      key={inviteItem.participationId}
                      className="mep-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => openEventFromCard(eventItem.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEventFromCard(eventItem.id); } }}
                    >
                      <div className="mep-card-visual">
                        {eventItem.image_url
                          ? <img src={eventItem.image_url} alt={eventItem.title} className="mep-card-img" />
                          : <div className="mep-card-no-img invite" />}
                        <div className="mep-card-img-scrim" />

                        <div className="mep-card-visual-bar">
                          <div className="mep-date-chip">
                            <span className="mep-date-day">{day}</span>
                            <span className="mep-date-month">{month}</span>
                          </div>
                          <span className={`mep-status-chip ${statusClass}`}>{statusLabel}</span>
                        </div>
                      </div>

                      <div className="mep-card-content">
                        <h3 className="mep-card-title">{eventItem.title}</h3>
                        <p className="mep-host-name">de {eventItem.hostName}</p>
                        <div className="mep-card-meta">
                          <span><FiCalendar />{formatDateLabel(eventItem.start_date, eventItem.end_date)}</span>
                          {eventItem.location ? <span><FiMapPin />{eventItem.location}</span> : null}
                        </div>
                      </div>

                      {inviteItem.inviteStatus === 'pending' ? (
                        <div className="mep-invite-actions" onClick={stopProp}>
                          <button type="button" className="mep-accept-btn" onClick={(e) => { e.stopPropagation(); handleInviteAction(inviteItem.participationId, 'accept'); }}>
                            Acceptă
                          </button>
                          <button type="button" className="mep-decline-btn" onClick={(e) => { e.stopPropagation(); handleInviteAction(inviteItem.participationId, 'reject'); }}>
                            Refuză
                          </button>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      <EventDetailsModal
        isOpen={isEventModalOpen}
        event={editingEvent}
        onClose={handleModalClose}
        canEdit={Boolean(user?.id && editingEvent?.creator_id && user.id === editingEvent.creator_id)}
        initialMode={modalInitialMode}
        onSaved={handleEventSaved}
      />
    </div>
  );
};

export default MyEventsPage;
