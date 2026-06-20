import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, MapPin, Search } from 'lucide-react';
import '../styles/Hero.css';

const Hero = ({ onRecommendClick }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (city.trim()) params.set('city', city.trim());
    navigate(`/explore?${params.toString()}`);
  };

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
              DESCOPERĂ &nbsp;·&nbsp; PARTICIPĂ &nbsp;·&nbsp; ORGANIZEAZĂ
            </p>
            <form className="hero-search-bar" onSubmit={handleSearch}>
              <div className="hero-search-field">
                <Search size={16} className="hero-search-icon" />
                <input
                  type="text"
                  placeholder="Concerte, workshop-uri, festivaluri..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="hero-search-divider" aria-hidden="true" />
              <div className="hero-search-field">
                <MapPin size={16} className="hero-search-icon" />
                <input
                  type="text"
                  placeholder="Orașul tău"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <button type="submit" className="hero-search-btn">
                <Sparkles size={15} />
                Caută
              </button>
            </form>
          </div>

          <div className="hero-cta-card">
            <span className="hero-cta-label">Nu știi ce să faci?</span>
            <button className="hero-cta-button" onClick={onRecommendClick}>
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
