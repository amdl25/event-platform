import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiRotateCcw } from 'react-icons/fi';
import API from '../api';
import '../styles/RecommendationResultsPage.css';

const normalizeCityKey = (value = '') => String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const extractCityFromLocation = (locationValue) => {
    const parts = String(locationValue || '').split(',');
    return parts[parts.length - 1]?.trim() || '';
};

const isWhenMatched = (eventDateValue, whenValue) => {
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

const isBudgetMatched = (budget, price) => {
    if (budget === 'any') return true;
    if (budget === 'free') return Number(price || 0) === 0;
    if (budget === 'under50') return Number(price || 0) <= 50;
    return true;
};

const getCategoryLabel = (allEvents, selectedCategoryIds = []) => {
    if (!Array.isArray(selectedCategoryIds) || selectedCategoryIds.length === 0) return 'această categorie';

    const categoryMap = new Map();
    allEvents.forEach((event) => {
        (event.categories || []).forEach((category) => {
            if (category?.id && category?.name) {
                categoryMap.set(category.id, category.name);
            }
        });
    });

    const names = selectedCategoryIds
        .map((id) => categoryMap.get(id))
        .filter(Boolean);

    return names.length > 0 ? names.join(', ') : 'această categorie';
};

const buildFallbackMessage = (fallbackType, filters, categoryLabel) => {
    const cityLabel = filters.city && filters.city !== 'Oriunde' ? filters.city : 'orașul tău';

    if (fallbackType === 'budget') {
        return `Nu am găsit potrivirea perfectă în ${cityLabel}, dar iată câteva alternative excelente în apropiere, din ${categoryLabel}.`;
    }

    if (fallbackType === 'city') {
        return `Nu am găsit potrivirea perfectă în ${cityLabel}, dar iată câteva alternative excelente în apropiere, din ${categoryLabel}.`;
    }

    if (fallbackType === 'none') {
        return 'Nu am găsit încă o potrivire suficient de apropiată pentru filtrele tale. Poți încerca o categorie mai largă, alt oraș sau o perioadă diferită.';
    }

    return '';
};

const getFallbackBadge = (fallbackType) => {
    if (fallbackType === 'budget') return { icon: null, label: 'Potriviri apropiate' };
    if (fallbackType === 'city') return { icon: null, label: 'Recomandări apropiate' };
    return { icon: null, label: 'Selecție restrânsă' };
};

const RecommendationResultsPage = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const stateResults = Array.isArray(location.state?.results) ? location.state.results : [];
    const fallbackType = location.state?.fallbackType || (() => {
        try {
            const raw = sessionStorage.getItem('recommendationFallback');
            return raw ? JSON.parse(raw)?.type || 'strict' : 'strict';
        } catch {
            return 'strict';
        }
    })();
    const fallbackMessage = location.state?.fallbackMessage || (() => {
        try {
            const raw = sessionStorage.getItem('recommendationFallback');
            return raw ? JSON.parse(raw)?.message || '' : '';
        } catch {
            return '';
        }
    })();
    const cachedResults = (() => {
        try {
            const raw = sessionStorage.getItem('recommendationResults');
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    })();

    const results = stateResults.length > 0 ? stateResults : cachedResults;
    const [liveResults, setLiveResults] = useState(results);
    const [liveFallbackType, setLiveFallbackType] = useState(fallbackType);
    const [liveFallbackMessage, setLiveFallbackMessage] = useState(fallbackMessage);
    const [allEvents, setAllEvents] = useState([]);

    const refreshResults = async () => {
        try {
            let filters = null;

            try {
                const rawFilters = sessionStorage.getItem('recommendationFilters');
                filters = rawFilters ? JSON.parse(rawFilters) : null;
            } catch {
                filters = null;
            }

            if (!filters) {
                setLiveResults([]);
                setLiveFallbackType('none');
                setLiveFallbackMessage('Nu mai avem filtre salvate. Reia căutarea din wizard pentru recomandări noi.');
                return;
            }

            const response = await API.get('/events');
                const allEvents = (response.data || []).filter((event) => {
                    if (!event?.org_id) return false;
                    if (event.max_capacity > 0 && event.current_occupancy >= event.max_capacity) return false;
                    const eventDate = new Date(event.start_date);
                    return !Number.isNaN(eventDate.getTime());
                });

                const selectedCity = filters.city || 'Oriunde';
                const selectedCategoryIds = Array.isArray(filters.categories) ? filters.categories : [];
                const selectedBudget = filters.budget || 'any';
                const selectedWhen = filters.when || 'any';

                const cityKey = normalizeCityKey(selectedCity);
                const hasCityFilter = selectedCity !== 'Oriunde';
                const hasCategoryFilter = selectedCategoryIds.length > 0;
                const hasBudgetFilter = selectedBudget !== 'any';
                const hasWhenFilter = selectedWhen !== 'any';

                const sorted = [...allEvents].sort((a, b) => {
                    const dateA = new Date(a.start_date).getTime();
                    const dateB = new Date(b.start_date).getTime();
                    return dateA - dateB;
                });

                const matchesStrict = sorted.filter((event) => {
                    const eventCityKey = normalizeCityKey(extractCityFromLocation(event.location));
                    const eventCategoryIds = (event.categories || []).map((category) => category.id);

                    const cityPass = !hasCityFilter || eventCityKey === cityKey;
                    const categoryPass = !hasCategoryFilter || selectedCategoryIds.some((id) => eventCategoryIds.includes(id));
                    const budgetPass = !hasBudgetFilter || isBudgetMatched(selectedBudget, event.price);
                    const whenPass = !hasWhenFilter || isWhenMatched(event.start_date, selectedWhen);

                    return cityPass && categoryPass && budgetPass && whenPass;
                });

                const matchesBudgetFallback = sorted.filter((event) => {
                    const eventCityKey = normalizeCityKey(extractCityFromLocation(event.location));
                    const eventCategoryIds = (event.categories || []).map((category) => category.id);

                    const cityPass = !hasCityFilter || eventCityKey === cityKey;
                    const categoryPass = !hasCategoryFilter || selectedCategoryIds.some((id) => eventCategoryIds.includes(id));
                    const whenPass = !hasWhenFilter || isWhenMatched(event.start_date, selectedWhen);

                    return cityPass && categoryPass && whenPass;
                });

                const matchesCityFallback = sorted.filter((event) => {
                    const eventCategoryIds = (event.categories || []).map((category) => category.id);

                    const categoryPass = !hasCategoryFilter || selectedCategoryIds.some((id) => eventCategoryIds.includes(id));
                    const whenPass = !hasWhenFilter || isWhenMatched(event.start_date, selectedWhen);

                    return categoryPass && whenPass;
                });

                let nextType = 'strict';
                let nextResults = matchesStrict;

                if (matchesStrict.length === 0) {
                    if (matchesBudgetFallback.length > 0) {
                        nextType = 'budget';
                        nextResults = matchesBudgetFallback;
                    } else if (matchesCityFallback.length > 0) {
                        nextType = 'city';
                        nextResults = matchesCityFallback;
                    } else {
                        nextType = 'none';
                        nextResults = [];
                    }
                }

                const categoryLabel = getCategoryLabel(allEvents, selectedCategoryIds);
                const nextMessage = buildFallbackMessage(nextType, {
                    city: selectedCity,
                    budget: selectedBudget
                }, categoryLabel);

                const finalResults = nextResults.slice(0, 12);
                const allEventsToShow = sorted.slice(0, 16);

                setLiveResults(finalResults);
                setAllEvents(allEventsToShow);
                setLiveFallbackType(nextType);
            sessionStorage.setItem('recommendationResults', JSON.stringify(finalResults));
            sessionStorage.setItem('recommendationFallback', JSON.stringify({
                type: nextType,
                message: nextMessage
            }));
        } catch {
        }
    };

    useEffect(() => {
        refreshResults();
    }, []);

    const isCityFallbackLive = liveFallbackType === 'city';

    return (
        <div className="recommendation-page container-max">
            <header className="recommendation-header">
                <h1>RECOMANDĂRILE NOASTRE</h1>
                {liveResults.length > 0 ? (
                    <p>
                        Am găsit {liveResults.length} {liveResults.length === 1 ? 'eveniment' : 'evenimente'} pentru criteriile tale.
                    </p>
                ) : null}
            </header>

            {liveResults.length > 0 ? (
                <div className="recommendation-grid">
                    {liveResults.map((event) => (
                        <article
                            key={event.id}
                            className={`recommendation-card ${isCityFallbackLive ? 'city-fallback' : ''}`}
                            onClick={() => navigate(`/event/${event.id}`)}
                        >
                            <div className="recommendation-image-wrap">
                                {event.image_url ? (
                                    <img src={event.image_url} alt={event.title} className="recommendation-image" />
                                ) : (
                                    <div className="recommendation-image recommendation-placeholder">
                                        {event.title?.charAt(0) || 'E'}
                                    </div>
                                )}
                                <span className="recommendation-price">
                                    {Number(event.price) > 0 ? `${Number(event.price).toFixed(0)} lei` : 'Gratuit'}
                                </span>
                                {extractCityFromLocation(event.location) ? (
                                    <span className={`recommendation-city-badge ${isCityFallbackLive ? 'highlighted' : ''}`}>
                                        {extractCityFromLocation(event.location)}
                                    </span>
                                ) : null}
                            </div>

                            <div className="recommendation-content">
                                <span className="recommendation-date">
                                    {new Date(event.start_date).toLocaleDateString('ro-RO', {
                                        month: 'short',
                                        day: 'numeric'
                                    }).toUpperCase()}
                                </span>
                                <h3>{event.title}</h3>
                                <p>{event.location}</p>
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <>
                    <div className="recommendation-no-results">
                        <p className="recommendation-empty-message">Nu am găsit potrivirea perfectă, dar aruncă o privire aici:</p>
                    </div>
                    {allEvents.length > 0 && (
                        <div className="recommendation-grid">
                            {allEvents.map((event) => (
                                <article
                                    key={event.id}
                                    className="recommendation-card"
                                    onClick={() => navigate(`/event/${event.id}`)}
                                >
                                    <div className="recommendation-image-wrap">
                                        {event.image_url ? (
                                            <img src={event.image_url} alt={event.title} className="recommendation-image" />
                                        ) : (
                                            <div className="recommendation-image recommendation-placeholder">
                                                {event.title?.charAt(0) || 'E'}
                                            </div>
                                        )}
                                        <span className="recommendation-price">
                                            {Number(event.price) > 0 ? `${Number(event.price).toFixed(0)} lei` : 'Gratuit'}
                                        </span>
                                        {extractCityFromLocation(event.location) ? (
                                            <span className="recommendation-city-badge">
                                                {extractCityFromLocation(event.location)}
                                            </span>
                                        ) : null}
                                    </div>

                                    <div className="recommendation-content">
                                        <span className="recommendation-date">
                                            {new Date(event.start_date).toLocaleDateString('ro-RO', {
                                                month: 'short',
                                                day: 'numeric'
                                            }).toUpperCase()}
                                        </span>
                                        <h3>{event.title}</h3>
                                        <p>{event.location}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </>
            )}

            {liveResults.length > 0 && (
                <div className="recommendation-footer">
                    <button className="recommendation-retry-btn" onClick={() => navigate('/')}>
                        <FiRotateCcw />
                        <span>Reia căutarea</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default RecommendationResultsPage;