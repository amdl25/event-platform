import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import '../styles/ExplorePage.css';

const ExplorePage = () => {
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const getVisuals = (name) => {
    const map = {
      'Tech': { icon: 'fi-rr-laptop', color: '#fff9db' },
      'Muzică': { icon: 'fi-rr-music', color: '#e3f2fd' },
      'Artă': { icon: 'fi-rr-paint-brush', color: '#f3e5f5' },
      'Lifestyle': { icon: 'fi-rr-leaf', color: '#e8f5e9' },
      'Sport': { icon: 'fi-rr-gym', color: '#fff3e0' }
    };
    return map[name] || { icon: 'fi-rr-star', color: '#f4f4f7' };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, eventRes] = await Promise.all([
          API.get('/categories'),
          API.get('/events')
        ]);
        setCategories(catRes.data);
        const uniqueCities = [...new Set(eventRes.data.map(event => {
          const parts = event.location.split(',');
          return parts[parts.length - 1]?.trim();
        }))].filter(Boolean);
        setCities(uniqueCities);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="explore-loader">Se încarcă...</div>;

  return (
    <div className="discovery-page">
      <div className="container-max">
        
        <header className="explore-header">
          <h1 className="explore-title">Descoperă</h1>
          <p className="explore-subtitle">Găsește următoarea ta experiență memorabilă.</p>
        </header>

        <section className="explore-section">
          <h2 className="section-label">Categorii</h2>
          <div className="category-grid-luma">
            {categories.map((cat) => {
              const visual = getVisuals(cat.name);
              return (
                <div key={cat.id} className="category-card-luma" onClick={() => navigate(`/category/${cat.name}`)}>
                  <div className="cat-card-icon" style={{ backgroundColor: visual.color }}>
                    <i className={`fi ${visual.icon}`}></i>
                  </div>
                  <div className="cat-card-info">
                    <h3>{cat.name}</h3>
                    <span>Vezi evenimente</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="explore-section">
          <h2 className="section-label">Orașe active</h2>
          <div className="city-quick-links">
            {cities.map(city => (
              <button key={city} className="city-tag" onClick={() => navigate(`/category/${city}`)}>
                {city}
              </button>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};

export default ExplorePage;