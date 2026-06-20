import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { ro } from 'date-fns/locale/ro';
import { useAllEvents, useCategories } from '../hooks/useEvents';
import EventCard from '../components/EventCard';
import CustomDropdown from '../components/CustomDropdown';
import '../styles/ExplorePage.css';

registerLocale('ro', ro);

const normalizeText = (value) => (
  value?.toLowerCase()?.trim()?.normalize('NFD')?.replace(/[̀-ͯ]/g, '')
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
  type: 'Toate',
};

const QUICK_PILLS = [
  { id: 'toate', label: 'Toate' },
  { id: 'azi', label: 'Azi' },
  { id: 'weekend', label: 'Weekend' },
  { id: 'gratuit', label: 'Gratuit' },
];

const getWeekendDates = () => {
  const now = new Date();
  const day = now.getDay();
  const dates = [];
  if (day === 6) {
    dates.push(new Date(now));
    const sun = new Date(now); sun.setDate(now.getDate() + 1); dates.push(sun);
  } else if (day === 0) {
    dates.push(new Date(now));
  } else {
    const sat = new Date(now); sat.setDate(now.getDate() + (6 - day)); dates.push(sat);
    const sun = new Date(sat); sun.setDate(sat.getDate() + 1); dates.push(sun);
  }
  return dates;
};

