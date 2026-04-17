import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { FiCalendar, FiClock, FiMapPin, FiUsers, FiZap } from 'react-icons/fi';
import { useEvents } from '../hooks/useEvents';
import { getEventDateKey, getEventStartValue, getEventEndValue, getEventTimeRangeLabel, getEventDayNumber, getEventMonthShort } from '../utils/eventDateTime';
import EventDetailsModal from '../components/EventDetailsModal';
import '../styles/CalendarPage.css';

const CalendarPage = ({ user }) => {
  const navigate = useNavigate();
  const [value, onChange] = useState(new Date());
  const [activeEvent, setActiveEvent] = useState(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const { data: events = [], isLoading, error } = useEvents(user?.id);

  const todayFormatted = new Date().toLocaleDateString('ro-RO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  useEffect(() => {
    if (!user?.id) {
      navigate('/login');
    }
  }, [user?.id, navigate]);

  const selectedDateEvents = useMemo(() => {
    if (!value || !events) return [];

    const searchDate = getEventDateKey(value);
    return events.filter((eventItem) => {
      const eventStart = getEventStartValue(eventItem);
      if (!eventStart) return false;

      const eventDate = getEventDateKey(eventStart);
      return eventDate === searchDate;
    });
  }, [events, value]);

  const getEventColor = (event) => (event.org_id ? '#22c55e' : '#3b82f6');

  const handleDateChange = (newDate) => {
    onChange(newDate);
  };

  const getEventCity = (location) => {
    if (!location) return 'Oraș nespecificat';
    const parts = location.split(',').map((part) => part.trim()).filter(Boolean);
    return parts[parts.length - 1] || location;
  };

  const openEventModal = (event) => {
    setActiveEvent(event);
    setIsEventModalOpen(true);
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month' && events.length > 0) {
      const cellDate = getEventDateKey(date);
      const dayEvents = events.filter(e => {
        const eventStart = getEventStartValue(e);
        if (!eventStart) return false;
        const d = getEventDateKey(eventStart);
        return d === cellDate;
      });
      
      if (dayEvents.length > 0) {
        return (
          <div className="dot-container">
            {dayEvents.slice(0, 3).map((e, i) => (
              <span key={i} className="calendar-dot" style={{ backgroundColor: e.org_id ? '#22c55e' : '#3b82f6' }}></span>
            ))}
          </div>
        );
      }
    }
  };

  if (isLoading) {
    return <div className="calendar-dashboard-bg"><div className="calendar-dashboard-container">Se încarcă evenimentele...</div></div>;
  }

  if (error) {
    return <div className="calendar-dashboard-bg"><div className="calendar-dashboard-container">Nu am putut încărca evenimentele.</div></div>;
  }

  return (
    <div className="calendar-dashboard-bg">
      <div className="calendar-dashboard-container">
        <header className="cal-dash-header">
          <div className="header-left">
            <div className="icon-calendar-orange"><FiCalendar /></div>
            <div className="header-titles">
              <h1>Calendarul Meu</h1>
              <p>{todayFormatted}</p>
            </div>
          </div>
          <button className="btn-today-pill" onClick={() => handleDateChange(new Date())}>Azi</button>
        </header>

        <div className="cal-dash-grid">
          <div className="cal-main-card">
            <Calendar
              onChange={handleDateChange}
              value={value}
              locale="ro-RO"
              tileContent={tileContent}
              formatShortWeekday={(locale, date) => ['D', 'L', 'M', 'M', 'J', 'V', 'S'][date.getDay()]}
            />

            <div className="day-details-section">
              <div className="details-header">
                <h3 className="selected-day-title">{value.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
              </div>
              {selectedDateEvents.length > 0 ? (
                selectedDateEvents.map(e => (
                  <div key={e.id} className={`event-detail-pill ${e.org_id ? 'is-public' : 'is-private'}`} onClick={() => openEventModal(e)}>
                    <div className="pill-info">
                      <h4 className="event-title-with-dot">
                        <span className="event-color-dot" style={{ backgroundColor: getEventColor(e) }}></span>
                        {e.title}
                      </h4>
                      <p className="event-description-line">{e.description || 'Eveniment fără descriere.'}</p>
                      <div className="day-event-meta-row">
                        <span className="day-event-meta-line"><FiClock /> {getEventStartValue(e) ? getEventTimeRangeLabel(getEventStartValue(e), getEventEndValue(e)) : '--:--'}</span>
                        <span className="day-event-meta-line"><FiMapPin /> {getEventCity(e.location)}</span>
                        {!e.org_id && e.organizer_name ? <span className="day-event-meta-line"><FiUsers /> Organizator: {e.organizer_name}</span> : null}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-events-text">Niciun eveniment planificat.</p>
              )}
            </div>
          </div>

          <div className="cal-widgets-column">
            <div className="widget-card">
              <div className="widget-title"><FiZap /> EVENIMENTE VIITOARE</div>
              <div className="upcoming-list">
                {events
                  .filter(e => getEventStartValue(e) && new Date(getEventStartValue(e)) >= new Date())
                  .sort((a, b) => new Date(getEventStartValue(a)) - new Date(getEventStartValue(b)))
                  .slice(0, 4)
                  .map(e => (
                    <div key={e.id} className="upcoming-row" onClick={() => openEventModal(e)}>
                      <div className="date-box">
                        <span className="day">{getEventDayNumber(getEventStartValue(e))}</span>
                        <span className="month">{getEventMonthShort(getEventStartValue(e), 'ro-RO')}</span>
                      </div>
                      <div className="row-content">
                        <h4 className="event-title-with-dot">
                          <span className="event-color-dot" style={{ backgroundColor: getEventColor(e) }}></span>
                          {e.title}
                        </h4>
                        <p className="event-meta-line"><FiClock /> {getEventTimeRangeLabel(getEventStartValue(e), getEventEndValue(e))}</p>
                        <p className="event-meta-line"><FiMapPin /> {getEventCity(e.location)}</p>
                        {!e.org_id && e.organizer_name ? <p className="event-meta-line"><FiUsers /> Organizator: {e.organizer_name}</p> : null}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <EventDetailsModal
        isOpen={isEventModalOpen}
        event={activeEvent}
        onClose={() => setIsEventModalOpen(false)}
        canEdit={Boolean(user?.id && activeEvent?.creator_id && user.id === activeEvent.creator_id)}
      />
    </div>
  );
};

export default CalendarPage;