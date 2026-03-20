import React from 'react';
import '../styles/Hero.css';
import heroImage from '../../public/hero-image.jpg';
import { Link } from 'react-router-dom';

const Hero = ({ featuredEvent }) => {
  return (
    <section className="hero-featured">
      <div className="hero-image">
        <img src={heroImage} alt="Featured Event" />
        <h1 className="hero-title">
          Trăiește experiența.<br />
          <span className="highlight">Descoperă. Participă. Câștigă.</span>
        </h1>
      </div>

      {featuredEvent && (
        <div className="featured-card">
          <div className="featured-header">
            <span className="featured-label">Eveniment recomandat</span>
          </div>

          <h3 className="featured-title">{featuredEvent.title}</h3>
          <p className="featured-org">
            {featuredEvent.organization?.name || 'Unknown Organization'}
          </p>

          <div className="featured-details">
            <div className="detail-item">
              <p className="detail-label">Dată și oră</p>
              <p className="detail-value">
                {new Date(featuredEvent.start_date).toLocaleDateString('en-US', {
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
            <Link to={`/event/${featuredEvent.id}`} className="btn-book">
                Rezervă acum
            </Link>
            <button className="btn-add-calendar">+ Adaugă în calendar</button>
          </div>
        </div>
      )}
    </section>
  );
};

export default Hero;