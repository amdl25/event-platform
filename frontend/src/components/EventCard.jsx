import React from 'react';
import { Link } from 'react-router-dom';
import { FiMapPin } from 'react-icons/fi';
import '../styles/EventCard.css';

const EventCard = ({ event, variant = 'default', user}) => {
  const dateObj = new Date(event.start_date);
  const month = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = dateObj.getDate();
  const maxCapacity = Number(event.max_capacity || 0);
  const currentOccupancy = Number(event.current_occupancy || 0);
  const isSoldOut = maxCapacity > 0 && currentOccupancy >= maxCapacity;

  if (variant === 'home') {
    return (
      <Link to={`/event/${event.id}`} className="event-card-anchor">
        <div className="event-card home">
          <div className="card-image-container">
            {event.image_url ? (
              <img
                src={event.image_url}
                alt={event.title}
                className="card-main-image"
              />
            ) : (
              <div className="card-image-placeholder no-image">
                {event.title.charAt(0)}
              </div>
            )}
            {isSoldOut ? (
              <span className="price-badge-left sold-out-badge">Sold out</span>
            ) : Number(event.price) > 0 ? (
              <span className="price-badge-left">{Number(event.price).toFixed(2)} lei</span>
            ) : null}
          </div>

          <div className="home-card-content">
            <p className="home-card-date">{month} {day}</p>
            <h4 className="home-card-title">{event.title}</h4>
            <p className="home-card-location">
              <FiMapPin size={14} />
              {event.location}
            </p>
            <p className="home-card-points">+{event.points_value || 50} puncte</p>
          </div>
        </div>
      </Link>
    );
  }


  if (variant === 'compact') {
    return (
      <Link to={`/event/${event.id}`} className="event-card-anchor">
        <div className="event-card compact">
          <div className="card-image-container">
            {event.image_url ? (
              <img 
                src={event.image_url} 
                alt={event.title} 
                className="card-main-image" 
              />
            ) : (
              <div className="card-image-placeholder no-image">
                {event.title.charAt(0)}
              </div>
            )}
            {isSoldOut ? (
              <span className="price-badge-left sold-out-badge">Sold out</span>
            ) : Number(event.price) > 0 ? (
              <span className="price-badge-left">{Number(event.price).toFixed(2)} lei</span>
            ) : null}
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