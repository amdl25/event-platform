import React, { useState } from 'react';
import Hero from '../components/Hero';
import DiscoveryFeed from '../components/DiscoveryFeed';
import Benefits from '../components/Benefits';
import RecommendationWizard from '../components/RecommendationWizard';

const Home = () => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  return (
    <div className="home-page">
      <Hero onRecommendClick={() => setIsWizardOpen(true)} />
      <Benefits/> 
      <DiscoveryFeed />
      <RecommendationWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />
    </div>
  );
};

export default Home;