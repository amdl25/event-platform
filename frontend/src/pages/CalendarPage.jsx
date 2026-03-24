import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import EventCard from '../components/EventCard';
import '../styles/CalendarPage.css';

const CalendarPage = ({ user, userEvents = [] }) => {
  const navigate = useNavigate();
  const [publicEvents, setPublicEvents] = useState([]);
  const [loadingPublicEvents, setLoadingPublicEvents] = useState(false);

  useEffect(() => {
    if (userEvents.length > 0) return;

    const fetchPublicEvents = async () => {
      setLoadingPublicEvents(true);
      try {
        const res = await API.get('/events');
        const publicOnly = res.data
          .filter((event) => event.org_id !== null && event.org_id !== undefined)
          .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

        setPublicEvents(publicOnly.slice(0, 8));
      } catch (error) {
        console.error('Eroare la încărcarea evenimentelor publice:', error);
      } finally {
        setLoadingPublicEvents(false);
      }
    };

    fetchPublicEvents();
  }, [userEvents.length]);

  return (
    <div className="discovery-page">
      <div className="container-max page-section-top">
        
        <header className="calendar-header">
          <h1 className="calendar-title">Calendarul meu</h1>
          <p className="calendar-subtitle">Evenimentele la care participi sau pe care le organizezi.</p>
        </header>

        {userEvents.length > 0 ? (
          <div className="calendar-events-grid">
            {userEvents.map(event => (
              <div key={event.id} className="event-card-wrapper">
                <EventCard event={event} variant="compact" />
              </div>
            ))}
          </div>
        ) : (
          <>
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

            <section className="calendar-public-section">
              <div className="calendar-public-header">
                <h2>Explorează evenimente publice</h2>
                <button className="btn-explore-public" onClick={() => navigate('/explore')}>
                  Vezi toate în Explore
                </button>
              </div>

              {loadingPublicEvents ? (
                <p className="calendar-public-loading">Se încarcă evenimentele publice...</p>
              ) : publicEvents.length > 0 ? (
                <div className="calendar-events-grid">
                  {publicEvents.map((event) => (
                    <div key={event.id} className="event-card-wrapper">
                      <EventCard event={event} variant="compact" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="calendar-public-empty">Momentan nu există evenimente publice disponibile.</p>
              )}
            </section>
          </>
        )}

      </div>
    </div>
  );
};

export default CalendarPage;