import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import API from '../api';
import '../styles/RecommendationWizard.css';

const normalizeCityKey = (value = '') => String(value)
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const hasDiacritics = (value = '') => {
  const normalized = normalizeCityKey(value);
  const lowered = String(value).trim().toLowerCase();
  return normalized !== lowered;
};

const extractCityFromLocation = (locationValue) => {
  const parts = String(locationValue || '').split(',');
  return parts[parts.length - 1]?.trim() || '';
};

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
  const [citySearch, setCitySearch] = useState('');

  const totalQuestions = 4;

  const budgetOptions = [
    { id: 'free', label: 'ACCES GRATUIT' },
    { id: 'low', label: 'SUB 100 LEI' },
    { id: 'mid', label: '100 - 300 LEI' },
    { id: 'high', label: 'PESTE 300 LEI' },
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
    3: { title: 'Buget', subtitle: 'Care este bugetul tău?' },
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
    setCitySearch('');
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
        const cityMap = new Map();
        publicEvents.forEach((event) => {
          const city = extractCityFromLocation(event.location);
          if (!city) return;

          const cityKey = normalizeCityKey(city);
          const existingCity = cityMap.get(cityKey);

          if (!existingCity) {
            cityMap.set(cityKey, city);
            return;
          }

          const currentHasDiacritics = hasDiacritics(city);
          const existingHasDiacritics = hasDiacritics(existingCity);

          if (currentHasDiacritics && !existingHasDiacritics) {
            cityMap.set(cityKey, city);
          }
        });

        const uniqueCities = Array.from(cityMap.values()).sort((a, b) => a.localeCompare(b, 'ro', { sensitivity: 'base' }));
        setCities(uniqueCities);
      } catch (error) { }
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
    const value = Number(price || 0);
    if (selectedBudget === 'any') return true;
    if (selectedBudget === 'free') return value === 0;
    if (selectedBudget === 'low') return value > 0 && value <= 100;
    if (selectedBudget === 'mid') return value > 100 && value <= 300;
    if (selectedBudget === 'high') return value > 300;
    return true;
  };

  const scoreAndSortEvents = (eventList, activeWhen) => eventList
    .map((event) => {
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

      const eventCity = extractCityFromLocation(event.location);
      const eventCityKey = normalizeCityKey(eventCity);
      const selectedCityKey = normalizeCityKey(selectedCity);
      const eventPrice = Number(event.price || 0);
      const eventCategoryIds = (event.categories || []).map((cat) => cat.id);

      const cityMatch = selectedCity === 'Oriunde' || eventCityKey === selectedCityKey;
      const categoryMatch = selectedCategoryIds.length === 0 || selectedCategoryIds.some((id) => eventCategoryIds.includes(id));
      const budgetMatch = isBudgetMatched(eventPrice);
      const whenMatch = isWhenMatched(event.start_date, activeWhen);

      if (cityMatch) { matchedCriteria += 1; score += 10; }
      if (categoryMatch) { matchedCriteria += 1; score += 10; }
      if (budgetMatch) { matchedCriteria += 1; score += 10; }
      if (whenMatch) { matchedCriteria += 1; score += 10; }

      if (eventDate >= new Date()) {
        score += 6;
      }

      return { event, score, matchedCriteria, cityMatch, categoryMatch, budgetMatch, whenMatch };
    })
    .filter((item) => item.score >= 0)
    .sort((a, b) => {
      if (b.matchedCriteria !== a.matchedCriteria) {
        return b.matchedCriteria - a.matchedCriteria;
      }

      const dateA = new Date(a.event.start_date).getTime();
      const dateB = new Date(b.event.start_date).getTime();
      return dateA - dateB;
    });

  const buildResults = (items, fallbackType) => {
    const results = items.slice(0, 12).map((item) => ({
      ...item.event,
      matchedCriteria: item.matchedCriteria
    }));

    const cityLabel = selectedCity === 'Oriunde' ? 'orașul tău' : selectedCity;
    const categoryLabel = selectedCategoryIds.length > 0 && categories.length > 0
      ? categories.filter((category) => selectedCategoryIds.includes(category.id)).map((category) => category.name).join(', ')
      : 'această categorie';
    const budgetLabel = selectedBudget === 'free' ? 'gratuite' : 'care se încadrează în bugetul tău';

    return {
      results,
      fallbackType,
      fallbackMessage: fallbackType === 'strict'
        ? ''
        : fallbackType === 'budget'
          ? `Nu am găsit evenimente ${selectedBudget === 'free' ? 'gratuite' : 'în buget'} în ${cityLabel}, dar aceste experiențe de ${categoryLabel} s-ar putea să te convingă să faci o excepție:`
          : fallbackType === 'city'
            ? `E liniște în ${cityLabel} pe partea de ${categoryLabel}. Am găsit însă aceste evenimente tari în alte orașe, dacă plănuiești o ieșire:`
            : 'Pauză de idei! 🕵️‍♂️ Nu am găsit nimic pe profilul tău acum. Ce-ar fi să încerci o altă categorie sau să cauți într-o perioadă mai aglomerată?'
    };
  };

  const handleRecommend = (whenOverride) => {
    const activeWhen = whenOverride || selectedWhen;
    const ranked = scoreAndSortEvents(allEvents, activeWhen);
    const cityKey = normalizeCityKey(selectedCity);
    const hasCityFilter = selectedCity !== 'Oriunde';
    const hasCategoryFilter = selectedCategoryIds.length > 0;
    const hasBudgetFilter = selectedBudget !== 'any';
    const hasWhenFilter = activeWhen !== 'any';

    const strictMatches = ranked.filter((item) => {
      const eventCityKey = normalizeCityKey(extractCityFromLocation(item.event.location));
      const eventCategoryIds = (item.event.categories || []).map((cat) => cat.id);

      const cityPass = !hasCityFilter || eventCityKey === cityKey;
      const categoryPass = !hasCategoryFilter || selectedCategoryIds.some((id) => eventCategoryIds.includes(id));
      const budgetPass = !hasBudgetFilter || isBudgetMatched(item.event.price);
      const whenPass = !hasWhenFilter || isWhenMatched(item.event.start_date, activeWhen);

      return cityPass && categoryPass && budgetPass && whenPass;
    });

    let payload;

    if (strictMatches.length > 0) {
      payload = buildResults(strictMatches, 'strict');
    } else {
      const budgetFallback = ranked.filter((item) => {
        const eventCityKey = normalizeCityKey(extractCityFromLocation(item.event.location));
        const eventCategoryIds = (item.event.categories || []).map((cat) => cat.id);

        const cityPass = !hasCityFilter || eventCityKey === cityKey;
        const categoryPass = !hasCategoryFilter || selectedCategoryIds.some((id) => eventCategoryIds.includes(id));
        const whenPass = !hasWhenFilter || isWhenMatched(item.event.start_date, activeWhen);

        return cityPass && categoryPass && whenPass;
      });

      if (budgetFallback.length > 0) {
        payload = buildResults(budgetFallback, 'budget');
      } else {
        const cityFallback = ranked.filter((item) => {
          const eventCategoryIds = (item.event.categories || []).map((cat) => cat.id);

          const categoryPass = !hasCategoryFilter || selectedCategoryIds.some((id) => eventCategoryIds.includes(id));
          const whenPass = !hasWhenFilter || isWhenMatched(item.event.start_date, activeWhen);

          return categoryPass && whenPass;
        });

        payload = cityFallback.length > 0
          ? buildResults(cityFallback, 'city')
          : {
              results: [],
              fallbackType: 'none',
              fallbackMessage: 'Am căutat peste tot, dar se pare că e o perioadă neobișnuit de calmă. Încearcă să schimbi categoria sau să alegi o altă perioadă?'
            };
      }
    }

    const { results, fallbackType, fallbackMessage } = payload;

    onClose();
    navigate('/recommendations', {
      state: {
        results,
        fallbackType,
        fallbackMessage,
        filters: {
          city: selectedCity,
          categories: selectedCategoryIds,
          budget: selectedBudget,
          when: activeWhen
        }
      }
    });
  };

  return (
    <div className={`wizard-drawer-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className={`wizard-drawer-panel ${isOpen ? 'open' : ''} ${didSubmit ? 'is-expanded' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="wizard-progress-thin" style={{ width: `${(screen / totalQuestions) * 100}%` }} />
        
        <button className="wizard-drawer-close" onClick={onClose}>×</button>
        {screen > 0 && !didSubmit && (
          <button className="wizard-back-btn" onClick={() => setScreen(s => s - 1)}>
            <FiArrowLeft /> Înapoi
          </button>
        )}

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
                  {screenConfigs[0].actionLabel}
                </button>
              )}
              {screen === 1 && (
                <div className="wizard-city-picker">
                  <button
                    className={`wizard-option-pill large ${selectedCity === 'Oriunde' ? 'active' : ''}`}
                    onClick={() => { setSelectedCity('Oriunde'); handleNextScreen(2); }}
                  >
                    ORIUNDE
                  </button>
                  <div className="wizard-city-divider">sau alege un oraș</div>
                  <div className="wizard-city-search-wrap">
                    <input
                      type="text"
                      className="wizard-city-search"
                      placeholder="Caută oraș..."
                      value={citySearch}
                      onChange={e => setCitySearch(e.target.value)}
                    />
                    <div className="wizard-city-list">
                      {cities
                        .filter(c => c.toLowerCase().includes(citySearch.toLowerCase()))
                        .map(c => (
                          <button
                            key={c}
                            className={`wizard-city-item ${selectedCity === c ? 'active' : ''}`}
                            onClick={() => { setSelectedCity(c); handleNextScreen(2); }}
                          >
                            {c}
                          </button>
                        ))}
                      {cities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase())).length === 0 && (
                        <p className="wizard-city-empty">Niciun oraș găsit</p>
                      )}
                    </div>
                  </div>
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