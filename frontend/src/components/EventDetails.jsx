import React from 'react';
import '../styles/EventDetails.css';

const EventDetails = ({ event }) => {
  if (!event) return <div className="loading">Se încarcă...</div>;

  return (
    <div className="event-page-standard">
      <div className="container-max">
        <header className="event-header-simple">
          <h1 className="event-title-specific">{event.title}</h1>
          <p className="event-subtitle-specific">
            📍 {event.location} • 📅 {new Date(event.start_date).toLocaleDateString('ro-RO')}
          </p>
        </header>

        <div className="event-main-grid">
          <div className="event-left-col">
            <div className="event-image-container-detail">
               <img src={event.image_url || 'https://via.placeholder.com/800x400'} alt={event.title} />
            </div>
            <div className="description-text">
              <h3>Despre eveniment</h3>
              <p>{event.description}</p>
            </div>
          </div>

          <aside className="event-sidebar">
            <div className="booking-card-solid">
              <div className="price-display-large">
                {Number(event.price) > 0 ? `${Number(event.price).toFixed(2)} lei` : 'Gratuit'}
              </div>
              <p className="seats-left">Locuri: {event.max_capacity - event.current_occupancy}</p>
              
              <button className="btn-action-coral">Rezervă acum</button>
              
              <div className="points-reward-detail">
                + {event.points_value || 50} puncte de fidelitate
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;