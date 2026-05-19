import React from 'react';
import { Link } from 'react-router-dom';
import { FiMapPin } from 'react-icons/fi';
import '../styles/EventCard.css';

const EventCard = ({ event, variant = 'default' }) => {
  const dateObj = new Date(event.start_date);
  const month = dateObj.toLocaleDateString('ro-RO', { month: 'short' }).toUpperCase();
  const day = dateObj.getDate();
  const isSoldOut = event.max_capacity > 0 && event.current_occupancy >= event.max_capacity;
  const createdAtValue = event.created_at || event.createdAt;
  const createdAtTs = createdAtValue ? new Date(createdAtValue).getTime() : NaN;
  const isRecentlyAdded = Number.isFinite(createdAtTs)
    && (Date.now() - createdAtTs) <= (14 * 24 * 60 * 60 * 1000);
  const badgeLabel = isSoldOut ? 'Sold out' : (isRecentlyAdded ? 'Nou' : '');
  const cardImageSrc = event.image_url
    ? (event.image_url.startsWith('http') || event.image_url.startsWith('data:')
      ? event.image_url
      : '')
    : '';

  if (variant === 'compact') {
    return (
      <Link to={`/event/${event.id}`} className="event-card-anchor">
        <div className="event-card compact">
          <div className="card-image-container">
            {event.image_url ? (
              <img src={cardImageSrc} alt={event.title} className="card-main-image" />
            ) : (
              <div className="card-image-placeholder no-image">{event.title?.charAt(0)}</div>
            )}
            
            {badgeLabel ? (
              <div className={`status-badge ${isSoldOut ? 'sold-out' : 'is-new'}`}>
                <span>{badgeLabel}</span>
              </div>
            ) : null}
          </div>

          <div className="card-content-premium">
            <span className="card-date-label">{month} {day}</span>
            
            <div className="card-main-info">
              <h4 className="card-title-premium">{event.title}</h4>
              
              <div className="card-location-premium">
                <FiMapPin size={12} />
                <span>{event.location}</span>
              </div>

              <p className="card-points-premium">
                <span className="card-points-star" aria-hidden="true">★</span> +{event.points_value || 50} puncte
              </p>
            </div>
          </div>
        </div>
      </Link>
    );
  }
  return null;
};

export default EventCard;