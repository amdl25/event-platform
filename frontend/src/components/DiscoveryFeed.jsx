import React, { useEffect, useState } from 'react';
import axios from 'axios';
import EventCard from '../components/EventCard';
import '../styles/DiscoveryFeed.css';

const DiscoveryFeed = ({onSelectEvent}) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    weekday: 'Any date',
    eventType: 'Any Type',
    category: 'Any Category'
  });

  useEffect(() => {
    setLoading(true);

    axios.get('http://localhost:5000/events')
      .then((response) => {
        const data = response.data;
        
        setEvents(data);

        const featured = data.find(e => !!e.org_id);
        if (featured && onSelectEvent) {
          onSelectEvent(featured);
        }
      })
      .catch((err) => {
        console.error("Eroare la încărcarea evenimentelor:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [onSelectEvent]);

  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({ ...prev, [filterKey]: value }));
  };

  const publicEvents = events.filter(e => !!e.org_id);

  return (
    <div className="discovery-page">

      <section className="filters-section">
        <div className="container-max">
          <h2>Evenimente viitoare</h2>
          <div className="filters-row">
            <select 
              className="filter-select"
              value={filters.weekday}
              onChange={(e) => handleFilterChange('weekday', e.target.value)}
            >
              <option>Orice dată</option>
              <option>Astăzi</option>
              <option>Mâine</option>
              <option>În weekend</option>
              <option>Săptămâna viitoare</option>
            </select>

            <select 
              className="filter-select"
              value={filters.eventType}
              onChange={(e) => handleFilterChange('eventType', e.target.value)}
            >
              <option>Tip eveniment</option>
              <option>Workshop</option>
              <option>Concert</option>
              <option>Sport</option>
              <option>Social</option>
            </select>

            <select 
              className="filter-select"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option>Orice categorie</option>
              <option>Concert</option>
              <option>Workshopuri Tech</option>
              <option>Sport în aer liber</option>

            </select>
          </div>
        </div>
      </section>

      <section className="events-section">
        <div className="container-max">
          {loading && <p className="loading-text">Evenimentele se încarcă...</p>}
          {error && <p className="error-text">{error}</p>}

          {!loading && publicEvents.length > 0 ? (
            <div className="events-grid">
              {publicEvents.map((event) => (
                <div
                  key={event.id}
                  className="event-card-wrapper"
                  onClick={() => onSelectEvent(event)}
                >
                  <EventCard event={event} variant="compact" />
                </div>
              ))}
            </div>
          ) : (
            !loading && <p className="no-events">Niciun eveniment disponibil</p>
          )}
          <div className="load-more-container">
            <button className="btn-load-more">Vezi mai mult</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DiscoveryFeed;