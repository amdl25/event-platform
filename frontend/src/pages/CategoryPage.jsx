import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { ro } from 'date-fns/locale/ro';
import API from '../api';
import EventCard from '../components/EventCard';
import '../styles/CategoryPage.css';

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
    city: 'Toate orașele',
    selectedDate: null,
    type: 'Toate'
};

const CategoryPage = ({ user }) => {
    const { categoryName } = useParams();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState(initialFilters);

    const hasActiveFilters = 
        filters.city !== 'Toate orașele' || 
        filters.selectedDate !== null || 
        filters.type !== 'Toate';

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const resetField = (field) => {
        setFilters(prev => ({ ...prev, [field]: initialFilters[field] }));
    };

    const resetAllFilters = () => {
        setFilters(initialFilters);
    };

    useEffect(() => {
        const loadEvents = async () => {
            try {
                setLoading(true);
                const res = await API.get('/events');
                const allVisibleEvents = res.data.filter(event => {
                    const isPublic = !!event.org_id;
                    const isMine = event.creator_id === user?.id;
                    return isPublic || isMine;
                });

                const isCity = allVisibleEvents.some(event => {
                    const eventCity = event.location.split(',').pop().trim();
                    return normalizeText(eventCity) === normalizeText(categoryName);
                });

                if (isCity) {
                    const preferredCity = pickPreferredCityLabel(
                        allVisibleEvents.map(event => {
                            const eventCity = event.location.split(',').pop().trim();
                            return eventCity;
                        })
                    ).find((city) => normalizeText(city) === normalizeText(categoryName)) || categoryName;

                    setFilters({ ...initialFilters, city: preferredCity });
                    setEvents(allVisibleEvents);
                } else {
                    const filteredByCategory = allVisibleEvents.filter(event => 
                        event.categories?.some(cat => normalizeText(cat.name) === normalizeText(categoryName))
                    );
                    setFilters(initialFilters);
                    setEvents(filteredByCategory);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadEvents();
    }, [categoryName, user?.id]);

    const availableCities = pickPreferredCityLabel(events.map(event => {
        const parts = event.location.split(',');
        return parts[parts.length - 1]?.trim(); 
    }));

    const filteredResults = events.filter(event => {
        const eventCity = event.location.split(',').pop().trim();
        const matchCity = filters.city === 'Toate orașele' || normalizeText(eventCity) === normalizeText(filters.city);

        let matchPeriod = true;
        if (filters.selectedDate) {
            const eventDate = new Date(event.start_date).toDateString();
            const pickerDate = filters.selectedDate.toDateString();
            matchPeriod = eventDate === pickerDate;
        }

        const isFree = parseFloat(event.price) === 0;
        const matchType = filters.type === 'Toate' || 
                         (filters.type === 'Gratuite' && isFree) || 
                         (filters.type === 'Cu plată' && !isFree);

        return matchCity && matchPeriod && matchType;
    });

    return (
        <div className="category-page">
            <div className="container-max">
                <header className="category-header">
                    <div className="category-top-row">
                        <h1>
                            {filters.city !== 'Toate orașele' && normalizeText(filters.city) === normalizeText(categoryName)
                                ? `Evenimente în ${categoryName}`
                                : categoryName}
                        </h1>

                        <div className="category-filters-shell">
                            <div className="category-filters-bar">
                                <div className="category-filter-pill-container">
                                    <div className="category-input-with-clear">
                                        <select
                                            className="category-filter-select"
                                            value={filters.city}
                                            onChange={(e) => handleFilterChange('city', e.target.value)}
                                        >
                                            <option>Toate orașele</option>
                                            {availableCities.map(city => <option key={city} value={city}>{city}</option>)}
                                        </select>
                                        {filters.city !== 'Toate orașele' && (
                                            <button
                                                type="button"
                                                className="category-clear-filter-btn"
                                                onClick={() => resetField('city')}
                                                aria-label="Resetează orașul"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="category-filter-pill-container">
                                    <div className="category-input-with-clear">
                                        <DatePicker
                                            selected={filters.selectedDate}
                                            onChange={(date) => handleFilterChange('selectedDate', date)}
                                            dateFormat="dd/MM/yyyy"
                                            placeholderText="Orice dată"
                                            locale="ro"
                                            className="category-filter-select"
                                        />
                                        {filters.selectedDate !== null && (
                                            <button className="category-clear-filter-btn" onClick={() => resetField('selectedDate')}>×</button>
                                        )}
                                    </div>
                                </div>

                                <div className="category-filter-pill-container">
                                    <div className="category-input-with-clear">
                                        <select
                                            className="category-filter-select"
                                            value={filters.type}
                                            onChange={(e) => handleFilterChange('type', e.target.value)}
                                        >
                                            <option value="Toate">Toate prețurile</option>
                                            <option value="Gratuite">Gratuite</option>
                                            <option value="Cu plată">Cu plată</option>
                                        </select>
                                        {filters.type !== 'Toate' && (
                                            <button className="category-clear-filter-btn" onClick={() => resetField('type')}>×</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <p className="results-count">
                        {filteredResults.length} {filteredResults.length === 1 ? 'eveniment găsit' : 'evenimente găsite'}
                    </p>
                </header>

                <div className="events-grid">
                    {loading ? (
                        <p className="loading-text">Se încarcă...</p>
                    ) : filteredResults.length > 0 ? (
                        filteredResults.map(event => (
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
        </div>
    );
};

export default CategoryPage;