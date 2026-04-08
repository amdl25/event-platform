import React from 'react';
import { Link } from 'react-router-dom';
import { FiMapPin } from 'react-icons/fi';
import { API_BASE } from '../api';
import '../styles/EventCard.css';

const EventCard = ({ event, variant = 'default' }) => {
  const dateObj = new Date(event.start_date);
  const month = dateObj.toLocaleDateString('ro-RO', { month: 'short' }).toUpperCase();
  const day = dateObj.getDate();
  const isSoldOut = event.max_capacity > 0 && event.current_occupancy >= event.max_capacity;
  const cardImageSrc = event.image_url
    ? (event.image_url.startsWith('http') || event.image_url.startsWith('data:')
      ? event.image_url
      : `${API_BASE}${event.image_url}`)
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
            
            <div className="price-badge-premium">
              {isSoldOut ? (
                <span className="sold-out">Sold out</span>
              ) : Number(event.price) > 0 ? (
                <span>{Number(event.price).toFixed(0)} lei</span>
              ) : (
                <span>Gratuit</span>
              )}
            </div>
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
                +{event.points_value || 50} puncte
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