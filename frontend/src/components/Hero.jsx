import React from 'react';
import { Sparkles } from 'lucide-react';
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
              Descoperă. Participă. Câștigă.
            </p>
          </div>

          <div className="hero-cta-card">
            <span className="hero-cta-label">Nu știi ce să faci?</span>
            <button className="hero-cta-button">
              <Sparkles size={18} />
              Recomandă-mi
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
