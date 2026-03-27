import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import '../styles/RecommendationWizard.css';

const RecommendationWizard = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [screen, setScreen] = useState(0);
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allEvents, setAllEvents] = useState([]);

  const [selectedCity, setSelectedCity] = useState('Oriunde');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState('any');
  const [selectedWhen, setSelectedWhen] = useState('any');
  const [loading, setLoading] = useState(true);
  const [recommendedEvents, setRecommendedEvents] = useState([]);
  const [didSubmit, setDidSubmit] = useState(false);

  const totalQuestions = 4;

  const budgetOptions = [
    { id: 'free', label: 'ACCES GRATUIT' },
    { id: 'under50', label: 'SUB 50 LEI' },
    { id: 'any', label: 'BUGET FLEXIBIL' }
  ];

  const whenOptions = [
    { id: 'weekend', label: 'ÎN ACEST WEEKEND' },
    { id: 'week', label: 'SĂPTĂMÂNA ACEASTA' },
    { id: 'month', label: 'LUNA ACEASTA' },
    { id: 'any', label: 'ORICÂND' }
  ];

  const screenConfigs = {
    0: { title: 'Găsește experiența ideală', subtitle: 'Un ghid rapid pentru a descoperi evenimentele care ți se potrivesc.', actionLabel: 'ÎNCEPE EXPLORAREA' },
    1: { title: 'Destinația', subtitle: 'Unde cauți evenimente?' },
    2: { title: 'Interese', subtitle: 'Ce tip de experiență preferi?' },
    3: { title: 'Buget', subtitle: 'Care este limita dorită?' },
    4: { title: 'Timp', subtitle: 'Când vrei să ieși?' }
  };

  const resetWizard = () => {
    setScreen(0);
    setSelectedCity('Oriunde');
    setSelectedCategoryIds([]);
    setSelectedBudget('any');
    setSelectedWhen('any');
    setRecommendedEvents([]);
    setDidSubmit(false);
  };

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => resetWizard(), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, categoriesRes] = await Promise.all([
          API.get('/events'),
          API.get('/categories')
        ]);
        const publicEvents = eventsRes.data.filter(e => e.org_id);
        setAllEvents(publicEvents);
        setCategories(categoriesRes.data);
        const uniqueCities = [...new Set(publicEvents.map(event => {
          const parts = event.location?.split(',') || [];
          return parts[parts.length - 1]?.trim();
        }))].filter(Boolean).sort();
        setCities(uniqueCities);
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleNextScreen = (next) => setTimeout(() => setScreen(next), 200);

  const isWhenMatched = (eventDateValue, whenValue = selectedWhen) => {
    if (whenValue === 'any') return true;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDate = new Date(eventDateValue);
    const eventDayStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

    if (whenValue === 'weekend') {
      const day = eventDayStart.getDay();
      return day === 0 || day === 6;
    }

    if (whenValue === 'week') {
      const in7Days = new Date(today);
      in7Days.setDate(today.getDate() + 7);
      return eventDayStart >= today && eventDayStart <= in7Days;
    }

    if (whenValue === 'month') {
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return eventDayStart >= today && eventDayStart <= monthEnd;
    }

    return true;
  };

  const isBudgetMatched = (price) => {
    if (selectedBudget === 'any') return true;
    if (selectedBudget === 'free') return Number(price || 0) === 0;
    if (selectedBudget === 'under50') return Number(price || 0) <= 50;
    return true;
  };

  const handleRecommend = (whenOverride) => {
    const activeWhen = whenOverride || selectedWhen;
    const now = new Date();
    const ranked = allEvents
      .map(event => {
        let score = 0;
        let matchedCriteria = 0;

        const eventDate = new Date(event.start_date);
        if (Number.isNaN(eventDate.getTime())) return { event, score: -1, matchedCriteria: 0 };

        if (event.max_capacity > 0 && event.current_occupancy >= event.max_capacity) {
          return { event, score: -1, matchedCriteria: 0 };
        }

        if (!event.org_id) {
          return { event, score: -1, matchedCriteria: 0 };
        }

        const eventCity = event.location?.split(',').pop()?.trim()?.toLowerCase() || '';
        const eventPrice = Number(event.price || 0);
        const eventCategoryIds = (event.categories || []).map(cat => cat.id);

        const cityMatch = selectedCity === 'Oriunde' || eventCity === selectedCity.toLowerCase();
        const categoryMatch = selectedCategoryIds.length === 0 || selectedCategoryIds.some(id => eventCategoryIds.includes(id));
        const budgetMatch = isBudgetMatched(eventPrice);
        const whenMatch = isWhenMatched(event.start_date, activeWhen);

        if (cityMatch) { matchedCriteria += 1; score += 10; }
        if (categoryMatch) { matchedCriteria += 1; score += 10; }
        if (budgetMatch) { matchedCriteria += 1; score += 10; }
        if (whenMatch) { matchedCriteria += 1; score += 10; }

        if (eventDate >= now) {
          score += 6;
        }

        return { event, score, matchedCriteria };
      })
      .filter(item => item.score >= 0)
      .sort((a, b) => {
        if (b.matchedCriteria !== a.matchedCriteria) {
          return b.matchedCriteria - a.matchedCriteria;
        }

        const dateA = new Date(a.event.start_date).getTime();
        const dateB = new Date(b.event.start_date).getTime();
        return dateA - dateB;
      });

    const bestMatches = ranked.filter(item => item.matchedCriteria > 0);
    const finalItems = (bestMatches.length > 0 ? bestMatches : ranked).slice(0, 12);

    const results = finalItems.map(item => ({
      ...item.event,
      matchedCriteria: item.matchedCriteria
    }));

    sessionStorage.setItem('recommendationResults', JSON.stringify(results));
    sessionStorage.setItem('recommendationFilters', JSON.stringify({
      city: selectedCity,
      categories: selectedCategoryIds,
      budget: selectedBudget,
      when: activeWhen
    }));

    onClose();
    navigate('/recommendations', {
      state: {
        results
      }
    });
  };

  return (
    <div className={`wizard-drawer-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className={`wizard-drawer-panel ${isOpen ? 'open' : ''} ${didSubmit ? 'is-expanded' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="wizard-progress-thin" style={{ width: `${(screen / totalQuestions) * 100}%` }} />
        
        <button className="wizard-drawer-close" onClick={onClose}>×</button>

        {!didSubmit ? (
          <div className="wizard-drawer-content">
            <header className="wizard-drawer-header">
              <span className="wizard-step-badge">0{screen} / 0{totalQuestions}</span>
              <h2 className="wizard-drawer-title">{screenConfigs[screen].title}</h2>
              <p className="wizard-drawer-subtitle">{screenConfigs[screen].subtitle}</p>
            </header>

            <div className="wizard-drawer-body">
              {screen === 0 && (
                <button className="wizard-btn-black-pill" onClick={() => setScreen(1)} disabled={loading}>
                  {loading ? 'SE ÎNCARCĂ...' : screenConfigs[0].actionLabel}
                </button>
              )}
              {screen === 1 && (
                <div className="wizard-options-list">
                  <button className={`wizard-option-pill ${selectedCity === 'Oriunde' ? 'active' : ''}`} onClick={() => {setSelectedCity('Oriunde'); handleNextScreen(2)}}>ORIUNDE</button>
                  {cities.map(c => <button key={c} className={`wizard-option-pill ${selectedCity === c ? 'active' : ''}`} onClick={() => { setSelectedCity(c); handleNextScreen(2); }}>{c.toUpperCase()}</button>)}
                </div>
              )}
              {screen === 2 && (
                <>
                  <div className="wizard-options-list">
                    {categories.map(c => (
                      <button key={c.id} className={`wizard-option-pill ${selectedCategoryIds.includes(c.id) ? 'active' : ''}`} onClick={() => {
                        const ids = selectedCategoryIds.includes(c.id) ? selectedCategoryIds.filter(id => id !== c.id) : [...selectedCategoryIds, c.id];
                        setSelectedCategoryIds(ids);
                      }}>{c.name.toUpperCase()}</button>
                    ))}
                  </div>
                  <button className="wizard-btn-black-pill" style={{marginTop: '24px'}} onClick={() => setScreen(3)}>CONTINUĂ</button>
                </>
              )}
              {screen === 3 && (
                <div className="wizard-options-stack">
                  {budgetOptions.map(o => <button key={o.id} className={`wizard-option-pill large ${selectedBudget === o.id ? 'active' : ''}`} onClick={() => { setSelectedBudget(o.id); handleNextScreen(4); }}>{o.label}</button>)}
                </div>
              )}
              {screen === 4 && (
                <div className="wizard-options-stack">
                  {whenOptions.map(o => <button key={o.id} className={`wizard-option-pill large ${selectedWhen === o.id ? 'active' : ''}`} onClick={() => { setSelectedWhen(o.id); handleRecommend(o.id); }}>{o.label}</button>)}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="wizard-full-results">
            <header className="results-header-full">
              <h2 className="wizard-drawer-title">RECOMANDĂRILE NOASTRE</h2>
              <p className="wizard-drawer-subtitle">Am găsit {recommendedEvents.length} evenimente care rezonează cu stilul tău.</p>
            </header>

            <div className="wizard-results-grid-full">
              {recommendedEvents.length > 0 ? (
                recommendedEvents.map(event => (
                  <div key={event.id} className="result-card-premium" onClick={() => { onClose(); navigate(`/event/${event.id}`); }}>
                    <div className="result-img-wrapper">
                      <img src={event.image_url} alt="" />
                      <div className="result-price-tag">{Number(event.price) > 0 ? `${Number(event.price).toFixed(0)} lei` : 'Gratuit'}</div>
                    </div>
                    <div className="result-content">
                      <span className="result-date-label">
                         {new Date(event.start_date).toLocaleDateString('ro-RO', { month: 'short', day: 'numeric' }).toUpperCase()}
                      </span>
                      <h4>{event.title}</h4>
                      <p>{event.location?.split(',')[0].toUpperCase()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-results-wizard">Nu am găsit rezultate pe măsura selecției.</div>
              )}
            </div>

            <div className="wizard-footer-full">
               <button className="wizard-btn-black-pill small-width" onClick={resetWizard}>REIA CĂUTAREA</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationWizard;