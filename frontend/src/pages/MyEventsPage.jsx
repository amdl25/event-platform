import React, { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiCopy, FiLink, FiLock, FiMapPin, FiMoreHorizontal, FiTrash2, FiUsers, FiEdit2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import EventDetailsModal from '../components/EventDetailsModal';
import '../styles/MyEventsPage.css';

const formatDateLabel = (dateValue) => {
  const date = new Date(dateValue);
  return date.toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
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
  const [loadingEventId, setLoadingEventId] = useState('');

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

  const handleOpenEditModal = async (eventId) => {
    try {
      setLoadingEventId(eventId);
      setOpenMenuEventId('');
      const response = await API.get(`/events/${eventId}`);
      setEditingEvent(response.data);
      setIsEventModalOpen(true);
    } catch {
      setError('Nu am putut încărca evenimentul pentru editare.');
    } finally {
      setLoadingEventId('');
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
                <article key={eventItem.id} className="private-event-card">
                  <div className="private-event-left">
                    <div className="private-icon"><FiLock /></div>
                    <div className="private-event-main">
                      <div className="private-event-title-row">
                        <h3>{eventItem.title}</h3>
                        <span className={`private-status ${isFuture ? 'future' : 'past'}`}>{isFuture ? 'Viitor' : 'Trecut'}</span>
                      </div>
                      <div className="private-meta-row">
                        <span><FiCalendar /> {formatDateLabel(eventItem.start_date)}</span>
                        <span><FiMapPin /> {eventItem.location || 'Locație nespecificată'}</span>
                        <span><FiUsers /> {eventItem.confirmedCount || 0}/{eventItem.totalInvited || 0} confirmați</span>
                      </div>
                      <div className="private-link-row">
                        <span className="private-link-pill"><FiLink /> {eventItem.inviteLink}</span>
                        <button type="button" className="private-link-copy" onClick={() => copyInviteLink(eventItem.inviteLink)}>
                          <FiCopy />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="private-event-actions">
                    <button type="button" className="private-menu-trigger" onClick={() => setOpenMenuEventId(openMenuEventId === eventItem.id ? '' : eventItem.id)}>
                      <FiMoreHorizontal />
                    </button>
                    {openMenuEventId === eventItem.id ? (
                      <div className="private-menu-dropdown">
                        <button type="button" onClick={() => handleOpenEditModal(eventItem.id)} disabled={loadingEventId === eventItem.id}>
                          <FiEdit2 /> {loadingEventId === eventItem.id ? 'Se încarcă...' : 'Editează'}
                        </button>
                        <button type="button" onClick={() => copyInviteLink(eventItem.inviteLink)}><FiLink /> Copiază linkul</button>
                        <button type="button" className="danger" onClick={() => handleDeleteEvent(eventItem.id)}><FiTrash2 /> Șterge</button>
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
                <article key={inviteItem.participationId} className="private-event-card invite-card">
                  <div className="private-event-left">
                    <div className="private-icon"><FiUsers /></div>
                    <div className="private-event-main">
                      <div className="private-event-title-row">
                        <h3>{eventItem.title}</h3>
                        <span className={`private-status ${inviteItem.inviteStatus === 'pending' ? 'pending' : inviteItem.inviteStatus === 'accepted' ? 'future' : 'past'}`}>
                          {inviteItem.inviteStatus === 'pending' ? 'În așteptare' : inviteItem.inviteStatus === 'accepted' ? 'Acceptat' : 'Refuzat'}
                        </span>
                      </div>
                      <p className="private-host-line">Gazdă: {eventItem.hostName}</p>
                      <div className="private-meta-row">
                        <span><FiCalendar /> {formatDateLabel(eventItem.start_date)}</span>
                        <span><FiMapPin /> {eventItem.location || 'Locație nespecificată'}</span>
                      </div>
                    </div>
                  </div>

                  {inviteItem.inviteStatus === 'pending' ? (
                    <div className="invite-actions">
                      <button type="button" className="accept" onClick={() => handleInviteAction(inviteItem.participationId, 'accept')}>Accept</button>
                      <button type="button" className="decline" onClick={() => handleInviteAction(inviteItem.participationId, 'reject')}>Refuză</button>
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
        canEdit={Boolean(editingEvent)}
        initialMode="edit"
        onSaved={handleEventSaved}
      />
    </div>
  );
};

export default MyEventsPage;