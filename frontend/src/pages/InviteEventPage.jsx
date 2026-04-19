import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FiCalendar, FiClock, FiMapPin, FiCheckCircle, FiCopy, FiEdit2 } from 'react-icons/fi';
import API from '../api';
import { getEventDateLabel, getEventTimeRangeLabel } from '../utils/eventDateTime';
import EventDetailsModal from '../components/EventDetailsModal';
import '../styles/InviteEventPage.css';

const InviteEventPage = ({ user }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token') || '';

  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [guests, setGuests] = useState([]);
  const [guestListError, setGuestListError] = useState('');
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [modalInitialMode, setModalInitialMode] = useState('view');
  const [showAllGuests, setShowAllGuests] = useState(false);

  const GUESTS_LIMIT = 3;

  const inviteLink = useMemo(() => {
    if (eventData?.inviteLink) return eventData.inviteLink;
    if (inviteToken) return `${window.location.origin}/invite/${eventId}?token=${inviteToken}`;
    return `${window.location.origin}/invite/${eventId}`;
  }, [eventData?.inviteLink, eventId, inviteToken]);
  const isOrganizerView = !!(user?.id && eventData?.creator_id && user.id === eventData.creator_id);

  useEffect(() => {
    const loadInvite = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await API.get(`/events/invite/${eventId}`, {
          params: inviteToken ? { token: inviteToken } : undefined
        });
        setEventData(response.data);

        if (user?.id) {
          const pending = sessionStorage.getItem('pendingInvitation');
          if (pending) {
            const { autoConfirm } = JSON.parse(pending);
            if (autoConfirm) {
              sessionStorage.removeItem('pendingInvitation');
              setTimeout(() => {
                confirmParticipationDirectly(user.id, inviteToken);
              }, 100);
            }
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Nu am putut încărca invitația.');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) loadInvite();
  }, [eventId, inviteToken, user?.id]);

  useEffect(() => {
    const loadGuestList = async () => {
      if (!user?.id || !eventId) return;

      try {
        const response = await API.get(`/events/private/${eventId}/guests`);
        setGuests(Array.isArray(response.data?.guests) ? response.data.guests : []);
        setGuestListError('');
      } catch (err) {
        setGuests([]);
        setGuestListError(err.response?.data?.message || 'Lista invitaților nu este disponibilă.');
      }
    };

    loadGuestList();
  }, [eventId, user?.id, joinMessage]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setJoinMessage('Link-ul de invitație a fost copiat.');
    } catch {
      setJoinMessage('Nu am putut copia link-ul automat.');
    }
  };

  const confirmParticipationDirectly = async (userId, token) => {
    setJoining(true);
    setJoinMessage('');

    try {
      const response = await API.post(`/events/invite/${eventId}/confirm`, {
        account_id: userId,
        inviteToken: token,
      });
      setJoinMessage(response.data?.message || 'Participare confirmată.');
    } catch (err) {
      setJoinMessage(err.response?.data?.message || 'Nu am putut confirma participarea.');
    } finally {
      setJoining(false);
    }
  };

  const handleOpenEventModalView = () => {
    setModalInitialMode('view');
    setIsEventModalOpen(true);
  };

  const handleOpenEventModalEdit = () => {
    setModalInitialMode('edit');
    setIsEventModalOpen(true);
  };

  const handleConfirmParticipation = async () => {
    if (!user?.id) {
      sessionStorage.setItem('pendingInvitation', JSON.stringify({
        eventId,
        token: inviteToken,
        autoConfirm: true
      }));
      navigate(`/login`);
      return;
    }

    confirmParticipationDirectly(user.id, inviteToken);
  };

  if (loading) return null;
  if (error) return <div className="invite-page"><div className="invite-card">{error}</div></div>;
  if (!eventData) return <div className="invite-page"><div className="invite-card">Invitația nu este disponibilă.</div></div>;

  return (
    <div className="invite-page">
      <div className="invite-card">
        <div className="invite-badge">Invitație privată</div>
        <h1
          className="invite-title-clickable"
          onClick={handleOpenEventModalView}
          onKeyDown={(eventKey) => {
            if (eventKey.key === 'Enter' || eventKey.key === ' ') {
              eventKey.preventDefault();
              handleOpenEventModalView();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Vezi detalii eveniment"
        >
          {eventData.title}
        </h1>
        <p className="invite-description">{eventData.description || 'Eveniment privat cu acces pe bază de invitație.'}</p>

        <div className="invite-meta-grid">
          <div className="invite-meta-item">
            <FiCalendar />
            <span>{getEventDateLabel(eventData.start_date, 'ro-RO')}</span>
          </div>
          <div className="invite-meta-item">
            <FiClock />
            <span>{getEventTimeRangeLabel(eventData.start_date, eventData.end_date)}</span>
          </div>
          <div className="invite-meta-item">
            <FiMapPin />
            <span>{eventData.location || 'Locație nespecificată'}</span>
          </div>
        </div>

        <div className="invite-actions">
          {isOrganizerView ? (
            <>
              <button className="invite-btn primary" type="button" onClick={handleCopyLink}>
                <FiCopy /> Copiază Link Invitație
              </button>
              <button className="invite-btn secondary" type="button" onClick={handleOpenEventModalEdit}>
                <FiEdit2 /> Editează Eveniment
              </button>
            </>
          ) : (
            <button className="invite-btn primary" type="button" onClick={handleConfirmParticipation} disabled={joining}>
              <FiCheckCircle /> {joining ? 'Se confirmă...' : 'Confirmă Participarea'}
            </button>
          )}
        </div>

        {isOrganizerView ? <p className="invite-hint">Ești organizatorul. Distribuie link-ul invitaților tăi.</p> : null}
        {joinMessage ? <p className="invite-message">{joinMessage}</p> : null}

        {user?.id ? (
          <div className="invite-guests-block">
            <h3>Lista invitaților</h3>
            {guestListError ? <p className="invite-guest-error">{guestListError}</p> : null}
            {!guestListError && guests.length === 0 ? <p className="invite-guest-empty">Niciun invitat confirmat momentan.</p> : null}
            {!guestListError && guests.length > 0 ? (
              <>
                <ul className="invite-guests-list">
                  {guests.slice(0, showAllGuests ? guests.length : GUESTS_LIMIT).map((guest) => (
                    <li key={guest.id}>
                      <span>{guest.displayName}</span>
                      <small>{guest.inviteStatus === 'accepted' ? 'Acceptat' : guest.inviteStatus}</small>
                    </li>
                  ))}
                </ul>
                {guests.length > GUESTS_LIMIT ? (
                  <button
                    type="button"
                    className="invite-guests-toggle"
                    onClick={() => setShowAllGuests(!showAllGuests)}
                  >
                    {showAllGuests ? 'Ascunde' : `Arată mai mult (+${guests.length - GUESTS_LIMIT})`}
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <EventDetailsModal
        isOpen={isEventModalOpen}
        event={eventData}
        onClose={() => setIsEventModalOpen(false)}
        canEdit={isOrganizerView}
        initialMode={modalInitialMode}
        onSaved={(updatedEvent) => setEventData(updatedEvent)}
      />
    </div>
  );
};

export default InviteEventPage;
