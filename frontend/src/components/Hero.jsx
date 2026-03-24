import React, { useState } from 'react';
import '../styles/Hero.css';
import heroImage from '../../public/hero-image.jpg';
import RecommendationWizard from './RecommendationWizard';

const Hero = () => {
  const [showWizard, setShowWizard] = useState(false);

  return (
    <section className="hero-featured">
      <div className="hero-image">
        <img src={heroImage} alt="Featured Event" />
        <h1 className="hero-title">
          Trăiește experiența.<br />
          <span className="highlight">Descoperă. Participă. Câștigă.</span>
        </h1>
        
        <button 
          className="btn-recommendation"
          onClick={() => setShowWizard(true)}
        >
          <span className="btn-icon">✨</span>
          <div className="btn-text">
            <p className="btn-label">Vrei să faci ceva?</p>
            <p className="btn-action">Recomandă-mi</p>
          </div>
        </button>
      </div>

      {showWizard && (
        <RecommendationWizard isOpen={showWizard} onClose={() => setShowWizard(false)} />
      )}
    </section>
  );
};

export default Hero;