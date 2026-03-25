import React from 'react';
import { FiStar } from 'react-icons/fi';
import '../styles/Hero.css';

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-container">
        <div className="hero-image-wrapper">
          <img 
            src="https://www.simpleiv.com/wp-content/uploads/2021/12/partybanner2-scaled.jpg" 
            alt="Eveniment vibrant cu mulțime de oameni"
            className="hero-image"
          />
          <div className="hero-image-overlay"></div>
          
          <div className="hero-content">
            <h1 className="hero-title">
              Trăiește<br />
              experiența.
            </h1>
            <p className="hero-subtitle">
              DESCOPERĂ • PARTICIPĂ • CÂȘTIGĂ
            </p>
            <button className="hero-cta-button">
              <FiStar size={16} />
              Recomandă-mi
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
