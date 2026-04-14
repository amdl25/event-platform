import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { ro } from 'date-fns/locale/ro';
import {
  FaMusic,
  FaPalette,
  FaMicrochip,
  FaDumbbell,
  FaLeaf,
  FaFilm,
  FaBookOpen,
  FaBriefcase,
  FaHeartPulse,
  FaUtensils,
  FaGlobe,
  FaCompass
} from 'react-icons/fa6';
import { useAllEvents, useCategories } from '../hooks/useEvents';
import EventCard from '../components/EventCard';
import '../styles/ExplorePage.css';

registerLocale('ro', ro);

const normalizeText = (value) => (
  value
    ?.toLowerCase()
    ?.trim()
    ?.normalize('NFD')
    ?.replace(/[\u0300-\u036f]/g, '')
);

const hasDiacritics = (value) => /[ăâîșțĂÂÎȘȚ]/.test(value || '');

const pickPreferredCityLabel = (cities) => {
  const cityMap = new Map();

  cities.filter(Boolean).forEach((city) => {
    const key = normalizeText(city);
    const current = cityMap.get(key);

    if (!current || (hasDiacritics(city) && !hasDiacritics(current))) {
      cityMap.set(key, city);
    }
  });

  return [...cityMap.values()];
};

const initialFilters = {
  category: 'Toate categoriile',
  city: 'Toate orașele',
  selectedDate: null,
  type: 'Toate'
};

