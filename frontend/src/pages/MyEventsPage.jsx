import React, { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiCopy, FiLink, FiLock, FiMapPin, FiMoreHorizontal, FiTrash2, FiUsers, FiEdit2, FiRefreshCw } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import EventDetailsModal from '../components/EventDetailsModal';
import '../styles/MyEventsPage.css';

const formatDateLabel = (startValue, endValue) => {
  const startDate = new Date(startValue);
  if (Number.isNaN(startDate.getTime())) return '';

  const dateLabel = startDate.toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const startTimeLabel = startDate.toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit'
  });

  if (!endValue) {
    return `${dateLabel}, ${startTimeLabel}`;
  }

  const endDate = new Date(endValue);
  if (Number.isNaN(endDate.getTime()) || endDate.getTime() === startDate.getTime()) {
    return `${dateLabel}, ${startTimeLabel}`;
  }

  const endTimeLabel = endDate.toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `${dateLabel}, ${startTimeLabel} - ${endTimeLabel}`;
};

const formatExpiryLabel = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
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

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await API.get('/events/private/mine');
      setCreatedEvents(response.data?.created || []);
      setInvitedEvents(response.data?.invited || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Nu am putut încărca evenimentele private.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      navigate('/login');
      return;
    }

    loadEvents();
  }, [navigate, user?.id]);

  const counts = useMemo(() => ({
    created: createdEvents.length,
    invited: invitedEvents.length
  }), [createdEvents.length, invitedEvents.length]);

  const copyInviteLink = async (inviteLink) => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
    } catch {
    }
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

  const handleOpenViewModal = (eventId) => loadEventForModal(eventId, 'view');

  const handleOpenEditModal = (eventId) => loadEventForModal(eventId, 'edit');

  const handleRegenerateInviteLink = async (eventId) => {
    try {
      setRegeneratingEventId(eventId);
      setOpenMenuEventId('');
      const response = await API.post(`/events/private/${eventId}/regenerate-link`);
      const newInviteLink = response.data?.inviteLink;
      const newInviteExpiresAt = response.data?.expiresAt || null;

      if (newInviteLink) {
        setCreatedEvents((prev) => prev.map((item) => (
          item.id === eventId ? { ...item, inviteLink: newInviteLink, inviteExpiresAt: newInviteExpiresAt } : item
        )));
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

      const response = await API.patch(`/events/private/${eventId}/settings`, {
        show_guest_list: !currentValue
      });

      const updatedValue = Boolean(response.data?.showGuestList);
      setCreatedEvents((prev) => prev.map((item) => (
        item.id === eventId ? { ...item, showGuestList: updatedValue } : item
      )));
    } catch {
      setError('Nu am putut actualiza vizibilitatea listei de invitați.');
    } finally {
      setTogglingGuestListEventId('');
    }
  };

  const handleModalClose = () => {
    setIsEventModalOpen(false);
    setEditingEvent(null);
  };

  const handleEventSaved = (updatedEvent) => {
    setCreatedEvents((prev) => prev.map((item) => (
      item.id === updatedEvent.id ? { ...item, ...updatedEvent } : item
    )));
    setEditingEvent(updatedEvent);
  };

  const handleInviteAction = async (participationId, action) => {
    try {
      await API.patch(`/events/private/invitations/${participationId}`, { action });
      setInvitedEvents((prev) => prev.map((item) => {
        if (item.participationId !== participationId) return item;
        return {
          ...item,
          inviteStatus: action === 'accept' ? 'accepted' : 'rejected'
        };
      }));
    } catch {
      setError('Nu am putut actualiza invitația.');
    }
  };

  const openEventFromCard = (eventId) => {
    loadEventForModal(eventId, 'view');
  };

  const stopCardClick = (event) => {
    event.stopPropagation();
  };

  if (loading) {
    return <div className="my-events-shell" aria-busy="true" />;
  }

  return (
    <div className="my-events-shell">
      <div className="my-events-container">
        <header className="my-events-header">
          <div>
            <h1>Evenimentele mele</h1>
            <p>Evenimentele tale private - create de tine sau la care ai fost invitat.</p>
          </div>
          <button type="button" className="my-events-new-btn" onClick={() => navigate('/create-event')}>
            + Eveniment nou
          </button>
        </header>

        <div className="my-events-tabs">
          <button type="button" className={activeTab === 'created' ? 'active' : ''} onClick={() => setActiveTab('created')}>
            Create de mine ({counts.created})
          </button>
          <button type="button" className={activeTab === 'invited' ? 'active' : ''} onClick={() => setActiveTab('invited')}>
            Invitații primite ({counts.invited})
          </button>
        </div>

        {error ? <div className="my-events-error">{error}</div> : null}

        {activeTab === 'created' ? (
          <section className="my-events-list">
            {createdEvents.length === 0 ? <p className="my-events-empty">Nu ai creat niciun eveniment privat.</p> : null}
            {createdEvents.map((eventItem) => {
              const isFuture = new Date(eventItem.start_date) > new Date();
              return (
                <article
                  key={eventItem.id}
                  className="private-event-card private-event-card-clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => openEventFromCard(eventItem.id)}
                  onKeyDown={(keyboardEvent) => {
                    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                      keyboardEvent.preventDefault();
                      openEventFromCard(eventItem.id);
                    }
                  }}
                >
                  <div className="private-event-left">
                    <div className="private-icon"><FiLock /></div>
                    <div className="private-event-main">
                      <div className="private-event-title-row">
                        <h3>{eventItem.title}</h3>
                        <span className={`private-status ${isFuture ? 'future' : 'past'}`}>{isFuture ? 'Viitor' : 'Trecut'}</span>
                      </div>
                      <div className="private-meta-row">
                        <span><FiCalendar /> {formatDateLabel(eventItem.start_date, eventItem.end_date)}</span>
                        <span><FiMapPin /> {eventItem.location || 'Locație nespecificată'}</span>
                        <span><FiUsers /> {eventItem.confirmedCount || 0} participanți</span>
                      </div>
                      <div className="private-link-row">
                        <span className="private-link-pill"><FiLink /> {eventItem.inviteLink}</span>
                        {eventItem.inviteExpiresAt ? (
                          <span className="private-link-expiry">Expiră la {formatExpiryLabel(eventItem.inviteExpiresAt)}</span>
                        ) : null}
                        <span className={`private-guest-list-status ${eventItem.showGuestList ? 'on' : 'off'}`}>
                          Lista invitați: {eventItem.showGuestList ? 'Vizibilă' : 'Ascunsă'}
                        </span>
                        <button type="button" className="private-link-copy" onClick={(event) => { event.stopPropagation(); copyInviteLink(eventItem.inviteLink); }}>
                          <FiCopy />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="private-event-actions">
                    <button type="button" className="private-menu-trigger" onClick={(event) => { event.stopPropagation(); setOpenMenuEventId(openMenuEventId === eventItem.id ? '' : eventItem.id); }}>
                      <FiMoreHorizontal />
                    </button>
                    {openMenuEventId === eventItem.id ? (
                      <div className="private-menu-dropdown">
                        <button type="button" onClick={(event) => { event.stopPropagation(); handleOpenEditModal(eventItem.id); }} disabled={loadingEventId === eventItem.id}>
                          <FiEdit2 /> {loadingEventId === eventItem.id ? 'Se încarcă...' : 'Editează'}
                        </button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); handleRegenerateInviteLink(eventItem.id); }} disabled={regeneratingEventId === eventItem.id}>
                          <FiRefreshCw /> {regeneratingEventId === eventItem.id ? 'Se regenerează...' : 'Regenerare link'}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); handleToggleGuestListVisibility(eventItem.id, eventItem.showGuestList); }}
                          disabled={togglingGuestListEventId === eventItem.id}
                        >
                          <FiUsers />
                          {togglingGuestListEventId === eventItem.id
                            ? 'Se actualizează...'
                            : eventItem.showGuestList
                              ? 'Ascunde lista invitaților'
                              : 'Arată lista invitaților'}
                        </button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); copyInviteLink(eventItem.inviteLink); }}><FiLink /> Copiază linkul</button>
                        <button type="button" className="danger" onClick={(event) => { event.stopPropagation(); handleDeleteEvent(eventItem.id); }}><FiTrash2 /> Șterge</button>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="my-events-list">
            {invitedEvents.length === 0 ? <p className="my-events-empty">Nu ai invitații primite momentan.</p> : null}
            {invitedEvents.map((inviteItem) => {
              const eventItem = inviteItem.event;
              return (
                <article
                  key={inviteItem.participationId}
                  className="private-event-card invite-card private-event-card-clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => openEventFromCard(eventItem.id)}
                  onKeyDown={(keyboardEvent) => {
                    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                      keyboardEvent.preventDefault();
                      openEventFromCard(eventItem.id);
                    }
                  }}
                >
                  <div className="private-event-left">
                    <div className="private-icon"><FiUsers /></div>
                    <div className="private-event-main">
                      <div className="private-event-title-row">
                        <h3>{eventItem.title}</h3>
                        <span className={`private-status ${inviteItem.inviteStatus === 'pending' ? 'pending' : inviteItem.inviteStatus === 'accepted' ? 'future' : 'past'}`}>
                          {inviteItem.inviteStatus === 'pending' ? 'În așteptare' : inviteItem.inviteStatus === 'accepted' ? 'Acceptat' : 'Refuzat'}
                        </span>
                      </div>
                      <p className="private-host-line">Organizator: {eventItem.hostName}</p>
                      <div className="private-meta-row">
                        <span><FiCalendar /> {formatDateLabel(eventItem.start_date, eventItem.end_date)}</span>
                        <span><FiMapPin /> {eventItem.location || 'Locație nespecificată'}</span>
                      </div>
                    </div>
                  </div>

                  {inviteItem.inviteStatus === 'pending' ? (
                    <div className="invite-actions">
                      <button type="button" className="accept" onClick={(event) => { event.stopPropagation(); handleInviteAction(inviteItem.participationId, 'accept'); }}>Accept</button>
                      <button type="button" className="decline" onClick={(event) => { event.stopPropagation(); handleInviteAction(inviteItem.participationId, 'reject'); }}>Refuză</button>
                    </div>
                  ) : null}
                </article>
              );
            })}
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