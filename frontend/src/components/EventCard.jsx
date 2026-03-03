import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/EventCard.css';

const EventCard = ({ event, variant = 'default' }) => {
  const dateObj = new Date(event.start_date);
  const month = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = dateObj.getDate();

  if (variant === 'compact') {
    return (
      <Link to={`/event/${event.id}`} className="event-card-anchor">
        <div className="event-card compact">
          <div className="card-image-container">
            <div className="card-image-placeholder"></div>
            {Number(event.price) > 0 && (
              <span className="price-badge-left">{Number(event.price).toFixed(2)} lei</span>
            )}
            <div className="card-badges-icons">
              <button className="icon-badge share-icon" onClick={(e) => e.preventDefault()}>↗</button>
              <button className="icon-badge heart-badge" onClick={(e) => e.preventDefault()}>♡</button>
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
          
          <p className="card-event-points">
            + {event.points_value || 50} puncte
          </p>
        </div>
      </Link>
    );
  }
};

export default EventCard;