const ExplorePage = () => {
  const [citySearch, setCitySearch] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [showAll, setShowAll] = useState(false);
  const navigate = useNavigate();

  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: allEvents = [], isLoading: eventsLoading } = useAllEvents();
  const publicEvents = useMemo(() => allEvents.filter((event) => Boolean(event.org_id)), [allEvents]);

  const getVisuals = (name) => {
    const normalizedName = name?.toLowerCase()?.trim();

    const map = {
      'muzică': FaMusic,
      'muzica': FaMusic,
      'artă': FaPalette,
      'arta': FaPalette,
      'tech': FaMicrochip,
      'tehnologie': FaMicrochip,
      'sport': FaDumbbell,
      'lifestyle': FaLeaf,
      'film': FaFilm,
      'cinema': FaFilm,
      'educație': FaBookOpen,
      'educatie': FaBookOpen,
      'business': FaBriefcase,
      'sănătate': FaHeartPulse,
      'sanatate': FaHeartPulse,
      'food': FaUtensils,
      'culinar': FaUtensils,
      'travel': FaGlobe,
      'călătorii': FaGlobe,
      'calatorii': FaGlobe
    };

    return map[normalizedName] || FaCompass;
  };

  const cities = useMemo(() => {
    const rawCities = publicEvents.map(event => {
      const parts = event.location?.split(',');
      return parts?.[parts.length - 1]?.trim();
    });

    return pickPreferredCityLabel(rawCities);
  }, [publicEvents]);

  const normalizedSearch = normalizeText(citySearch);
  const filteredCities = cities.filter((city) => normalizeText(city).includes(normalizedSearch));
  const availableCities = cities;

  const filteredEvents = publicEvents.filter((event) => {
    const matchCategory =
      filters.category === 'Toate categoriile' ||
      event.categories?.some((cat) => normalizeText(cat.name) === normalizeText(filters.category));

    const eventCity = event.location?.split(',')?.pop()?.trim();
    const matchCity = filters.city === 'Toate orașele' || normalizeText(eventCity) === normalizeText(filters.city);

    let matchDate = true;
    if (filters.selectedDate) {
      const eventDate = new Date(event.start_date).toDateString();
      const selectedDate = filters.selectedDate.toDateString();
      matchDate = eventDate === selectedDate;
    }

    const isFree = parseFloat(event.price) === 0;
    const matchType = filters.type === 'Toate' ||
      (filters.type === 'Gratuite' && isFree) ||
      (filters.type === 'Cu plată' && !isFree);

    return matchCategory && matchCity && matchDate && matchType;
  });

  const hasActiveFilters =
    filters.category !== 'Toate categoriile' ||
    filters.city !== 'Toate orașele' ||
    filters.selectedDate !== null ||
    filters.type !== 'Toate';

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetField = (field) => {
    setFilters((prev) => ({ ...prev, [field]: initialFilters[field] }));
  };

  const resetAllFilters = () => {
    setFilters(initialFilters);
  };

  const handleCitySelect = (city) => {
    navigate(`/category/${city}`);
  };

  const loading = categoriesLoading || eventsLoading;

  if (loading) return <div className="explore-loader">Se încarcă...</div>;

  return (
    <div className="discovery-page">
      <div className="container-max">
        
        <header className="explore-header">
          <div className="explore-header-top">
            <div className="explore-header-text">
              <h1 className="explore-title">Descoperă</h1>
              <p className="explore-subtitle">Găsește următoarea ta experiență memorabilă.</p>
            </div>

            {showAll ? (
              <div className="explore-header-controls">
                <button className="btn-browse-all" onClick={() => setShowAll(!showAll)}>
                  <i className="fi fi-rr-arrow-left"></i> Înapoi la categorii
                </button>

                <div className="explore-filters-bar">
                  <div className="filter-item">
                    <label>Categorie</label>
                    <div className="input-with-clear">
                      <select
                        value={filters.category}
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                      >
                        <option value="Toate categoriile">Toate categoriile</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                      {filters.category !== 'Toate categoriile' && (
                        <button className="clear-x-btn" onClick={() => resetField('category')}>×</button>
                      )}
                    </div>
                  </div>

                  <div className="filter-item">
                    <label>Oraș</label>
                    <div className="input-with-clear">
                      <select
                        value={filters.city}
                        onChange={(e) => handleFilterChange('city', e.target.value)}
                      >
                        <option>Toate orașele</option>
                        {availableCities.map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                      {filters.city !== 'Toate orașele' && (
                        <button className="clear-x-btn" onClick={() => resetField('city')}>×</button>
                      )}
                    </div>
                  </div>

                  <div className="filter-item">
                    <label>Când</label>
                    <div className="input-with-clear">
                      <DatePicker
                        selected={filters.selectedDate}
                        onChange={(date) => handleFilterChange('selectedDate', date)}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Selectează data"
                        locale="ro"
                        className="filter-select"
                      />
                      {filters.selectedDate !== null && (
                        <button className="clear-x-btn" onClick={() => resetField('selectedDate')}>×</button>
                      )}
                    </div>
                  </div>

                  <div className="filter-item">
                    <label>Acces</label>
                    <div className="input-with-clear">
                      <select
                        value={filters.type}
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                      >
                        <option value="Toate">Oricare</option>
                        <option value="Gratuite">Gratuite</option>
                        <option value="Cu plată">Cu plată</option>
                      </select>
                      {filters.type !== 'Toate' && (
                        <button className="clear-x-btn" onClick={() => resetField('type')}>×</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </header>

        <section className="explore-section">
          {!showAll ? (
            <div className="section-header-row">
              <h2 className="section-label">Categorii</h2>
              <button className="btn-browse-all" onClick={() => setShowAll(true)}>
                <>Vezi toate evenimentele <i className="fi fi-rr-arrow-right"></i></>
              </button>
            </div>
          ) : null}

          {showAll ? (
            <div className="explore-all-events-wrap">
              <p className="results-count explore-results-under-title">
                {filteredEvents.length} {filteredEvents.length === 1 ? 'eveniment găsit' : 'evenimente găsite'}
              </p>

              <div className="explore-events-grid">
                {filteredEvents.length > 0 ? (
                  filteredEvents.map((event) => (
                    <div key={event.id} className="event-card-wrapper">
                      <EventCard event={event} variant="compact" />
                    </div>
                  ))
                ) : (
                  <div className="no-results-container">
                    <p className="no-events">Niciun eveniment disponibil</p>
                    {hasActiveFilters && (
                      <button className="btn-reset-filters" onClick={resetAllFilters}>
                        <span className="reset-icon">↺</span> Resetează filtrele
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="category-grid">
              {categories.map((cat) => {
                const CategoryIcon = getVisuals(cat.name);
                return (
                  <div key={cat.id} className="category-card" onClick={() => navigate(`/category/${cat.name}`)}>
                    <div className="cat-card-icon">
                      <CategoryIcon />
                    </div>
                    <div className="cat-card-info">
                      <h3>{cat.name}</h3>
                      <span>Vezi evenimente</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {!showAll && (
          <section className="explore-section">
            <h2 className="section-label">Orașe</h2>
            <div className="cities-browser">
              <div className="city-search-dropdown-wrapper">
                <div className="city-search-box">
                  <i className="fi fi-rr-search"></i>
                  <input
                    type="text"
                    placeholder="Caută un oraș..."
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                  />
                </div>

                <div className="city-dropdown">
                  {filteredCities.length > 0 ? (
                    filteredCities.map((city) => (
                      <button
                        key={city}
                        type="button"
                        className="city-dropdown-item"
                        onClick={() => handleCitySelect(city)}
                      >
                        {city}
                      </button>
                    ))
                  ) : (
                    <p className="city-empty-state">Nu am găsit orașe pentru căutarea ta.</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
};

export default ExplorePage;