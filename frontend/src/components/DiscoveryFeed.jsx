import React, { useEffect, useState } from 'react';
import API from '../api';
import EventCard from '../components/EventCard';
import CustomDropdown from './CustomDropdown';
import '../styles/DiscoveryFeed.css';

const initialDiscoveryFilters = {
    weekday: 'Oricând',
    category: 'Toate',
    price: 'Toate',
};

const toLocalDateKey = (dateValue) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const DiscoveryFeed = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dbCategories, setDbCategories] = useState([]);
    const [filters, setFilters] = useState(initialDiscoveryFilters);

    const resetFilters = () => setFilters(initialDiscoveryFilters);

    const resetField = (fieldName) => {
        setFilters(prev => ({
            ...prev,
            [fieldName]: initialDiscoveryFilters[fieldName]
        }));
    };

    useEffect(() => {
        API.get('/categories')
            .then(res => setDbCategories(res.data))
            .catch(err => console.error("Eroare categorii:", err));

        API.get('/events')
            .then((response) => {
                setEvents(Array.isArray(response.data) ? response.data : []);
            })
            .catch((err) => {
                console.error("Eroare la încărcarea evenimentelor:", err);
            })
            .finally(() => setLoading(false));
    }, []);

    const handleFilterChange = (filterKey, value) => {
        setFilters(prev => ({ ...prev, [filterKey]: value }));
    };

    const filteredEvents = events.filter(event => {
        const matchCategory = filters.category === 'Toate' || 
            event.categories?.some(cat => cat.name === filters.category);

        const matchDate = (() => {
            const eventStart = event.start_date || event.start;
            const eventDate = new Date(eventStart);
            if (Number.isNaN(eventDate.getTime())) return false;

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const nextWeekLimit = new Date(tomorrow);
            nextWeekLimit.setDate(tomorrow.getDate() + 6);

            const eventKey = toLocalDateKey(eventDate);
            const todayKey = toLocalDateKey(today);
            const tomorrowKey = toLocalDateKey(tomorrow);
            const nextWeekLimitKey = toLocalDateKey(nextWeekLimit);

            if (!eventKey || !todayKey || !tomorrowKey || !nextWeekLimitKey) return false;

            const isFromTomorrow = eventKey >= tomorrowKey;

            if (filters.weekday === 'Oricând') return isFromTomorrow;
            if (filters.weekday === 'Astăzi') return eventKey === todayKey;
            if (filters.weekday === 'Mâine') return eventKey === tomorrowKey;
            if (filters.weekday === 'În weekend') return isFromTomorrow && [0, 6].includes(eventDate.getDay());
            if (filters.weekday === 'Săptămâna viitoare') return eventKey >= tomorrowKey && eventKey <= nextWeekLimitKey;
            return true;
        })();

        const eventPrice = parseFloat(event.price);
        const matchPrice = filters.price === 'Toate' || 
            (filters.price === 'Gratuite' && eventPrice === 0) ||
            (filters.price === 'Cu plată' && eventPrice > 0);

        return matchCategory && matchDate && matchPrice;
    });

    const publicEvents = filteredEvents.filter(e => !!e.org_id);
    const weekdayOptions = [
        { value: 'Oricând', label: 'Orice dată' },
        { value: 'Astăzi', label: 'Astăzi' },
        { value: 'Mâine', label: 'Mâine' },
        { value: 'În weekend', label: 'În weekend' },
        { value: 'Săptămâna viitoare', label: 'Săptămâna viitoare' }
    ];

    const categoryOptions = [
        { value: 'Toate', label: 'Orice categorie' },
        ...dbCategories.map((cat) => ({ value: cat.name, label: cat.name }))
    ];

    const priceOptions = [
        { value: 'Toate', label: 'Toate prețurile' },
        { value: 'Gratuite', label: 'Gratuite' },
        { value: 'Cu plată', label: 'Cu plată' }
    ];

    return (
        <div className="discovery-page">
            <section className="filters-section">
                <div className="discovery-container">
                    <div className="filters-header-row">
                        <h2>Evenimente viitoare</h2>
                        <div className="filters-row">
                            
                            <div className="filter-pill-container">
                                <CustomDropdown
                                    value={filters.weekday}
                                    options={weekdayOptions}
                                    onChange={(nextValue) => handleFilterChange('weekday', nextValue)}
                                    clearable={filters.weekday !== 'Oricând'}
                                    onClear={() => resetField('weekday')}
                                    triggerClassName="filter-select"
                                    menuClassName="filter-dropdown-menu"
                                    optionClassName="filter-dropdown-option"
                                    ariaLabel="Filtru dată"
                                />
                            </div>

                            <div className="filter-pill-container">
                                <CustomDropdown
                                    value={filters.category}
                                    options={categoryOptions}
                                    onChange={(nextValue) => handleFilterChange('category', nextValue)}
                                    clearable={filters.category !== 'Toate'}
                                    onClear={() => resetField('category')}
                                    triggerClassName="filter-select"
                                    menuClassName="filter-dropdown-menu"
                                    optionClassName="filter-dropdown-option"
                                    ariaLabel="Filtru categorie"
                                />
                            </div>

                            <div className="filter-pill-container">
                                <CustomDropdown
                                    value={filters.price}
                                    options={priceOptions}
                                    onChange={(nextValue) => handleFilterChange('price', nextValue)}
                                    clearable={filters.price !== 'Toate'}
                                    onClear={() => resetField('price')}
                                    triggerClassName="filter-select"
                                    menuClassName="filter-dropdown-menu"
                                    optionClassName="filter-dropdown-option"
                                    ariaLabel="Filtru preț"
                                />
                            </div>

                        </div>
                    </div>
                </div>
            </section>

            <section className="events-section">
                <div className="discovery-container">
                    {loading ? (
                        null
                    ) : publicEvents.length > 0 ? (
                        <>
                            <div className="events-grid">
                                {publicEvents.map((event) => (
                                    <div key={event.id} className="event-card-wrapper">
                                        <EventCard event={event} variant="compact" />
                                    </div>
                                ))}
                            </div>
                            <div className="load-more-container">
                                <button className="btn-load-more">Vezi mai mult</button>
                            </div>
                        </>
                    ) : (
                        <div className="no-events-container">
                            <p className="no-events">Niciun eveniment găsit</p>
                            <button className="btn-reset-filters-discovery" onClick={resetFilters}>
                                ↺ Resetează filtrele
                            </button>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default DiscoveryFeed;