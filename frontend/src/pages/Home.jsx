import React from 'react';
import Hero from '../components/Hero';
import DiscoveryFeed from '../components/DiscoveryFeed';
import Benefits from '../components/Benefits';

const Home = () => {
  return (
    <div className="home-page">
      <Hero />
      <Benefits/> 
      <DiscoveryFeed />
    </div>
  );
};

export default Home;