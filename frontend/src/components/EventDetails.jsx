import React, { useState } from 'react';
import { API_BASE } from '../api';
import BookingModal from './BookingModal';
import { useNavigate } from 'react-router-dom';
import { getEventStartValue, getEventEndValue, getEventTimeRangeLabel, getEventDateLabel } from '../utils/eventDateTime';
import '../styles/EventDetails.css';

const EventDetails = ({ event, user }) => {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const navigate = useNavigate();
  const isSoldOut = event.max_capacity > 0 && event.current_occupancy >= event.max_capacity;
  const eventStart = getEventStartValue(event);
  const eventEnd = getEventEndValue(event);
  const eventTimeRange = getEventTimeRangeLabel(eventStart, eventEnd);

  return (
    <>
    <div className="event-details-wrapper">
      <header className="event-hero-header">
        <div className="hero-inner-container">
          <img 
            src={event.image_url?.startsWith('https') 
              ? event.image_url 
              : `${API_BASE}${event.image_url}`} 
            alt={event.title} 
            className="hero-image"
          />
          <div className="hero-overlay-info">
            <h1 className="event-display-title">{event.title}</h1>
          </div>
        </div>
      </header>

      <div className="event-main-layout">
        <div className="event-columns-grid">
          
          <main className="event-info-column">
            <div className="brand-identity-header">
               <div className="brand-info">
                  <span className="brand-prefix">Organizat de</span>
                  <h2 className="brand-name-text">
                    {event.organization ? event.organization.name : 'Organizator Partener'}
                  </h2>
               </div>
               <button className="contact-brand-btn">Contact</button>
            </div>

            <div className="event-logistics-bar">
              <div className="logistic-block">
                <span className="logistic-label">Când</span>
                <div className="logistic-value">
                  {eventStart ? getEventDateLabel(eventStart, 'ro-RO') : '-'}
                </div>
                <div className="logistic-sub">{eventTimeRange ? `Ora ${eventTimeRange}` : 'Ora nespecificată'}</div>
              </div>

              <div className="logistic-block">
                <span className="logistic-label">Unde</span>
                <div className="logistic-value">{event.location}</div>
              </div>
            </div>

            <section className="event-description-section">
              <h3 className="section-title">Despre acest eveniment</h3>
              <p className="event-body-text">{event.description}</p>

              <section className="event-map-section">
                <h3 className="section-title">Locație</h3>
                <div className="map-container-frame">
                  <iframe
                    title="event-location"
                    width="100%"
                    height="350"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(event.location)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                  ></iframe>
                </div>
              </section>
            </section>
          </main>

          <aside className="event-booking-sidebar">
            <div className="booking-sticky-card">
              <div className="booking-card-header">
                <span className="price-label">Preț Bilet</span>
                <div className="price-display-bold">
                  {Number(event.price) > 0 ? `${Number(event.price).toFixed(2)} lei` : 'Gratuit'}
                </div>
              </div>

              <button
                className="btn-book-primary"
                disabled={isSoldOut}
                onClick={() => {
                  if (isSoldOut) return;
                  if (user?.id) {
                    navigate(`/purchase/${event.id}?mode=user`);
                    return;
                  }
                  setIsBookingOpen(true);
                }}
              >
                {isSoldOut ? 'Sold out' : 'Cumpără bilete'}
              </button>
              
              <div className="reward-points-footer">
                +100 puncte de fidelitate
              </div>
            </div>
          </aside>
          
        </div>
      </div>
    </div>
    <BookingModal
      isOpen={isBookingOpen}
      onClose={() => setIsBookingOpen(false)}
      event={event}
      user={user}
    />
    </>
  );
};

export default EventDetails;