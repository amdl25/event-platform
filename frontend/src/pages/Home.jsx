import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Hero from '../components/Hero';
import DiscoveryFeed from '../components/DiscoveryFeed';
import Benefits from '../components/Benefits';
import RecommendationWizard from '../components/RecommendationWizard';
import API, { API_BASE } from '../api';
import { FiCalendar, FiMapPin } from 'react-icons/fi';
import { FaTicketAlt } from 'react-icons/fa';
import '../styles/Home.css';

const NEXT_TICKET_CACHE_KEY = 'homeNextTicket';

const getUserLevel = (points) => {
  if (points >= 2500) return { label: 'Gold', accent: 'gold' };
  if (points >= 1000) return { label: 'Silver', accent: 'silver' };
  return { label: 'Bronze', accent: 'bronze' };
};

const getDaysUntilLabel = (dateValue) => {
  const now = new Date();
  const target = new Date(dateValue);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffDays = Math.ceil((targetStart - todayStart) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Astăzi';
  return `În ${diffDays} zile`;
};

const formatTicketDateTime = (dateValue) => {
  const date = new Date(dateValue);
  const datePartRaw = date.toLocaleDateString('ro-RO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
  const datePart = datePartRaw
    .replace(/\./g, '')
    .replace(/^./, (char) => char.toUpperCase());
  const timePart = date.toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `${datePart} · ${timePart}`;
};

const toLocalDateKey = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Home = ({ user }) => {
  const navigate = useNavigate();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [nextTicket, setNextTicket] = useState(null);
  const [isHomeLoading, setIsHomeLoading] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [recommendedEvents, setRecommendedEvents] = useState([]);

  useEffect(() => {
    if (!user?.id) {
      setNextTicket(null);
      setIsHomeLoading(false);
      setTotalPoints(0);
      setRecommendedEvents([]);
      sessionStorage.removeItem(NEXT_TICKET_CACHE_KEY);
      return;
    }

    setIsHomeLoading(true);

    try {
      const cachedTicketRaw = sessionStorage.getItem(NEXT_TICKET_CACHE_KEY);
      if (cachedTicketRaw) {
        const cachedTicket = JSON.parse(cachedTicketRaw);
        if (cachedTicket?.event?.startDate) {
          setNextTicket(cachedTicket);
        }
      }
    } catch {
    }

    const loadPersonalizedHome = async () => {
      try {
        const [loyaltyRes, ticketsRes, eventsRes] = await Promise.all([
          API.get('/users/me/loyalty'),
          API.get('/events/tickets/mine'),
          API.get('/events')
        ]);

        const points = Number(loyaltyRes.data?.totalPoints || 0);
        setTotalPoints(points);

        const now = new Date();
        const upcomingTickets = (ticketsRes.data || [])
          .filter((ticket) => ticket?.event?.startDate && new Date(ticket.event.startDate) > now)
          .sort((a, b) => new Date(a.event.startDate) - new Date(b.event.startDate));
        const nextUpcomingTicket = upcomingTickets[0] || null;
        setNextTicket(nextUpcomingTicket);

        if (nextUpcomingTicket) {
          sessionStorage.setItem(NEXT_TICKET_CACHE_KEY, JSON.stringify(nextUpcomingTicket));
        } else {
          sessionStorage.removeItem(NEXT_TICKET_CACHE_KEY);
        }

        const events = Array.isArray(eventsRes.data) ? eventsRes.data : [];
        const interests = Array.isArray(user?.interests)
          ? user.interests.map((item) => String(item?.name || item).toLowerCase())
          : [];
        const userCity = String(user?.city || user?.location || '').toLowerCase();
        const tomorrowLocalDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const tomorrowLocalKey = toLocalDateKey(tomorrowLocalDate);

        const scored = events
          .filter((event) => {
            if (!event?.org_id) return false;
            const eventStart = event?.start_date || event?.start;
            if (!eventStart) return false;

            const eventLocalKey = toLocalDateKey(eventStart);
            if (!eventLocalKey || !tomorrowLocalKey) return false;

            return eventLocalKey >= tomorrowLocalKey;
          })
          .map((event) => {
            let score = 0;
            const eventStart = event?.start_date || event?.start;
            const categories = (event.categories || []).map((cat) => String(cat?.name || '').toLowerCase());
            if (userCity && String(event.location || '').toLowerCase().includes(userCity)) score += 3;
            if (interests.length > 0 && categories.some((cat) => interests.includes(cat))) score += 4;
            if (eventStart && new Date(eventStart) > now) score += 2;
            if (Number(event.price || 0) === 0) score += 1;
            return { event, score };
          })
          .sort((a, b) => {
            const startA = new Date(a.event?.start_date || a.event?.start).getTime();
            const startB = new Date(b.event?.start_date || b.event?.start).getTime();
            return b.score - a.score || startA - startB;
          })
          .slice(0, 3)
          .map((item) => item.event);

        setRecommendedEvents(scored);
      } catch (error) {
        console.error('Eroare la încărcarea home personalizat:', error);
      } finally {
        setIsHomeLoading(false);
      }
    };

    loadPersonalizedHome();
  }, [user]);

  const level = useMemo(() => getUserLevel(totalPoints), [totalPoints]);
  const greetingName = useMemo(() => user?.firstName || user?.first_name || 'prietene', [user]);
  const nextTicketDate = nextTicket?.event?.startDate || null;
  const recommendationCards = useMemo(() => {
    const cards = [...recommendedEvents.slice(0, 3)];
    while (cards.length < 3) {
      cards.push({
        id: `placeholder-${cards.length}`,
        title: 'Recomandare în curs',
        categories: [{ name: 'Curând' }],
        image_url: null,
        isPlaceholder: true
      });
    }
    return cards;
  }, [recommendedEvents]);

  return (
    <div className="home-page">
      <Hero onRecommendClick={() => setIsWizardOpen(true)} />

      {user ? (
        <section className="home-member-zone">
          <div className="home-member-shell">
            <div className="home-member-pair">
              <article className="home-member-card home-member-card-loyalty">
                <p className="home-member-eyebrow">Dashboard personal</p>
                <h2>Bine ai revenit, {greetingName}.</h2>
                <p className="home-member-copy">Punctele tale cresc cu fiecare bilet validat. Ține ritmul și urcă în nivel.</p>

                <div className="home-loyalty-row">
                  <div>
                    <span>Puncte fidelitate</span>
                    <strong>{totalPoints.toLocaleString('ro-RO')}</strong>
                  </div>
                  <div className={`home-level-chip ${level.accent}`}>
                    Nivel {level.label}
                  </div>
                </div>
              </article>

              <article className={`home-member-card home-member-card-ticket${nextTicket ? ' has-ticket' : ''}`}>
                {nextTicket ? (
                  <div className="home-ticket-layout">
                    <div className="home-ticket-visual">
                      <span className="home-ticket-days-chip">{getDaysUntilLabel(nextTicket.event.startDate)}</span>
                      {nextTicket.event?.image_url ? (
                        <img
                          src={nextTicket.event.image_url?.startsWith('http') ? nextTicket.event.image_url : `${API_BASE}${nextTicket.event.image_url}`}
                          alt={nextTicket.event?.title || 'Eveniment'}
                        />
                      ) : (
                        <div className="home-ticket-visual-placeholder">
                          {(nextTicket.event?.title || 'E').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="home-ticket-main">
                      <p className="home-ticket-kicker"><FaTicketAlt /> URMĂTORUL TĂU BILET</p>
                      <h3>{nextTicket.event?.title || 'Eveniment'}</h3>
                      <p className="home-ticket-meta with-icon">
                        <FiCalendar />
                        <span>{formatTicketDateTime(nextTicket.event.startDate)}</span>
                      </p>
                      <p className="home-ticket-meta with-icon">
                        <FiMapPin />
                        <span>{nextTicket.event?.location || 'Locație nespecificată'}</span>
                      </p>
                      {nextTicketDate ? (
                        <button
                          type="button"
                          className="home-ticket-calendar-btn"
                          onClick={() => {
                            const encodedDate = encodeURIComponent(nextTicketDate);
                            navigate(`/calendar?selectedDate=${encodedDate}`);
                          }}
                        >
                          <FiCalendar />
                          <span>Vezi în calendar</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : isHomeLoading ? (
                  null
                ) : (
                  <>
                    <h3>Nu ai bilete viitoare momentan</h3>
                    <p className="home-ticket-meta">Alege un eveniment nou și îți pregătim biletul instant.</p>
                    <button className="home-ticket-action" onClick={() => navigate('/explore')}>
                      Explorează Evenimente
                    </button>
                  </>
                )}
              </article>
            </div>

            <div className="home-reco-block">
              <div className="home-reco-head">
                <p className="home-reco-kicker overline">Pentru tine</p>
                <h2 className="home-reco-headline">
                  <span>Recomandate</span> <span className="serif-accent">pentru tine</span>
                </h2>
              </div>

              <div className="home-reco-grid">
                {recommendationCards.map((event) => (
                  <article
                    key={event.id}
                    className={`home-reco-card${event.isPlaceholder ? ' is-placeholder' : ''}`}
                    onClick={() => {
                      if (!event.isPlaceholder) {
                        navigate(`/event/${event.id}`);
                      }
                    }}
                  >
                    {event.image_url ? (
                      <img
                        src={event.image_url?.startsWith('http') ? event.image_url : `${API_BASE}${event.image_url || ''}`}
                        alt={event.title}
                      />
                    ) : null}
                    <div className="home-reco-overlay" />
                    <div className="home-reco-content">
                      <span>{event.categories?.[0]?.name || 'Experiență live'}</span>
                      <h3>{event.title}</h3>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <Benefits />
      )}

      <DiscoveryFeed />

      <section className="home-final-cta">
        <div className="home-final-cta-shell">
          <p>Următorul eveniment memorabil te așteaptă.</p>
          <h2>Rezervă locul tău și transformă seara în experiență.</h2>
          <div className="home-final-actions">
            <button type="button" onClick={() => navigate('/explore')}>Explorează Acum</button>
            <button type="button" className="secondary" onClick={() => setIsWizardOpen(true)}>Recomandă-mi ceva</button>
          </div>
        </div>
      </section>

      <RecommendationWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />
    </div>
  );
};

export default Home;