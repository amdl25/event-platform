import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import '../styles/RecommendationWizard.css';

const RecommendationWizard = ({ isOpen = true, onClose = () => {} }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedVibe, setSelectedVibe] = useState('');
  const [loading, setLoading] = useState(true);
  const [recommendedEvent, setRecommendedEvent] = useState(null);

  const vibes = [
    { id: 'relaxed', label: 'Relaxed', emoji: '😌', priceMax: 100 },
    { id: 'energetic', label: 'Energetic', emoji: '⚡', priceMax: 150 },
    { id: 'social', label: 'Social', emoji: '🤝', priceMax: 120 },
    { id: 'creative', label: 'Creative', emoji: '🎨', priceMax: 100 },
    { id: 'adventurous', label: 'Adventurous', emoji: '🚀', priceMax: 200 }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, categoriesRes] = await Promise.all([
          API.get('/events'),
          API.get('/categories')
        ]);

        setAllEvents(eventsRes.data.filter(e => e.org_id));
        setCategories(categoriesRes.data);

        const uniqueCities = [...new Set(
          eventsRes.data.map(event => {
            const parts = event.location?.split(',') || [];
            return parts[parts.length - 1]?.trim();
          })
        )].filter(Boolean).sort();

        setCities(uniqueCities);
      } catch (error) {
        console.error('Eroare la preluarea datelor:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleNext = () => {
    if (step === 3) {
      handleRecommend();
    } else {
      setStep(step + 1);
    }
  };

  const handleRecommend = () => {
    let filtered = allEvents;

    if (selectedCity) {
      filtered = filtered.filter(event => {
        const eventCity = event.location?.split(',').pop()?.trim();
        return eventCity?.toLowerCase() === selectedCity.toLowerCase();
      });
    }

    if (selectedCategory) {
      filtered = filtered.filter(event =>
        event.categories?.some(cat => cat.id === parseInt(selectedCategory))
      );
    }

    if (selectedVibe) {
      const vibe = vibes.find(v => v.id === selectedVibe);
      if (vibe) {
        filtered = filtered.filter(
          event => parseFloat(event.price || 0) <= vibe.priceMax
        );
      }
    }

    const sorted = filtered.sort(
      (a, b) => new Date(a.start_date) - new Date(b.start_date)
    );

    if (sorted.length > 0) {
      setRecommendedEvent(sorted[0]);
    } else {
      setRecommendedEvent(null);
    }
  };

  if (loading) {
    return isOpen ? <div className="wizard-modal-overlay"><div className="wizard-container">Se încarcă...</div></div> : null;
  }

  if (!isOpen) return null;

  return (
    <div className="wizard-modal-overlay" onClick={onClose}>
    <div className="wizard-container" onClick={(e) => e.stopPropagation()}>
      <div className="wizard-box">
        <button className="wizard-close" onClick={onClose}>✕</button>
        {!recommendedEvent ? (
          <>
            <div className="wizard-header">
              <p className="wizard-question">
                Vrei să faci ceva, dar nu știi ce? 🤔
              </p>
              <p className="wizard-subtitle">Răspunde la câteva întrebări și ți-o recomandă</p>
            </div>

            <div className="wizard-step-indicator">
              <div className={`step-marker ${step >= 1 ? 'active' : ''}`}>1</div>
              <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
              <div className={`step-marker ${step >= 2 ? 'active' : ''}`}>2</div>
              <div className={`step-line ${step >= 3 ? 'active' : ''}`}></div>
              <div className={`step-marker ${step >= 3 ? 'active' : ''}`}>3</div>
            </div>

            {step === 1 && (
              <div className="wizard-step">
                <h3>Ce oraș din țară te intrigă?</h3>
                <div className="wizard-options">
                  {cities.map(city => (
                    <button
                      key={city}
                      className={`option-btn ${selectedCity === city ? 'selected' : ''}`}
                      onClick={() => setSelectedCity(city)}
                    >
                      📍 {city}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="wizard-step">
                <h3>Ce categorie te atrage?</h3>
                <div className="wizard-options">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      className={`option-btn ${selectedCategory === cat.id.toString() ? 'selected' : ''}`}
                      onClick={() => setSelectedCategory(cat.id.toString())}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="wizard-step">
                <h3>Ce vibe-uri te interesează?</h3>
                <div className="wizard-vibes">
                  {vibes.map(vibe => (
                    <button
                      key={vibe.id}
                      className={`vibe-btn ${selectedVibe === vibe.id ? 'selected' : ''}`}
                      onClick={() => setSelectedVibe(vibe.id)}
                    >
                      <span className="vibe-emoji">{vibe.emoji}</span>
                      <span className="vibe-label">{vibe.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="wizard-actions">
              {step > 1 && (
                <button className="btn-prev" onClick={() => setStep(step - 1)}>
                  ← Înapoi
                </button>
              )}
              <button className="btn-next" onClick={handleNext}>
                {step === 3 ? 'Recomandă-mi! 🎯' : 'Următorul pas →'}
              </button>
            </div>
          </>
        ) : (
          <div className="wizard-result">
            <div className="result-header">
              <p className="result-label">✨ Recomandare specială pentru tine</p>
              <h2>Am găsit evenimentul perfect!</h2>
            </div>

            <div className="result-card">
              {recommendedEvent.image_url ? (
                <img src={recommendedEvent.image_url} alt={recommendedEvent.title} />
              ) : (
                <div className="result-placeholder">{recommendedEvent.title.charAt(0)}</div>
              )}

              <div className="result-content">
                <h3>{recommendedEvent.title}</h3>
                <p className="result-location">
                  📍 {recommendedEvent.location}
                </p>
                <p className="result-date">
                  📅 {new Date(recommendedEvent.start_date).toLocaleDateString('ro-RO', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            <div className="result-actions">
              <button className="btn-view-event" onClick={() => navigate(`/event/${recommendedEvent.id}`)}>
                Vezi detalii și rezervă
              </button>
              <button className="btn-restart" onClick={() => {
                setStep(1);
                setSelectedCity('');
                setSelectedCategory('');
                setSelectedVibe('');
                setRecommendedEvent(null);
              }}>
                Alte recomandări
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default RecommendationWizard;
