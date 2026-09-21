import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import API from '../api';
import EventCard from '../components/EventCard';
import '../styles/SearchResults.css';

const SearchResults = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const location = useLocation();
  const query = new URLSearchParams(location.search).get("q");

 useEffect(() => {
  const normalizeForSearch = (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]/g, "")
      .trim();
  };

  const loadResults = async () => {
    try {
      setLoading(true);
      const res = await API.get('/events');
      const allEvents = res.data;
      const searchTarget = normalizeForSearch(query);

      const filtered = allEvents.filter(event => {
        const isPublic = event.org_id !== null && event.org_id !== undefined;

        const categoryNames = event.categories
          ? event.categories.map(cat => normalizeForSearch(cat.name)).join(" ")
          : "";

        const eventTitle = normalizeForSearch(event.title);
        const eventLocation = normalizeForSearch(event.location);
        const eventDesc = normalizeForSearch(event.description);

        const matches = eventTitle.includes(searchTarget) ||
                        eventLocation.includes(searchTarget) ||
                        categoryNames.includes(searchTarget) ||
                        eventDesc.includes(searchTarget);

        return isPublic && matches;
      });

      setResults(filtered);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  loadResults();
}, [query]);

  return (
    <div className="container-max search-results-page" style={{ paddingTop: '150px' }}>
        <h2>Rezultate pentru: "{query}"</h2>
        <p className="search-results-count">
            {results.length} {results.length === 1 ? 'eveniment găsit' : 'evenimente găsite'}
            </p>

        {loading ? (
        <p className="loading-text">Se caută...</p>
        ) : (
        <div className="events-grid">
            {results.length > 0 ? (
            results.map((event) => (
                <div key={event.id} className="event-card-wrapper">
                <EventCard event={event} variant="compact" />
                </div>
            ))
            ) : (
            <p className="no-results-msg">Nu s-a găsit niciun rezultat pentru "{query}".</p>
            )}
        </div>
        )}
    </div>
  );
};

export default SearchResults;