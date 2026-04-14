import React, { useEffect, useState } from 'react';
import API from '../api';
import EventCard from '../components/EventCard';
import '../styles/DiscoveryFeed.css';

const initialDiscoveryFilters = {
    weekday: 'Oricând',
    category: 'Toate',
    price: 'Toate',
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
            if (filters.weekday === 'Oricând') return true;
            const eventDate = new Date(event.start_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);

            if (filters.weekday === 'Astăzi') return eventDate.toDateString() === today.toDateString();
            if (filters.weekday === 'Mâine') return eventDate.toDateString() === tomorrow.toDateString();
            if (filters.weekday === 'În weekend') return [0, 6].includes(eventDate.getDay());
            return true;
        })();

        const eventPrice = parseFloat(event.price);
        const matchPrice = filters.price === 'Toate' || 
            (filters.price === 'Gratuite' && eventPrice === 0) ||
            (filters.price === 'Cu plată' && eventPrice > 0);

        return matchCategory && matchDate && matchPrice;
    });

    const publicEvents = filteredEvents.filter(e => !!e.org_id);

    return (
        <div className="discovery-page">
            <section className="filters-section">
                <div className="container-max">
                    <div className="filters-header-row">
                        <h2>Evenimente viitoare</h2>
                        <div className="filters-row">
                            
                            <div className="filter-pill-container">
                                <select 
                                    className="filter-select"
                                    value={filters.weekday}
                                    onChange={(e) => handleFilterChange('weekday', e.target.value)}
                                >
                                    <option value="Oricând">Orice dată</option>
                                    <option>Astăzi</option>
                                    <option>Mâine</option>
                                    <option>În weekend</option>
                                    <option>Săptămâna viitoare</option>
                                </select>
                                {filters.weekday !== 'Oricând' && (
                                    <button className="clear-filter-btn" onClick={() => resetField('weekday')}>×</button>
                                )}
                            </div>

                            <div className="filter-pill-container">
                                <select 
                                    className="filter-select"
                                    value={filters.category}
                                    onChange={(e) => handleFilterChange('category', e.target.value)}
                                >
                                    <option value="Toate">Orice categorie</option>
                                    {dbCategories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                                {filters.category !== 'Toate' && (
                                    <button className="clear-filter-btn" onClick={() => resetField('category')}>×</button>
                                )}
                            </div>

                            <div className="filter-pill-container">
                                <select 
                                    className="filter-select"
                                    value={filters.price}
                                    onChange={(e) => handleFilterChange('price', e.target.value)}
                                >
                                    <option value="Toate">Toate prețurile</option>
                                    <option>Gratuite</option>
                                    <option>Cu plată</option>
                                </select>
                                {filters.price !== 'Toate' && (
                                    <button className="clear-filter-btn" onClick={() => resetField('price')}>×</button>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            </section>

            <section className="events-section">
                <div className="container-max">
                    {loading ? (
                        <p className="loading-text">Se încarcă...</p>
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