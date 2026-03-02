import React, { useEffect, useState } from 'react';
import EventCard from '../components/EventCard';
import '../styles/DiscoveryFeed.css';
import heroImage from '../../public/hero-image.jpg';

const DiscoveryFeed = ({user}) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filters, setFilters] = useState({
    weekday: 'Any date',
    eventType: 'Any Type',
    category: 'Any Category'
  });


  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:5000/api/events')
      .then((res) => {
        if (!res.ok) throw new Error('Nu am putut încărca evenimentele.');
        return res.json();
      })
      .then((data) => {
        setEvents(data);
        const publicEvent = data.find(e => !!e.org_id);
        if (publicEvent) setSelectedEvent(publicEvent);
      })
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, []);

  const publicEvents = events.filter(e => !!e.org_id);

  const handleFilterChange = (filterKey, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterKey]: value
    }));
  };

  return (
    <div className="discovery-page">
      <section className="hero-featured">
        <div className="hero-image">
          <img src={heroImage} alt="Featured Event" />
          <h1 className="hero-title">
            DON'T JUST WATCH.<br />
            <span className="highlight">PARTICIPATE.</span>
          </h1>
        </div>

        {selectedEvent && (
          <div className="featured-card">
            <div className="featured-header">
              <span className="featured-label">Featured Event</span>
              <button className="nav-arrow">›</button>
            </div>

            <h3 className="featured-title">{selectedEvent.title}</h3>
            <p className="featured-org">
              {selectedEvent.organization?.name || 'Unknown Organization'}
            </p>

            <div className="featured-details">
              <div className="detail-item">
                <p className="detail-label">Date & Time</p>
                <p className="detail-value">
                  {new Date(selectedEvent.start_date).toLocaleDateString('ro-RO', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            <div className="featured-actions">
              <button className="btn-book">Book Now {selectedEvent.price > 0 ? `(€${selectedEvent.price})` : '(Free)'}</button>
              <button className="btn-add-calendar">+ Add to Calendar</button>
            </div>
          </div>
        )}
      </section>

      <section className="filters-section">
        <div className="container-max">
          <h2>Upcoming Events</h2>
          <div className="filters-row">
            <select 
              className="filter-select"
              value={filters.weekday}
              onChange={(e) => handleFilterChange('weekday', e.target.value)}
            >
              <option>Any date</option>
              <option>Today</option>
              <option>Tomorrow</option>
              <option>This Weekend</option>
              <option>This Week</option>
              <option>Next Week</option>
            </select>

            <select 
              className="filter-select"
              value={filters.eventType}
              onChange={(e) => handleFilterChange('eventType', e.target.value)}
            >
              <option>Event Type</option>
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
              <option>Any Category</option>
              <option>Coffee & Chill</option>
              <option>Tech Workshops</option>
              <option>Outdoor Sports</option>
              <option>Arts & Culture</option>
            </select>
          </div>
        </div>
      </section>

      <section className="events-section">
        <div className="container-max">
          {loading && <p className="loading-text">Se încarcă evenimentele...</p>}
          {error && <p className="error-text">{error}</p>}

          {!loading && publicEvents.length > 0 ? (
            <div className="events-grid">
              {publicEvents.map((event) => (
                <div
                  key={event.id}
                  className="event-card-wrapper"
                  onClick={() => setSelectedEvent(event)}
                >
                  <EventCard event={event} variant="compact" />
                </div>
              ))}
            </div>
          ) : (
            !loading && <p className="no-events">Nu sunt evenimente disponibile</p>
          )}
        </div>
        <div className="load-more-container">
          <button className="btn-load-more">
            View more events
          </button>
        </div>
      </section>

    </div>
    
  );
};

export default DiscoveryFeed;
