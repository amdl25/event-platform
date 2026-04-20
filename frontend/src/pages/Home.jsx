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
import { getRecentCategoryClickCounts } from '../utils/recommendationSignals';
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

const normalizeCategoryToken = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const getUrgencyBoost = (eventStart, now) => {
  if (!eventStart) return 0;
  const startDate = new Date(eventStart);
  const diffMs = startDate.getTime() - now.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return 0;

  const oneDayMs = 24 * 60 * 60 * 1000;
  const threeDaysMs = 3 * oneDayMs;
  const sevenDaysMs = 7 * oneDayMs;

  if (diffMs <= oneDayMs) return 15;
  if (diffMs <= threeDaysMs) return 10;
  if (diffMs <= sevenDaysMs) return 5;
  return 0;
};

const getRecommendationDateLabel = (event) => {
  const dateValue = event?.start_date || event?.start;
  if (!dateValue) return 'DATA ÎN CURÂND';

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'DATA ÎN CURÂND';

  return date
    .toLocaleDateString('ro-RO', { weekday: 'short', day: '2-digit', month: 'short' })
    .replace(/\./g, '')
    .toUpperCase();
};

const getMinTicketPoints = (event) => {
  const ticketTypes = Array.isArray(event?.ticketTypes) ? event.ticketTypes : [];
  const pointCandidates = ticketTypes
    .map((ticketType) => Number(ticketType?.points_reward ?? ticketType?.pointsReward ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (pointCandidates.length > 0) return Math.min(...pointCandidates);

  const fallbackPoints = Number(event?.points_value ?? event?.pointsValue ?? 0);
  return Number.isFinite(fallbackPoints) && fallbackPoints > 0 ? fallbackPoints : 0;
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
        const [ticketsRes, eventsRes, profileRes] = await Promise.all([
          API.get('/events/tickets/mine'),
          API.get('/events'),
          API.get(`/users/${user.id}`).catch(() => ({ data: null }))
        ]);
        const now = new Date();
        const allTickets = Array.isArray(ticketsRes.data) ? ticketsRes.data : [];

        const upcomingTickets = allTickets
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
        const eventsById = new Map(events.map((event) => [event.id, event]));
        const purchasedEventIds = new Set(allTickets.map((ticket) => ticket?.event?.id).filter(Boolean));
        const profileInterests = Array.isArray(profileRes?.data?.interests) ? profileRes.data.interests : [];
        const sourceInterests = profileInterests.length > 0 ? profileInterests : (Array.isArray(user?.interests) ? user.interests : []);
        const interests = sourceInterests.map((item) => normalizeCategoryToken(item?.name || item));
        const recentClickCategoryCounts = getRecentCategoryClickCounts({ days: 45, maxEntries: 120 });

        const purchaseCategoryCounts = allTickets.reduce((accumulator, ticket) => {
          const eventId = ticket?.event?.id;
          if (!eventId) return accumulator;

          const sourceEvent = eventsById.get(eventId);
          const categories = (sourceEvent?.categories || [])
            .map((category) => normalizeCategoryToken(category?.name || ''))
            .filter(Boolean);

          categories.forEach((categoryName) => {
            accumulator[categoryName] = (accumulator[categoryName] || 0) + 1;
          });

          return accumulator;
        }, {});

        const userCity = String(user?.city || user?.location || '').toLowerCase();
        const tomorrowLocalDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const tomorrowLocalKey = toLocalDateKey(tomorrowLocalDate);

        const scored = events
          .filter((event) => {
            if (!event?.org_id) return false;
            if (purchasedEventIds.has(event.id)) return false;
            const eventStart = event?.start_date || event?.start;
            if (!eventStart) return false;

            const eventLocalKey = toLocalDateKey(eventStart);
            if (!eventLocalKey || !tomorrowLocalKey) return false;

            return eventLocalKey >= tomorrowLocalKey;
          })
          .map((event) => {
            let score = 0;
            const eventStart = event?.start_date || event?.start;
            const categories = (event.categories || []).map((cat) => normalizeCategoryToken(cat?.name || ''));
            const onboardingInterestMatches = categories.filter((categoryName) => interests.includes(categoryName)).length;
            const purchaseSignalScore = categories.reduce((sum, categoryName) => {
              return sum + (purchaseCategoryCounts[categoryName] || 0);
            }, 0);
            const recentClickSignalScore = categories.reduce((sum, categoryName) => {
              return sum + (recentClickCategoryCounts[categoryName] || 0);
            }, 0);
            const reasons = [];
            const contributions = [];
            const urgencyBoost = getUrgencyBoost(eventStart, now);

            if (userCity && String(event.location || '').toLowerCase().includes(userCity)) {
              const points = 3;
              score += points;
              contributions.push({ label: 'Oraș', points, detail: `Locație compatibilă: ${event.location || 'fără locație'}` });
              reasons.push(`Match pe oraș (+3): ${event.location || 'fără locație'}`);
            }

            if (onboardingInterestMatches > 0) {
              const points = 10;
              score += points;
              contributions.push({
                label: 'Interese onboarding',
                points,
                detail: `${onboardingInterestMatches} categorie(i) potrivite cu ce a selectat la creare cont`,
              });
              reasons.push(`Interese onboarding (+${points}): match de categorie găsit`);
            }

            if (purchaseSignalScore > 0) {
              const points = 50;
              score += points;
              contributions.push({
                label: 'Istoric achiziții',
                points,
                detail: `Semnal din categoriile evenimentelor cumpărate: ${purchaseSignalScore}`,
              });
              reasons.push(`Istoric achiziții (+${points}): categorie cumpărată anterior`);
            }

            if (recentClickSignalScore > 0) {
              const points = Math.min(recentClickSignalScore * 2, 20);
              score += points;
              contributions.push({
                label: 'Click-uri recente',
                points,
                detail: `Semnal din vizualizări recente pe categorii: ${recentClickSignalScore}`,
              });
              reasons.push(`Click-uri recente (+${points.toFixed(1)}): ${recentClickSignalScore} click-uri agregate, max 20 puncte`);
            }

            if (urgencyBoost > 0) {
              score += urgencyBoost;
              contributions.push({
                label: 'Urgență temporală',
                points: urgencyBoost,
                detail: urgencyBoost === 15
                  ? 'Eveniment în următoarele 24h'
                  : urgencyBoost === 10
                    ? 'Eveniment în următoarele 3 zile'
                    : 'Eveniment în următoarele 7 zile',
              });
              reasons.push(`Urgență temporală (+${urgencyBoost})`);
            }

            if (Number(event.price || 0) === 0) {
              const points = 1;
              score += points;
              contributions.push({ label: 'Preț', points, detail: 'Eveniment gratuit' });
              reasons.push('Eveniment gratuit (+1)');
            }

            return {
              event,
              score,
              contributions,
              reasons,
              debug: {
                categories,
                onboardingInterestMatches,
                purchaseSignalScore,
                recentClickSignalScore,
                userCity,
              },
            };
          })
          .sort((a, b) => {
            const startA = new Date(a.event?.start_date || a.event?.start).getTime();
            const startB = new Date(b.event?.start_date || b.event?.start).getTime();
            return b.score - a.score || startA - startB;
          });

        const topRecommendations = scored.slice(0, 8);

        if (topRecommendations.length > 0) {
          console.group('[Home] Recomandări pentru tine - explicații');
          topRecommendations.slice(0, 3).forEach((item, index) => {
            console.group(`Top ${index + 1}: ${item.event?.title || 'Eveniment'} | scor ${item.score.toFixed(2)}`);

            const formula = item.contributions
              .map((contribution) => `${contribution.points.toFixed(1)} (${contribution.label})`)
              .join(' + ');

            console.info(
              `[Home][Recomandare] ${item.event?.title || 'Eveniment'} => ${formula || '0'} = ${item.score.toFixed(2)}`
            );
            console.log(`Formula scor: ${formula || '0'} = ${item.score.toFixed(2)}`);

            if (item.contributions.length === 0) {
              console.log('Motiv: fără semnale puternice; scor minim/fallback.');
            } else {
              item.contributions.forEach((contribution) => {
                console.log(`Motiv: ${contribution.label} | +${contribution.points.toFixed(1)} | ${contribution.detail}`);
              });
            }

            item.reasons.forEach((reason) => console.log(`- ${reason}`));
            console.log('Debug semnale:', item.debug);
            console.groupEnd();
          });
          console.groupEnd();
        }

        setRecommendedEvents(topRecommendations.map((item) => item.event));
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
    return [...recommendedEvents];
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
                    className={`home-reco-card${event.image_url ? ' has-image' : ' no-image'}`}
                    onClick={() => {
                      navigate(`/event/${event.id}`);
                    }}
                  >
                    {event.image_url ? (
                      <img
                        src={event.image_url?.startsWith('http') ? event.image_url : `${API_BASE}${event.image_url || ''}`}
                        alt={event.title}
                      />
                    ) : null}
                    <div className="home-reco-top-row">
                      <span className="home-reco-category-chip">{event.categories?.[0]?.name || 'Experiență live'}</span>
                      {getMinTicketPoints(event) > 0 ? (
                        <span className="home-reco-points-chip">★ +{getMinTicketPoints(event)}</span>
                      ) : null}
                    </div>
                    <div className="home-reco-content">
                      <p className="home-reco-date">{getRecommendationDateLabel(event)}</p>
                      <h3>{event.title}</h3>
                      <p className="home-reco-location"><FiMapPin /> {event.location || 'Locație nespecificată'}</p>
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