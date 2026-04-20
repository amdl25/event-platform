import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'react-qr-code';
import Hero from '../components/Hero';
import DiscoveryFeed from '../components/DiscoveryFeed';
import Benefits from '../components/Benefits';
import RecommendationWizard from '../components/RecommendationWizard';
import TicketPdfRenderer from '../components/TicketPdfRenderer';
import API, { API_BASE } from '../api';
import { FiCalendar, FiDownload, FiMapPin, FiX } from 'react-icons/fi';
import { FaTicketAlt } from 'react-icons/fa';
import '../styles/Home.css';

const NEXT_TICKET_CACHE_KEY = 'homeNextTicket';

const getDaysUntilLabel = (dateValue) => {
  const now = new Date();
  const target = new Date(dateValue);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffDays = Math.ceil((targetStart - todayStart) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Astăzi';
  return `În ${diffDays} zile`;
};

const formatTicketDateParts = (dateValue) => {
  const date = new Date(dateValue);
  const dayPartRaw = date.toLocaleDateString('ro-RO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  const dayPart = dayPartRaw
    .replace(/\./g, '')
    .replace(/^./, (char) => char.toUpperCase());

  const timePart = date.toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return { dayPart, timePart };
};

const buildTicketQrPayload = (ticket) => {
  if (!ticket?.event?.id || !ticket?.ticketCode || !ticket?.event?.startDate) {
    return ticket?.ticketCode || '';
  }

  return `ticket:${ticket.ticketCode}|event:${ticket.event.id}|title:${ticket.event.title || 'Eveniment'}|date:${ticket.event.startDate}`;
};

const toSafeFileSlug = (value) => {
  return String(value || 'eveniment')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 42) || 'eveniment';
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
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [pdfPayload, setPdfPayload] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [nextTicket, setNextTicket] = useState(null);
  const [isHomeLoading, setIsHomeLoading] = useState(false);
  const [recommendedEvents, setRecommendedEvents] = useState([]);
  const ticketPdfRef = useRef(null);

  useEffect(() => {
    if (!user?.id) {
      setNextTicket(null);
      setIsHomeLoading(false);
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
        const [ticketsRes, eventsRes] = await Promise.all([
          API.get('/events/tickets/mine'),
          API.get('/events')
        ]);
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

  const greetingName = useMemo(() => user?.firstName || user?.first_name || 'prietene', [user]);
  const nextTicketDate = nextTicket?.event?.startDate || null;
  const nextTicketDateParts = useMemo(
    () => (nextTicketDate ? formatTicketDateParts(nextTicketDate) : { dayPart: '', timePart: '' }),
    [nextTicketDate]
  );
  const nextTicketQrValue = useMemo(() => buildTicketQrPayload(nextTicket), [nextTicket]);

  const buildPdfPayload = () => {
    if (!nextTicket?.event) return null;

    return {
      eventTitle: nextTicket.event?.title || 'Eveniment',
      generatedAt: new Date().toISOString(),
      tickets: [{
        number: 1,
        code: nextTicket.ticketCode || 'TK-UNKNOWN',
        qrValue: nextTicketQrValue || nextTicket.ticketCode || 'ticket',
        date: nextTicket.event?.startDate,
        location: nextTicket.event?.location || 'Locație nespecificată',
        points: Number(nextTicket.event?.pointsValue || 0),
        organizationName: nextTicket.event?.organizationName || 'Organizator'
      }]
    };
  };

  const handleDownloadPdf = async () => {
    if (!nextTicket?.event || downloadingPdf) return;

    setDownloadingPdf(true);
    try {
      const payload = buildPdfPayload();
      setPdfPayload(payload);

      await new Promise((resolve) => setTimeout(resolve, 40));
      if (!ticketPdfRef.current) return;

      const canvas = await html2canvas(ticketPdfRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

      const fileBase = toSafeFileSlug(nextTicket.event?.title || nextTicket.ticketCode || 'eveniment');
      pdf.save(`bilet-${fileBase}.pdf`);
    } catch (error) {
      console.error('Eroare la exportul PDF al biletului:', error);
    } finally {
      setPdfPayload(null);
      setDownloadingPdf(false);
    }
  };

  useEffect(() => {
    if (!isTicketModalOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsTicketModalOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isTicketModalOpen]);

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
            <div className="home-member-head">
              <div>
                <h2 className="home-member-greeting">
                  Bună, <span>{greetingName}</span>!
                </h2>
                <p className="home-member-subtitle">Ai un eveniment în curând — pregătește-te!</p>
              </div>
            </div>

            <div className="home-member-pair ticket-only">
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
                      <p className="home-ticket-kicker"><FaTicketAlt /> URMĂTORUL TĂU EVENIMENT</p>
                      <h3>{nextTicket.event?.title || 'Eveniment'}</h3>

                      <div className="home-ticket-meta-grid">
                        <div className="home-ticket-meta-block">
                          <p className="home-ticket-meta-label"><FiCalendar /> DATA</p>
                          <p className="home-ticket-meta-value">{nextTicketDateParts.dayPart}</p>
                          <p className="home-ticket-meta-time">{nextTicketDateParts.timePart}</p>
                        </div>

                        <div className="home-ticket-meta-block">
                          <p className="home-ticket-meta-label"><FiMapPin /> LOCAȚIE</p>
                          <p className="home-ticket-meta-value">{nextTicket.event?.location || 'Locație nespecificată'}</p>
                        </div>
                      </div>

                      <div className="home-ticket-actions-row">
                        <button
                          type="button"
                          className="home-ticket-primary-btn"
                          onClick={() => {
                            if (nextTicket.event?.id) {
                              navigate(`/event/${nextTicket.event.id}`);
                            } else {
                              navigate('/my-events');
                            }
                          }}
                        >
                          <FaTicketAlt />
                          <span>Vezi evenimentul</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="home-ticket-qr-col"
                      onClick={() => setIsTicketModalOpen(true)}
                      aria-label="Deschide detaliile biletului și codul QR"
                    >
                      <div className="home-ticket-qr-box" aria-hidden="true">
                        <span></span><span></span><span></span><span></span>
                        <span></span><span></span><span></span><span></span>
                        <span></span><span></span><span></span><span></span>
                      </div>
                      <p>QR</p>
                    </button>
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

      {isTicketModalOpen && nextTicket ? (
        <div
          className="home-ticket-modal-overlay"
          role="presentation"
          onClick={() => setIsTicketModalOpen(false)}
        >
          <div
            className="home-ticket-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-ticket-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="home-ticket-modal-header">
              <button
                type="button"
                className="home-ticket-modal-close"
                onClick={() => setIsTicketModalOpen(false)}
                aria-label="Închide dialogul biletului"
              >
                <FiX />
              </button>

              <p className="home-ticket-modal-kicker"><FaTicketAlt /> BILETUL TĂU</p>
              <h2 id="home-ticket-modal-title">{nextTicket.event?.title || 'Eveniment'}</h2>

              <div className="home-ticket-modal-meta">
                <span><FiCalendar /> {nextTicketDateParts.dayPart}</span>
                <span><FiMapPin /> {nextTicket.event?.location || 'Locație nespecificată'}</span>
              </div>
            </div>

            <div className="home-ticket-modal-body">
              <div className="home-ticket-modal-perforation" aria-hidden="true">
                <span></span>
                <span></span>
              </div>

              <div className="home-ticket-modal-qr-shell">
                <div className="home-ticket-modal-qr-card">
                  <QRCode
                    value={nextTicketQrValue || nextTicket.ticketCode || 'ticket'}
                    size={220}
                    bgColor="#141821"
                    fgColor="#f8fafc"
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>

                <p className="home-ticket-modal-code">{nextTicket.ticketCode || 'TK-UNKNOWN'}</p>
                <p className="home-ticket-modal-note">Arată acest cod la intrare</p>
              </div>

              <button type="button" className="home-ticket-modal-action" onClick={handleDownloadPdf} disabled={downloadingPdf}>
                <FiDownload />
                {downloadingPdf ? 'Se descarcă...' : 'Descarcă PDF'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pdfPayload ? <TicketPdfRenderer payload={pdfPayload} ref={ticketPdfRef} /> : null}
    </div>
  );
};

export default Home;