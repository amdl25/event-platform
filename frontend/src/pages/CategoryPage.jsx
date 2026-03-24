import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { ro } from 'date-fns/locale/ro';
import API from '../api';
import EventCard from '../components/EventCard';
import '../styles/CategoryPage.css';

registerLocale('ro', ro);

const initialFilters = {
    city: 'Toate orașele',
    selectedDate: null,
    type: 'Toate'
};

const CategoryPage = ({ user }) => {
    const { categoryName } = useParams();
    const navigate = useNavigate();
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
        setLoading(true);
        API.get('/events')
            .then((res) => {
                const allVisibleEvents = res.data.filter(event => {
                    const isPublic = !!event.org_id;
                    const isMine = event.creator_id === user?.id;
                    return isPublic || isMine;
                });

                const isCity = allVisibleEvents.some(event => {
                    const eventCity = event.location.split(',').pop().trim();
                    return eventCity.toLowerCase() === categoryName.toLowerCase();
                });

                if (isCity) {
                    setFilters({ ...initialFilters, city: categoryName });
                    setEvents(allVisibleEvents);
                } else {
                    const filteredByCategory = allVisibleEvents.filter(event => 
                        event.categories?.some(cat => cat.name === categoryName)
                    );
                    setFilters(initialFilters);
                    setEvents(filteredByCategory);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [categoryName, user?.id]);

    const availableCities = [...new Set(events.map(event => {
        const parts = event.location.split(',');
        return parts[parts.length - 1]?.trim(); 
    }))].filter(Boolean);

    const filteredResults = events.filter(event => {
        const eventCity = event.location.split(',').pop().trim();
        const matchCity = filters.city === 'Toate orașele' || eventCity === filters.city;

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
                    <h1>
                        {filters.city !== 'Toate orașele' && filters.city.toLowerCase() === categoryName.toLowerCase()
                            ? `Evenimente în ${categoryName}` 
                            : categoryName}
                    </h1>
                    
                    <div className="category-filters-bar">
                        {filters.city === 'Toate orașele' && (
                            <div className="filter-item">
                                <label>Oraș</label>
                                <div className="input-with-clear">
                                    <select 
                                        value={filters.city} 
                                        onChange={(e) => handleFilterChange('city', e.target.value)}
                                    >
                                        <option>Toate orașele</option>
                                        {availableCities.map(city => <option key={city} value={city}>{city}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="filter-item calendar-filter">
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