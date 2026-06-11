import React, { useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import EventDetails from './EventDetails';
import '../styles/EventPreviewModal.css';

const EventPreviewModal = ({ event, onClose }) => {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!event) return null;

  return (
    <div className="event-preview-backdrop" onClick={onClose}>
      <div className="event-preview-panel" onClick={(e) => e.stopPropagation()}>
        <div className="event-preview-topbar">
          <span className="event-preview-badge">PREVIZUALIZARE</span>
          <p className="event-preview-hint">Așa arată pagina evenimentului pentru utilizatori.</p>
          <button type="button" className="event-preview-close" onClick={onClose} aria-label="Închide previzualizarea">
            <FiX />
          </button>
        </div>
        <div className="event-preview-scroll">
          <EventDetails event={event} user={null} />
        </div>
      </div>
    </div>
  );
};

export default EventPreviewModal;
