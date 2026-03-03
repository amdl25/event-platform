import React, { useEffect, useState } from 'react';
import Hero from '../components/Hero';
import DiscoveryFeed from '../components/DiscoveryFeed';
import Benefits from '../components/Benefits';

const Home = () => {
   const [selectedEvent, setSelectedEvent] = useState(null);
  return (
    <div className="home-page">
      <Hero  featuredEvent={selectedEvent} />
      <Benefits/> 
      <DiscoveryFeed onSelectEvent={setSelectedEvent} />
    </div>
  );
};

export default Home;