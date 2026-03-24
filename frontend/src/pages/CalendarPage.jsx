import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/CalendarPage.css';

const CalendarPage = ({ user, userEvents = [] }) => {
  const navigate = useNavigate();

  return (
    <div className="discovery-page">
      <div className="container-max page-section-top">
        
        <header className="calendar-header">
          <h1 className="calendar-title">Calendarul meu</h1>
          <p className="calendar-subtitle">Evenimentele la care participi sau pe care le organizezi.</p>
        </header>

        {userEvents.length > 0 ? (
          <div className="events-grid">
            {userEvents.map(event => (
              <div key={event.id} className="event-card-placeholder">
                {event.title}
              </div>
            ))}
          </div>
        ) : (
          <div className="promo-banner-social">
            <div className="promo-content">
              <div className="promo-badge">SFAT</div>
              <h2>Calendarul tau e liber?</h2>
              <p>Invită-ți prietenii la o adunare rapidă și trimite-le link-ul de acces direct de aici.</p>
              <button className="btn-promo-create" onClick={() => navigate('/create-event')}>
                <i className="fi fi-rr-plus-small"></i> Creează un eveniment privat
              </button>
            </div>
            <div className="promo-illustration">
                <i className="fi fi-rr-calendar-star"></i>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CalendarPage;