const ExplorePage = () => {
  const [filters, setFilters] = useState(initialFilters);
  const [quickFilter, setQuickFilter] = useState('toate');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: allEvents = [], isLoading: eventsLoading } = useAllEvents();

  const orgIdParam = useMemo(() => new URLSearchParams(location.search).get('orgId'), [location.search]);
  const orgNameParam = useMemo(() => new URLSearchParams(location.search).get('orgName'), [location.search]);
  const qParam = useMemo(() => new URLSearchParams(location.search).get('q') || '', [location.search]);
  const cityParam = useMemo(() => new URLSearchParams(location.search).get('city') || '', [location.search]);

  useEffect(() => {
    setSearchQuery(qParam);
  }, [qParam]);

  useEffect(() => {
    if (cityParam) {
      setFilters(prev => ({ ...prev, city: cityParam }));
    }
  }, [cityParam]);

  const publicEvents = useMemo(() =>
    allEvents.filter(event => Boolean(event.org_id) && (!orgIdParam || String(event.org_id) === String(orgIdParam))),
    [allEvents, orgIdParam]
  );

  const cities = useMemo(() => {
    const rawCities = publicEvents.map(event => {
      const parts = event.location?.split(',');
      return parts?.[parts.length - 1]?.trim();
    });
    return pickPreferredCityLabel(rawCities);
  }, [publicEvents]);

  const filteredEvents = useMemo(() => {
    const today = new Date();
    const weekendDates = getWeekendDates();
    const normalizedQuery = normalizeText(searchQuery.trim());

    return publicEvents.filter(event => {
      const matchSearch = !normalizedQuery ||
        normalizeText(event.title || '').includes(normalizedQuery) ||
        normalizeText(event.description || '').includes(normalizedQuery) ||
        normalizeText(event.location || '').includes(normalizedQuery);

      const matchCategory =
        filters.category === 'Toate categoriile' ||
        event.categories?.some(cat => normalizeText(cat.name) === normalizeText(filters.category));

      const eventCity = event.location?.split(',')?.pop()?.trim();
      const normalizedFilterCity = normalizeText(filters.city);
      const normalizedEventCity = normalizeText(eventCity);
      const matchCity =
        filters.city === 'Toate orașele' ||
        normalizedEventCity === normalizedFilterCity ||
        normalizedEventCity?.includes(normalizedFilterCity) ||
        normalizedFilterCity?.includes(normalizedEventCity);

      let matchDate = true;
      if (filters.selectedDate) {
        matchDate = new Date(event.start_date).toDateString() === filters.selectedDate.toDateString();
      }

      const isFree = parseFloat(event.price) === 0;
      const matchType =
        filters.type === 'Toate' ||
        (filters.type === 'Gratuite' && isFree) ||
        (filters.type === 'Cu plată' && !isFree);

      let matchQuick = true;
      if (quickFilter === 'azi') {
        matchQuick = new Date(event.start_date).toDateString() === today.toDateString();
      } else if (quickFilter === 'weekend') {
        const eventDateStr = new Date(event.start_date).toDateString();
        matchQuick = weekendDates.some(d => d.toDateString() === eventDateStr);
      } else if (quickFilter === 'gratuit') {
        matchQuick = isFree;
      }

      return matchSearch && matchCategory && matchCity && matchDate && matchType && matchQuick;
    });
  }, [publicEvents, filters, quickFilter, searchQuery]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    filters.category !== 'Toate categoriile' ||
    filters.city !== 'Toate orașele' ||
    filters.selectedDate !== null ||
    filters.type !== 'Toate' ||
    quickFilter !== 'toate';

  const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));
  const resetField = (field) => setFilters(prev => ({ ...prev, [field]: initialFilters[field] }));
  const resetAllFilters = () => { setFilters(initialFilters); setQuickFilter('toate'); setSearchQuery(''); };

  const loading = categoriesLoading || eventsLoading;

  const categoryOptions = [
    { value: 'Toate categoriile', label: 'Toate categoriile' },
    ...categories.map(cat => ({ value: cat.name, label: cat.name })),
  ];

  const cityOptions = [
    { value: 'Toate orașele', label: 'Toate orașele' },
    ...cities.map(city => ({ value: city, label: city })),
  ];

  const typeOptions = [
    { value: 'Toate', label: 'Oricare' },
    { value: 'Gratuite', label: 'Gratuite' },
    { value: 'Cu plată', label: 'Cu plată' },
  ];

  if (loading) return null;

  return (
    <div className="discovery-page">
      <div className="container-max">

        <header className="explore-header">
          <h1 className="explore-title">
            {orgIdParam && orgNameParam
              ? orgNameParam
              : searchQuery.trim() && cityParam.trim()
                ? `Rezultate pentru „${searchQuery.trim()}" în „${cityParam.trim()}"`
                : searchQuery.trim()
                  ? `Rezultate pentru „${searchQuery.trim()}"`
                  : cityParam.trim()
                    ? `Evenimente în „${cityParam.trim()}"`
                    : 'Descoperă evenimente'}
          </h1>
          <p className="explore-subtitle">
            {orgIdParam && orgNameParam
              ? 'Evenimentele acestui organizator, unde poți folosi punctele tale ca reducere.'
              : 'Găsește următoarea ta experiență memorabilă.'}
          </p>
        </header>

        {!orgIdParam && (
          <div className="explore-quick-pills">
            {QUICK_PILLS.map(pill => (
              <button
                key={pill.id}
                className={`explore-pill${quickFilter === pill.id ? ' active' : ''}`}
                onClick={() => setQuickFilter(pill.id)}
              >
                {pill.label}
              </button>
            ))}
          </div>
        )}

        <div className="explore-filters-row">
          {orgIdParam && (
            <button className="explore-back-link" onClick={() => navigate('/explore')}>
              <i className="fi fi-rr-arrow-left"></i> Înapoi
            </button>
          )}

          <div className="explore-filters-bar">
            <div className="filter-item">
              <label>Categorie</label>
              <div className="input-with-clear">
                <CustomDropdown
                  value={filters.category}
                  options={categoryOptions}
                  onChange={v => handleFilterChange('category', v)}
                  clearable={filters.category !== 'Toate categoriile'}
                  onClear={() => resetField('category')}
                  triggerClassName="filter-select"
                  menuClassName="explore-dropdown-menu"
                  optionClassName="explore-dropdown-option"
                  ariaLabel="Filtru categorie"
                />
              </div>
            </div>

            <div className="filter-item">
              <label>Oraș</label>
              <div className="input-with-clear">
                <CustomDropdown
                  value={filters.city}
                  options={cityOptions}
                  onChange={v => handleFilterChange('city', v)}
                  clearable={filters.city !== 'Toate orașele'}
                  onClear={() => resetField('city')}
                  triggerClassName="filter-select"
                  menuClassName="explore-dropdown-menu"
                  optionClassName="explore-dropdown-option"
                  ariaLabel="Filtru oraș"
                />
              </div>
            </div>

            <div className="filter-item">
              <label>Când</label>
              <div className="input-with-clear">
                <DatePicker
                  selected={filters.selectedDate}
                  onChange={date => handleFilterChange('selectedDate', date)}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Selectează data"
                  locale="ro"
                  className="filter-select"
                />
                {filters.selectedDate && (
                  <button className="clear-x-btn" onClick={() => resetField('selectedDate')}>×</button>
                )}
              </div>
            </div>

            <div className="filter-item">
              <label>Acces</label>
              <div className="input-with-clear">
                <CustomDropdown
                  value={filters.type}
                  options={typeOptions}
                  onChange={v => handleFilterChange('type', v)}
                  clearable={filters.type !== 'Toate'}
                  onClear={() => resetField('type')}
                  triggerClassName="filter-select"
                  menuClassName="explore-dropdown-menu"
                  optionClassName="explore-dropdown-option"
                  ariaLabel="Filtru acces"
                />
              </div>
            </div>
          </div>
        </div>

        <section className="explore-section">
          <p className="results-count explore-results-under-title">
            {filteredEvents.length} {filteredEvents.length === 1 ? 'eveniment găsit' : 'evenimente găsite'}
          </p>

          <div className="explore-events-grid">
            {filteredEvents.length > 0 ? (
              filteredEvents.map(event => (
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
        </section>

      </div>
    </div>
  );
};

export default ExplorePage;
