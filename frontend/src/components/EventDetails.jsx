import React from 'react';
import { Calendar, MapPin, Users, Award, ChevronLeft } from 'lucide-react';
import './EventDetails.css';

const EventDetails = ({ event }) => {
  const remainingSeats = event.max_capacity - event.current_occupancy;
  const isSoldOut = remainingSeats <= 0;

  const eventDate = new Date(event.start_date).toLocaleDateString('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const eventTime = new Date(event.start_date).toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="event-details-wrapper">
      <nav className="back-nav">
        <button onClick={() => window.history.back()} className="btn-back">
          <ChevronLeft size={20} /> Înapoi la evenimente
        </button>
      </nav>

      <main className="event-main-content">
        <div className="event-header-section">
          <h1 className="event-title-display">{event.title}</h1>
          
          <div className="event-quick-info">
            <span className="org-tag">
              Organizat de <strong>{event.Organization?.name || "Membru Comunitate"}</strong>
            </span>
            <div className="xp-badge-large">
              <Award size={18} />
              <span>+{event.points_value} XP</span>
            </div>
          </div>
        </div>

        <div className="event-grid-layout">
          <div className="content-column">
            <div className="event-image-container">
              <img 
                src={event.image_url || "/placeholder-event.jpg"} 
                alt={event.title} 
                className="main-event-image"
              />
            </div>

            <section className="description-text">
              <h2>Despre acest eveniment</h2>
              <p>{event.description}</p>
            </section>
          </div>

          <aside className="booking-sidebar">
            <div className="sticky-card">
              <div className="price-display">
                {parseFloat(event.price) === 0 ? "Gratuit" : `${event.price} RON`}
              </div>

              <div className="info-rows">
                <div className="info-row">
                  <Calendar className="icon-primary" size={20} />
                  <div>
                    <p className="info-val">{eventDate}</p>
                    <p className="info-sub">{eventTime}</p>
                  </div>
                </div>

                <div className="info-row">
                  <MapPin className="icon-primary" size={20} />
                  <div>
                    <p className="info-val">{event.location}</p>
                  </div>
                </div>

                <div className="info-row">
                  <Users className="icon-primary" size={20} />
                  <div>
                    <p className="info-val">{remainingSeats} locuri rămase</p>
                    <p className="info-sub">din {event.max_capacity} total</p>
                  </div>
                </div>
              </div>

              <div className="booking-actions">
                <button 
                  className={`btn-book-large ${isSoldOut ? 'disabled' : ''}`}
                  disabled={isSoldOut}
                >
                  {isSoldOut ? 'Sold Out' : 'Rezervă acum'}
                </button>
                <button className="btn-secondary-ghost">
                  Salvează în calendar
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default EventDetails;