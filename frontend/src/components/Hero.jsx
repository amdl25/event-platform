import React from 'react';
import { FiStar } from 'react-icons/fi';
import '../styles/Hero.css';

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-container">
        <div className="hero-image-wrapper">
          <img 
            src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1600&q=80" 
            alt="Eveniment vibrant cu multime de oameni"
            className="hero-image"
          />
          <div className="hero-image-overlay"></div>
          
          <div className="hero-content">
            <h1 className="hero-title">
              Traieste<br />
              experienta.
            </h1>
            <p className="hero-subtitle">
              Descopera &bull; Participa &bull; Castiga
            </p>
            <button className="hero-cta-button">
              <FiStar size={16} />
              Recomanda-mi
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
