import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EventCard from './EventCard';
import API from '../api';
import '../styles/WeekendFeed.css';

const getWeekendRange = () => {
  const now = new Date();
  const day = now.getDay();
  const diffToFri = (5 - day + 7) % 7 || 7;
  const fri = new Date(now);
  fri.setDate(now.getDate() + diffToFri);
  fri.setHours(0, 0, 0, 0);
  const sun = new Date(fri);
  sun.setDate(fri.getDate() + 2);
  sun.setHours(23, 59, 59, 999);
  return { fri, sun };
};

const WeekendFeed = () => {
  const [events, setEvents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    API.get('/events')
      .then((res) => setEvents(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  const weekendEvents = useMemo(() => {
    const { fri, sun } = getWeekendRange();
    const publicEvents = events.filter((e) => !!e.org_id);
    const filtered = publicEvents.filter((e) => {
      const d = new Date(e.start_date || e.start);
      return d >= fri && d <= sun;
    });
    return (filtered.length > 0
      ? filtered
      : publicEvents
          .filter((e) => new Date(e.start_date || e.start) >= new Date())
          .sort((a, b) => new Date(a.start_date || a.start) - new Date(b.start_date || b.start))
    ).slice(0, 4);
  }, [events]);

  if (weekendEvents.length === 0) return null;

  return (
    <section className="wf-section">
      <div className="wf-inner">
        <div className="wf-head">
          <div>
            <p className="wf-kicker">SE ÎNTÂMPLĂ CURÂND</p>
            <h2 className="wf-title">Weekendul ăsta</h2>
          </div>
          <button type="button" className="wf-see-all" onClick={() => navigate('/explore')}>
            Vezi toate →
          </button>
        </div>

        <div className="wf-grid">
          {weekendEvents.map((event) => (
            <div key={event.id} className="wf-card-wrapper">
              <EventCard event={event} variant="compact" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WeekendFeed;
