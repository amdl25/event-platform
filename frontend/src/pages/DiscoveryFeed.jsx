import React, { useEffect, useState } from 'react';
import EventCard from '../components/EventCard';
import '../styles/EventCard.css';

const DiscoveryFeed = () => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/events')
      .then(res => res.json())
      .then(data => setEvents(data));
  }, []);

  return (
    <div className="discovery-page">
      <h2 style={{ textAlign: 'center', margin: '40px 0' }}>Explorează Evenimente</h2>
      
      <div className="event-grid">
        {events.map(event => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
};

export default DiscoveryFeed;