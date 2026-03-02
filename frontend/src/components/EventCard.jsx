import React from 'react';
import '../styles/EventCard.css';

const EventCard = ({ event, onJoin, variant = 'default' }) => {
  const isPublic = !!event.org_id;
  const maxCapacity = event.max_capacity || 1;
  const occupancyRate = Math.min(100, (event.current_occupancy / maxCapacity) * 100);
  const isFull = event.current_occupancy >= maxCapacity;

  const handleJoin = () => {
    if (typeof onJoin === 'function') onJoin(event.id);
  };

  if (variant === 'compact') {
    const dateObj = new Date(event.start_date);
    const month = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = dateObj.getDate();

    return (
      <div className="event-card compact">
        <div className="card-image-container">
          <div className="card-image-placeholder"></div>
          {Number(event.price) > 0 && <span className="price-badge-left">€{Number(event.price).toFixed(2)}</span>}
          <div className="card-badges-icons">
            <button className="icon-badge share-icon">↗</button>
            <button className="icon-badge heart-badge">♡</button>
          </div>
        </div>
        <div className="card-info">
          <div className="card-date-column">
            <span className="date-month">{month}</span>
            <span className="date-day">{day}</span>
          </div>
          <div className="card-text-column">
            <h4 className="card-event-title">{event.title}</h4>
            <p className="card-event-location">{event.location}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="event-card">
      <div className="card-image-container">
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="card-image-real" />
        ) : (
          <div className="card-image-placeholder"></div>
        )}
        <span className={`card-badge ${isPublic ? 'badge-public' : 'badge-private'}`}>
          {isPublic ? 'PUBLIC' : 'Private'}
        </span>
        {event.points_value > 0 && <span className="card-points-badge">+{event.points_value}pts</span>}
      </div>

      <div className="card-content">
        <h3 className="card-title">{event.title}</h3>

        <button className="btn-reserve" onClick={handleJoin} disabled={isFull}>
          {isFull ? 'Complet' : 'Rezervă'}
        </button>
      </div>
    </div>
  );
};

export default EventCard;