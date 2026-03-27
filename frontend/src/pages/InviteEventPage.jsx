import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiCalendar, FiClock, FiMapPin, FiCheckCircle, FiCopy, FiEdit2 } from 'react-icons/fi';
import API from '../api';
import { getEventDateLabel, getEventTimeRangeLabel } from '../utils/eventDateTime';
import '../styles/InviteEventPage.css';

const InviteEventPage = ({ user }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');

  const inviteLink = useMemo(() => `${window.location.origin}/invite/${eventId}`, [eventId]);
  const isOrganizerView = !!(user?.id && eventData?.creator_id && user.id === eventData.creator_id);

  useEffect(() => {
    const loadInvite = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await API.get(`/events/invite/${eventId}`);
        setEventData(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Nu am putut încărca invitația.');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) loadInvite();
  }, [eventId]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setJoinMessage('Link-ul de invitație a fost copiat.');
    } catch {
      setJoinMessage('Nu am putut copia link-ul automat.');
    }
  };

  const handleConfirmParticipation = async () => {
    if (!user?.id) {
      navigate(`/login?redirect=${encodeURIComponent(`/invite/${eventId}`)}`);
      return;
    }

    setJoining(true);
    setJoinMessage('');

    try {
      const response = await API.post(`/events/invite/${eventId}/confirm`, {
        account_id: user.id,
      });
      setJoinMessage(response.data?.message || 'Participare confirmată.');
    } catch (err) {
      setJoinMessage(err.response?.data?.message || 'Nu am putut confirma participarea.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <div className="invite-page"><div className="invite-card">Se încarcă invitația...</div></div>;
  if (error) return <div className="invite-page"><div className="invite-card">{error}</div></div>;
  if (!eventData) return <div className="invite-page"><div className="invite-card">Invitația nu este disponibilă.</div></div>;

  return (
    <div className="invite-page">
      <div className="invite-card">
        <div className="invite-badge">Invitație privată</div>
        <h1>{eventData.title}</h1>
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
              <button className="invite-btn secondary" type="button" onClick={() => navigate(`/event/${eventData.id}`)}>
                <FiEdit2 /> Vezi / Editează Eveniment
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
      </div>
    </div>
  );
};

export default InviteEventPage;
