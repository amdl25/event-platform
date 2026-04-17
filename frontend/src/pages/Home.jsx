import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Hero from '../components/Hero';
import DiscoveryFeed from '../components/DiscoveryFeed';
import Benefits from '../components/Benefits';
import RecommendationWizard from '../components/RecommendationWizard';
import API, { API_BASE } from '../api';
import '../styles/Home.css';

const getUserLevel = (points) => {
  if (points >= 2500) return { label: 'Gold', accent: 'gold' };
  if (points >= 1000) return { label: 'Silver', accent: 'silver' };
  return { label: 'Bronze', accent: 'bronze' };
};

const Home = ({ user }) => {
  const navigate = useNavigate();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [nextTicket, setNextTicket] = useState(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [recommendedEvents, setRecommendedEvents] = useState([]);

  useEffect(() => {
    if (!user?.id) {
      setNextTicket(null);
      setTotalPoints(0);
      setRecommendedEvents([]);
      return;
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
        setNextTicket(upcomingTickets[0] || null);

        const events = Array.isArray(eventsRes.data) ? eventsRes.data : [];
        const interests = Array.isArray(user?.interests)
          ? user.interests.map((item) => String(item?.name || item).toLowerCase())
          : [];
        const userCity = String(user?.city || user?.location || '').toLowerCase();

        const scored = events
          .filter((event) => event?.org_id)
          .map((event) => {
            let score = 0;
            const categories = (event.categories || []).map((cat) => String(cat?.name || '').toLowerCase());
            if (userCity && String(event.location || '').toLowerCase().includes(userCity)) score += 3;
            if (interests.length > 0 && categories.some((cat) => interests.includes(cat))) score += 4;
            if (event.start_date && new Date(event.start_date) > now) score += 2;
            if (Number(event.price || 0) === 0) score += 1;
            return { event, score };
          })
          .sort((a, b) => b.score - a.score || new Date(a.event.start_date) - new Date(b.event.start_date))
          .slice(0, 3)
          .map((item) => item.event);

        setRecommendedEvents(scored);
      } catch (error) {
        console.error('Eroare la încărcarea home personalizat:', error);
      }
    };

    loadPersonalizedHome();
  }, [user]);

  const level = useMemo(() => getUserLevel(totalPoints), [totalPoints]);
  const greetingName = useMemo(() => user?.firstName || user?.first_name || 'prietene', [user]);
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

              <article className="home-member-card home-member-card-ticket">
                <p className="home-member-eyebrow">Următorul bilet</p>
                {nextTicket ? (
                  <>
                    <h3>{nextTicket.event?.title || 'Eveniment'}</h3>
                    <p className="home-ticket-meta">{new Date(nextTicket.event.startDate).toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    <p className="home-ticket-meta">{nextTicket.event?.location || 'Locație nespecificată'}</p>
                    <button className="home-ticket-action" onClick={() => navigate('/profile')}>
                      Vezi Bilet QR
                    </button>
                  </>
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