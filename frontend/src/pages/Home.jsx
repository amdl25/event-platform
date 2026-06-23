import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { Sparkles } from 'lucide-react';
import Hero from '../components/Hero';
import CategoryBrowser from '../components/CategoryBrowser';
import WeekendFeed from '../components/WeekendFeed';
import RecommendationWizard from '../components/RecommendationWizard';
import TicketPdfRenderer from '../components/TicketPdfRenderer';
import API from '../api';
import { Link } from 'react-router-dom';
import { FiCalendar, FiChevronLeft, FiChevronRight, FiDownload, FiLock, FiMapPin, FiStar, FiTrendingUp, FiUsers, FiX } from 'react-icons/fi';
import { FaTicketAlt } from 'react-icons/fa';
import { PiConfetti } from 'react-icons/pi';
import { getRecentCategoryClickCounts } from '../utils/recommendationSignals';
import { downloadTicketsPdf } from '../utils/downloadTicketsPdf';
import '../styles/Home.css';

const NEXT_TICKET_CACHE_KEY = 'homeNextTicket';
const STACK_WINDOW_HOURS = 72;
const PUBLIC_PRIORITY_WINDOW_HOURS = 4;

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

const getGuestInitials = (guest) => {
  const fullName = String(
    guest?.fullName ||
    `${guest?.firstName || ''} ${guest?.lastName || ''}`.trim() ||
    ''
  ).trim();

  if (!fullName) return '';

  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

const toTimestamp = (value) => {
  const timestamp = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(timestamp) ? timestamp : null;
};

const isWithinWindow = (startTimestamp, nowTimestamp, windowHours) => {
  if (!Number.isFinite(startTimestamp)) return false;
  const diff = startTimestamp - nowTimestamp;
  return diff >= 0 && diff <= windowHours * 60 * 60 * 1000;
};

const buildStackCandidate = ({ kind, event, ticket = null, privateMeta = null }) => {
  const startDate = event?.startDate || event?.start_date || event?.start;
  const endDate = event?.endDate || event?.end_date || event?.end || null;
  const startTimestamp = toTimestamp(startDate);
  if (!event?.id || !startDate || !Number.isFinite(startTimestamp)) return null;

  return {
    id: `${kind}-${event.id}-${ticket?.id || 'evt'}`,
    kind,
    startDate,
    startTimestamp,
    hasQr: kind === 'public-ticket',
    event: {
      id: event.id,
      title: event.title,
      description: event.description || event.desc || '',
      guestNotes: event.guestNotes || event.guest_notes || '',
      location: event.location,
      image_url: event.image_url,
      endDate,
      organizationName: event.organizationName || event.hostName || privateMeta?.hostName || 'Organizator',
      pointsValue: Number(event.pointsValue || 0),
    },
    ticketCode: ticket?.ticketCode || null,
    privateMeta,
  };
};

const sortSmartStack = (events, nowTimestamp) => {
  return [...events].sort((a, b) => {
    const aPublicBoost = a.kind === 'public-ticket' && isWithinWindow(a.startTimestamp, nowTimestamp, PUBLIC_PRIORITY_WINDOW_HOURS);
    const bPublicBoost = b.kind === 'public-ticket' && isWithinWindow(b.startTimestamp, nowTimestamp, PUBLIC_PRIORITY_WINDOW_HOURS);

    if (aPublicBoost !== bPublicBoost) {
      return aPublicBoost ? -1 : 1;
    }

    return a.startTimestamp - b.startTimestamp;
  });
};

const Home = ({ user }) => {
  const navigate = useNavigate();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isPrivateInviteModalOpen, setIsPrivateInviteModalOpen] = useState(false);
  const [pdfPayload, setPdfPayload] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [stackEvents, setStackEvents] = useState([]);
  const [activeStackIndex, setActiveStackIndex] = useState(0);
  const [isHomeLoading, setIsHomeLoading] = useState(false);
  const [recommendedEvents, setRecommendedEvents] = useState([]);
  const [privateModalGuests, setPrivateModalGuests] = useState([]);
  const [privateModalGuestsLoading, setPrivateModalGuestsLoading] = useState(false);
  const [privateModalGuestsError, setPrivateModalGuestsError] = useState('');
  const [activeModalTicketIndex, setActiveModalTicketIndex] = useState(0);
  const ticketPdfRef = useRef(null);

  useEffect(() => {
    if (!user?.id) {
      setStackEvents([]);
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
        if (cachedTicket?.event?.startDate && cachedTicket?.kind) {
          setStackEvents([cachedTicket]);
        }
      }
    } catch {
    }

    const loadPersonalizedHome = async () => {
      try {
        const [ticketsRes, eventsRes, privateRes, profileRes] = await Promise.all([
          API.get('/events/tickets/mine'),
          API.get('/events'),
          API.get('/events/private/mine').catch(() => ({ data: { created: [], invited: [] } })),
          API.get(`/users/${user.id}`).catch(() => ({ data: null }))
        ]);
        const now = new Date();
        const nowTimestamp = now.getTime();
        const allTickets = Array.isArray(ticketsRes.data) ? ticketsRes.data : [];
        const privateData = privateRes?.data || { created: [], invited: [] };
        const privateCreated = Array.isArray(privateData?.created) ? privateData.created : [];
        const privateInvited = Array.isArray(privateData?.invited) ? privateData.invited : [];
        const privateEventIds = new Set([
          ...privateCreated.map((entry) => entry?.id),
          ...privateInvited.map((entry) => entry?.event?.id),
        ].filter(Boolean));

        const publicCandidates = allTickets
          .filter((ticket) => {
            const eventId = ticket?.event?.id;
            if (!eventId || privateEventIds.has(eventId)) return false;

            const hasOrgIdField = Object.prototype.hasOwnProperty.call(ticket?.event || {}, 'org_id');
            const hasOrgIdCamelField = Object.prototype.hasOwnProperty.call(ticket?.event || {}, 'orgId');
            if (hasOrgIdField && ticket?.event?.org_id == null) return false;
            if (hasOrgIdCamelField && ticket?.event?.orgId == null) return false;

            const startTs = toTimestamp(ticket?.event?.startDate);
            return Number.isFinite(startTs) && isWithinWindow(startTs, nowTimestamp, STACK_WINDOW_HOURS);
          })
          .map((ticket) => buildStackCandidate({
            kind: 'public-ticket',
            event: {
              id: ticket?.event?.id,
              title: ticket?.event?.title,
              location: ticket?.event?.location,
              startDate: ticket?.event?.startDate,
              image_url: ticket?.event?.image_url,
              organizationName: ticket?.event?.organizationName,
              pointsValue: ticket?.event?.pointsValue,
            },
            ticket,
          }))
          .filter(Boolean);

        const publicCandidatesByEventId = new Map();
        publicCandidates.forEach((candidate) => {
          const eventId = candidate.event.id;
          if (!publicCandidatesByEventId.has(eventId)) {
            publicCandidatesByEventId.set(eventId, {
              ...candidate,
              ticketCodes: candidate.ticketCode ? [candidate.ticketCode] : [],
            });
          } else if (candidate.ticketCode) {
            publicCandidatesByEventId.get(eventId).ticketCodes.push(candidate.ticketCode);
          }
        });
        const deduplicatedPublicCandidates = Array.from(publicCandidatesByEventId.values());

        const privateCreatedCandidates = privateCreated
          .filter((entry) => {
            const startTs = toTimestamp(entry?.start_date);
            return Number.isFinite(startTs) && isWithinWindow(startTs, nowTimestamp, STACK_WINDOW_HOURS);
          })
          .map((entry) => buildStackCandidate({
            kind: 'private-host',
            event: {
              id: entry?.id,
              title: entry?.title,
              description: entry?.description,
              guestNotes: entry?.guestNotes,
              location: entry?.location,
              startDate: entry?.start_date,
              endDate: entry?.end_date,
              image_url: entry?.image_url,
            },
            privateMeta: {
              roleLabel: 'Gazda',
              hostName: 'Tu',
              showGuestList: Boolean(entry?.showGuestList),
              confirmedCount: Number(entry?.confirmedCount || 0),
              totalInvited: Number(entry?.totalInvited || 0),
              confirmedGuests: Array.isArray(entry?.confirmedGuests) ? entry.confirmedGuests : [],
            }
          }))
          .filter(Boolean);

        const privateInvitedCandidates = privateInvited
          .filter((entry) => {
            const startTs = toTimestamp(entry?.event?.start_date);
            return Number.isFinite(startTs) && isWithinWindow(startTs, nowTimestamp, STACK_WINDOW_HOURS);
          })
          .map((entry) => buildStackCandidate({
            kind: 'private-invited',
            event: {
              id: entry?.event?.id,
              title: entry?.event?.title,
              description: entry?.event?.description,
              guestNotes: entry?.event?.guestNotes,
              location: entry?.event?.location,
              startDate: entry?.event?.start_date,
              endDate: entry?.event?.end_date,
              image_url: entry?.event?.image_url,
              organizationName: entry?.event?.hostName,
            },
            privateMeta: {
              roleLabel: 'Invitat',
              hostName: entry?.event?.hostName || 'Organizator',
              inviteStatus: entry?.inviteStatus || 'accepted',
              showGuestList: Boolean(entry?.event?.showGuestList),
              confirmedCount: Number(entry?.event?.confirmedCount || 0),
              totalInvited: Number(entry?.event?.totalInvited || 0),
              confirmedGuests: Array.isArray(entry?.event?.confirmedGuests) ? entry.event.confirmedGuests : [],
            }
          }))
          .filter(Boolean);

        const nextStack = sortSmartStack(
          [...deduplicatedPublicCandidates, ...privateCreatedCandidates, ...privateInvitedCandidates],
          nowTimestamp
        );
        setStackEvents(nextStack);

        if (nextStack[0]) {
          sessionStorage.setItem(NEXT_TICKET_CACHE_KEY, JSON.stringify(nextStack[0]));
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
              },
            };
          })
          .sort((a, b) => {
            const startA = new Date(a.event?.start_date || a.event?.start).getTime();
            const startB = new Date(b.event?.start_date || b.event?.start).getTime();
            return b.score - a.score || startA - startB;
          });

        const topRecommendations = scored.slice(0, 3);

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
  const hasMultipleStackEvents = stackEvents.length > 1;
  const safeActiveStackIndex = stackEvents.length > 0 ? Math.min(activeStackIndex, stackEvents.length - 1) : 0;
  const primaryStackEvent = stackEvents[safeActiveStackIndex] || null;
  const stackGhostCount = hasMultipleStackEvents ? 2 : 0;
  const isPrimaryPublic = primaryStackEvent?.kind === 'public-ticket';
  const isPrimaryPrivate = primaryStackEvent?.kind === 'private-host' || primaryStackEvent?.kind === 'private-invited';
  const nextTicketDate = primaryStackEvent?.startDate || null;
  const nextTicketDateParts = useMemo(
    () => (nextTicketDate ? formatTicketDateParts(nextTicketDate) : { dayPart: '', timePart: '' }),
    [nextTicketDate]
  );
  const activeModalTicketCode = useMemo(() => {
    const codes = primaryStackEvent?.ticketCodes;
    if (Array.isArray(codes) && codes.length > 0) {
      return codes[Math.min(activeModalTicketIndex, codes.length - 1)] || null;
    }
    return primaryStackEvent?.ticketCode || null;
  }, [primaryStackEvent, activeModalTicketIndex]);

  const nextTicketQrValue = useMemo(() => {
    if (!isPrimaryPublic || !primaryStackEvent?.event) return '';

    return buildTicketQrPayload({
      ticketCode: activeModalTicketCode,
      event: {
        id: primaryStackEvent.event.id,
        title: primaryStackEvent.event.title,
        startDate: primaryStackEvent.startDate,
      }
    });
  }, [isPrimaryPublic, primaryStackEvent, activeModalTicketCode]);

  const buildPdfPayload = () => {
    if (!isPrimaryPublic || !primaryStackEvent?.event) return null;

    const allCodes = Array.isArray(primaryStackEvent?.ticketCodes) && primaryStackEvent.ticketCodes.length > 0
      ? primaryStackEvent.ticketCodes
      : [primaryStackEvent?.ticketCode].filter(Boolean);

    return {
      eventTitle: primaryStackEvent.event?.title || 'Eveniment',
      generatedAt: new Date().toISOString(),
      tickets: allCodes.map((code, index) => ({
        number: index + 1,
        code: code || 'TK-UNKNOWN',
        qrValue: buildTicketQrPayload({
          ticketCode: code,
          event: {
            id: primaryStackEvent.event?.id,
            title: primaryStackEvent.event?.title,
            startDate: primaryStackEvent.startDate,
          }
        }) || code || 'ticket',
        eventId: primaryStackEvent.event?.id || null,
        date: primaryStackEvent.startDate,
        location: primaryStackEvent.event?.location || 'Locație nespecificată',
        points: Number(primaryStackEvent.event?.pointsValue || 0),
        organizationName: primaryStackEvent.event?.organizationName || 'Organizator',
      })),
    };
  };

  const handleDownloadPdf = async () => {
    if (!isPrimaryPublic || !primaryStackEvent?.event || downloadingPdf) return;

    setDownloadingPdf(true);
    try {
      const payload = buildPdfPayload();
      await downloadTicketsPdf({
        eventTitle: payload.eventTitle,
        tickets: payload.tickets,
        fileName: `bilet-${toSafeFileSlug(primaryStackEvent.event?.title || primaryStackEvent.ticketCode || 'eveniment')}`
      });
    } catch (error) {
      console.error('Eroare la exportul PDF al biletului:', error);
    } finally {
      setDownloadingPdf(false);
    }
  };

  useEffect(() => {
    if (!isTicketModalOpen && !isPrivateInviteModalOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsTicketModalOpen(false);
        setIsPrivateInviteModalOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPrivateInviteModalOpen, isTicketModalOpen]);

  useEffect(() => {
    if (!isPrimaryPrivate) {
      setIsPrivateInviteModalOpen(false);
    }
  }, [isPrimaryPrivate]);

  useEffect(() => {
    if (!isPrivateInviteModalOpen || !isPrimaryPrivate || !primaryStackEvent?.event?.id || !user?.id) {
      setPrivateModalGuests([]);
      setPrivateModalGuestsError('');
      setPrivateModalGuestsLoading(false);
      return;
    }

    let cancelled = false;

    const loadPrivateModalGuests = async () => {
      try {
        setPrivateModalGuestsLoading(true);
        setPrivateModalGuestsError('');

        const response = await API.get(`/events/private/${primaryStackEvent.event.id}/guests`);
        if (cancelled) return;

        const guests = Array.isArray(response.data?.guests) ? response.data.guests : [];
        setPrivateModalGuests(guests);
      } catch (loadError) {
        if (cancelled) return;
        setPrivateModalGuests([]);
        setPrivateModalGuestsError(loadError?.response?.data?.message || 'Lista invitaților nu este disponibilă.');
      } finally {
        if (!cancelled) {
          setPrivateModalGuestsLoading(false);
        }
      }
    };

    loadPrivateModalGuests();

    return () => {
      cancelled = true;
    };
  }, [isPrimaryPrivate, isPrivateInviteModalOpen, primaryStackEvent?.event?.id, user?.id]);

  useEffect(() => {
    setActiveStackIndex((currentIndex) => {
      if (stackEvents.length === 0) return 0;
      return Math.min(currentIndex, stackEvents.length - 1);
    });
  }, [stackEvents.length]);

  const recommendationCards = useMemo(() => {
    return [...recommendedEvents];
  }, [recommendedEvents]);

  const hasUpcomingStack = Boolean(primaryStackEvent?.startDate);
  const isPrimaryHost = primaryStackEvent?.kind === 'private-host';
  const privateOrganizerLine = isPrimaryHost
    ? 'Ești gazdă'
    : `Organizat de ${primaryStackEvent?.event?.organizationName || primaryStackEvent?.privateMeta?.hostName || 'Organizator'}`;
  const canViewGuestList = isPrimaryHost || Boolean(primaryStackEvent?.privateMeta?.showGuestList);
  const privateConfirmedCount = Number(primaryStackEvent?.privateMeta?.confirmedCount || 0);
  const confirmedGuests = Array.isArray(primaryStackEvent?.privateMeta?.confirmedGuests)
    ? primaryStackEvent.privateMeta.confirmedGuests
    : [];
  const visibleConfirmedGuests = canViewGuestList ? confirmedGuests.slice(0, 5) : [];
  const remainingConfirmedGuests = Math.max(confirmedGuests.length - visibleConfirmedGuests.length, 0);
  const privateInviteImageUrl = primaryStackEvent?.event?.image_url
    ? (primaryStackEvent.event.image_url.startsWith('http') || primaryStackEvent.event.image_url.startsWith('data:')
      ? primaryStackEvent.event.image_url
      : '')
    : '';
  const privateDescription = String(primaryStackEvent?.event?.description || '').trim();
  const privateGuestNotes = String(primaryStackEvent?.event?.guestNotes || '').trim();
  const privateInviteHeaderStyle = privateInviteImageUrl
    ? {
      backgroundImage: `linear-gradient(115deg, rgba(15, 23, 42, 0.88) 8%, rgba(15, 23, 42, 0.72) 42%, rgba(15, 23, 42, 0.78) 100%), url(${privateInviteImageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
    : undefined;
  const fallbackModalGuests = confirmedGuests.map((guest, index) => ({
    id: guest?.id || `confirmed-${index}`,
    displayName: String(guest?.fullName || `${guest?.firstName || ''} ${guest?.lastName || ''}`.trim() || 'Invitat').trim(),
    inviteStatus: 'accepted',
  }));
  const modalGuestsToRender = privateModalGuests.length > 0 ? privateModalGuests : fallbackModalGuests;

  const goToPreviousStackEvent = () => {
    if (stackEvents.length <= 1) return;
    setActiveStackIndex((currentIndex) => (currentIndex - 1 + stackEvents.length) % stackEvents.length);
  };

  const goToNextStackEvent = () => {
    if (stackEvents.length <= 1) return;
    setActiveStackIndex((currentIndex) => (currentIndex + 1) % stackEvents.length);
  };

  return (
    <div className="home-page">
      {!user && (
        <div className="home-intro-bar">
          <span className="home-intro-bar-text">
            <strong>EventHub</strong> - creat pentru participanți la evenimente, business-uri sau ONG-uri care vor să ajungă la public.
          </span>
          <Link to="/about" className="home-intro-bar-link">Află mai multe →</Link>
        </div>
      )}

      {user && (
        <section className="home-member-zone">
          <div className="home-member-shell">
            <div className="home-member-head">
              <div className="home-member-head-text">
                <h2 className="home-member-greeting">
                  Bună, <span>{greetingName}</span>
                </h2>
                {hasUpcomingStack && !isHomeLoading && (
                  <p className="home-member-subtitle">
                    {`Ai ${stackEvents.length} eveniment${stackEvents.length > 1 ? 'e' : ''} în curând - pregătește-te!`}
                  </p>
                )}
              </div>
            </div>

            {hasUpcomingStack ? (
              <>
                <div className="home-member-pair ticket-only">
                  <div className={hasMultipleStackEvents ? 'home-member-stack-wrapper' : ''}>
                    {stackGhostCount > 0 ? <div className="stack-ghost-card stack-ghost-card-one" aria-hidden="true"></div> : null}
                    {stackGhostCount > 1 ? <div className="stack-ghost-card stack-ghost-card-two" aria-hidden="true"></div> : null}

                    <article className={`home-member-card home-member-card-ticket has-ticket home-member-stack-card${isPrimaryPrivate ? ' is-private' : ' is-public'}`}>
                      <div className={`home-ticket-layout${isPrimaryPublic ? '' : ' no-qr'}`}>
                        <div className="home-ticket-visual">
                          <span className="home-ticket-days-chip">{getDaysUntilLabel(primaryStackEvent.startDate)}</span>
                            {primaryStackEvent.event?.image_url ? (
                            <img
                              src={primaryStackEvent.event.image_url?.startsWith('http') || primaryStackEvent.event.image_url?.startsWith('data:') ? primaryStackEvent.event.image_url : ''}
                              alt={primaryStackEvent.event?.title || 'Eveniment'}
                            />
                          ) : (
                            <div className="home-ticket-visual-placeholder">
                              {(primaryStackEvent.event?.title || 'E').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="home-ticket-main">
                          {isPrimaryPublic ? (
                            <>
                              <p className="home-ticket-kicker"><FaTicketAlt /> URMĂTORUL TĂU EVENIMENT</p>
                              <h3>{primaryStackEvent.event?.title || 'Eveniment'}</h3>

                              <div className="home-ticket-meta-grid">
                                <div className="home-ticket-meta-block">
                                  <p className="home-ticket-meta-label"><FiCalendar /> DATA</p>
                                  <p className="home-ticket-meta-value">{nextTicketDateParts.dayPart}</p>
                                  <p className="home-ticket-meta-time">{nextTicketDateParts.timePart}</p>
                                </div>

                                <div className="home-ticket-meta-block">
                                  <p className="home-ticket-meta-label"><FiMapPin /> LOCAȚIE</p>
                                  <p className="home-ticket-meta-value">{primaryStackEvent.event?.location || 'Locație nespecificată'}</p>
                                </div>
                              </div>

                              <div className="home-ticket-actions-row">
                                <button
                                  type="button"
                                  className="home-ticket-primary-btn"
                                  onClick={() => {
                                    if (primaryStackEvent.event?.id) {
                                      navigate(`/event/${primaryStackEvent.event.id}`);
                                    } else {
                                      navigate('/my-events');
                                    }
                                  }}
                                >
                                  <FaTicketAlt />
                                  <span>Vezi evenimentul</span>
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="home-ticket-kicker"><PiConfetti /> {isPrimaryHost ? 'EȘTI GAZDĂ' : 'EȘTI INVITAT LA'}</p>

                              <div className="home-private-card-grid">
                                <div className="home-private-main-col">
                                  <h3>{primaryStackEvent.event?.title || 'Eveniment'}</h3>

                                  <div className="home-ticket-meta-grid">
                                    <div className="home-ticket-meta-block">
                                      <p className="home-ticket-meta-label"><FiCalendar /> DATA</p>
                                      <p className="home-ticket-meta-value">{nextTicketDateParts.dayPart}</p>
                                      <p className="home-ticket-meta-time">{nextTicketDateParts.timePart}</p>
                                    </div>

                                    <div className="home-ticket-meta-block">
                                      <p className="home-ticket-meta-label"><FiMapPin /> LOCAȚIE</p>
                                      <p className="home-ticket-meta-value">{primaryStackEvent.event?.location || 'Locație nespecificată'}</p>
                                    </div>
                                  </div>

                                  <div className="home-ticket-actions-row">
                                    <button
                                      type="button"
                                      className="home-ticket-primary-btn"
                                      onClick={() => setIsPrivateInviteModalOpen(true)}
                                    >
                                      <FiLock />
                                      <span>Deschide invitația</span>
                                    </button>
                                  </div>
                                </div>

                                <aside className={`home-private-side-col${canViewGuestList ? '' : ' home-private-side-col-empty'}`}>
                                  {canViewGuestList ? (
                                    <>
                                      <p className="home-private-side-title">INVITAȚI</p>
                                      {visibleConfirmedGuests.length > 0 ? (
                                        <div className="home-private-side-avatars" aria-hidden="true">
                                          {visibleConfirmedGuests.map((guest, index) => {
                                            const initials = getGuestInitials(guest) || '•';
                                            return <span key={guest?.id || `${guest?.fullName || 'guest'}-${index}`}>{initials}</span>;
                                          })}
                                          {remainingConfirmedGuests > 0 ? <span className="more">+{remainingConfirmedGuests}</span> : null}
                                        </div>
                                      ) : null}
                                      <p className="home-private-side-count">
                                        <strong>{privateConfirmedCount}</strong>
                                        <span>au confirmat</span>
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="home-private-side-title">INVITAȚI</p>
                                      <p className="home-private-side-empty-copy">Lista invitaților este ascunsă de organizator.</p>
                                    </>
                                  )}
                                </aside>
                              </div>
                            </>
                          )}
                        </div>

                        {isPrimaryPublic ? (
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
                        ) : null}
                      </div>
                    </article>

                    {hasMultipleStackEvents ? (
                      <div className="home-stack-indicator" aria-label="Indicator stivă evenimente">
                        <button
                          type="button"
                          className="home-stack-nav-btn"
                          onClick={goToPreviousStackEvent}
                          aria-label="Evenimentul anterior"
                        >
                          <FiChevronLeft />
                        </button>
                        <span>{safeActiveStackIndex + 1} din {stackEvents.length}</span>
                        <button
                          type="button"
                          className="home-stack-nav-btn"
                          onClick={goToNextStackEvent}
                          aria-label="Evenimentul următor"
                        >
                          <FiChevronRight />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </section>
      )}

      {!user && <Hero onRecommendClick={() => setIsWizardOpen(true)} />}

      <CategoryBrowser onRecommendClick={user ? () => setIsWizardOpen(true) : undefined} />

      {user && (
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
                onClick={() => navigate(`/event/${event.id}`)}
              >
                {event.image_url ? (
                  <img
                    src={event.image_url?.startsWith('http') || event.image_url?.startsWith('data:') ? event.image_url : ''}
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
      )}

      <WeekendFeed />

              {!user && (
                <section className="home-org-cta">
                  <div className="home-org-cta-inner">
                    <div className="home-org-cta-left">
                      <p className="home-org-cta-label">PENTRU ORGANIZATORI</p>
                      <h2 className="home-org-cta-title">Publici evenimente pentru comunitate?</h2>
                      <p className="home-org-cta-desc">
                        Pentru ONG-uri, asociații și business-uri care organizează activități deschise publicului.
                      </p>
                    </div>
                    <div className="home-org-cta-right">
                      <button
                        type="button"
                        className="home-org-cta-btn-primary"
                        onClick={() => navigate('/about')}
                      >
                        Cum funcționează →
                      </button>
                    </div>
                  </div>
                </section>
              )}

              <RecommendationWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
              />

              {isTicketModalOpen && isPrimaryPublic && primaryStackEvent ? (
                <div
                  className="home-ticket-modal-overlay"
                  role="presentation"
                  onClick={() => setIsTicketModalOpen(false)}
                >
                  <div
                    className="home-ticket-modal home-ticket-modal-public"
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

                      <p className="home-ticket-modal-kicker"><FaTicketAlt /> {(() => { const n = primaryStackEvent?.ticketCodes?.length || 1; return n > 1 ? `BILETELE TALE (${n})` : 'BILETUL TĂU'; })()}</p>
                      <h2 id="home-ticket-modal-title">{primaryStackEvent.event?.title || 'Eveniment'}</h2>

                      <div className="home-ticket-modal-meta">
                        <span><FiCalendar /> {nextTicketDateParts.dayPart}</span>
                        <span><FiMapPin /> {primaryStackEvent.event?.location || 'Locație nespecificată'}</span>
                      </div>
                    </div>

                    <div className="home-ticket-modal-body">
                      <div className="home-ticket-modal-perforation" aria-hidden="true">
                        <span></span>
                        <span></span>
                      </div>

                      <div className="home-ticket-modal-qr-shell">
                        {(() => {
                          const codes = Array.isArray(primaryStackEvent?.ticketCodes) && primaryStackEvent.ticketCodes.length > 0
                            ? primaryStackEvent.ticketCodes
                            : [primaryStackEvent?.ticketCode].filter(Boolean);
                          const hasMulti = codes.length > 1;
                          const safeIdx = Math.min(activeModalTicketIndex, codes.length - 1);
                          return (
                            <>
                              {hasMulti && (
                                <div className="home-ticket-modal-multi-nav">
                                  <button
                                    type="button"
                                    className="home-stack-nav-btn"
                                    onClick={() => setActiveModalTicketIndex((i) => (i - 1 + codes.length) % codes.length)}
                                    aria-label="Biletul anterior"
                                  >
                                    <FiChevronLeft />
                                  </button>
                                  <span>Bilet {safeIdx + 1} din {codes.length}</span>
                                  <button
                                    type="button"
                                    className="home-stack-nav-btn"
                                    onClick={() => setActiveModalTicketIndex((i) => (i + 1) % codes.length)}
                                    aria-label="Biletul următor"
                                  >
                                    <FiChevronRight />
                                  </button>
                                </div>
                              )}
                              <div className="home-ticket-modal-qr-card">
                                <QRCode
                                  value={nextTicketQrValue || codes[safeIdx] || 'ticket'}
                                  size={220}
                                  bgColor="#141821"
                                  fgColor="#f8fafc"
                                  style={{ width: '100%', height: '100%' }}
                                />
                              </div>
                              <p className="home-ticket-modal-code">{codes[safeIdx] || 'TK-UNKNOWN'}</p>
                              <p className="home-ticket-modal-note">Arată acest cod la intrare</p>
                            </>
                          );
                        })()}
                      </div>

                      <button type="button" className="home-ticket-modal-action" onClick={handleDownloadPdf} disabled={downloadingPdf}>
                        <FiDownload />
                        {downloadingPdf ? 'Se descarcă...' : (() => {
                          const n = Array.isArray(primaryStackEvent?.ticketCodes) ? primaryStackEvent.ticketCodes.length : 1;
                          return n > 1 ? `Descarcă toate biletele (${n})` : 'Descarcă PDF';
                        })()}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {isPrivateInviteModalOpen && isPrimaryPrivate && primaryStackEvent ? (
                <div
                  className="home-ticket-modal-overlay"
                  role="presentation"
                  onClick={() => setIsPrivateInviteModalOpen(false)}
                >
                  <div
                    className="home-ticket-modal home-private-invite-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="home-private-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div
                      className={`home-ticket-modal-header home-private-invite-header${privateInviteImageUrl ? ' has-image' : ''}`}
                      style={privateInviteHeaderStyle}
                    >
                      <button
                        type="button"
                        className="home-ticket-modal-close"
                        onClick={() => setIsPrivateInviteModalOpen(false)}
                        aria-label="Închide invitația"
                      >
                        <FiX />
                      </button>

                      <p className="home-ticket-modal-kicker"><PiConfetti /> {isPrimaryHost ? 'EȘTI GAZDĂ' : 'EȘTI INVITAT LA'}</p>
                      <h2 id="home-private-modal-title">{primaryStackEvent.event?.title || 'Eveniment privat'}</h2>
                      {!isPrimaryHost ? <p className="home-private-organizer-line in-modal">{privateOrganizerLine}</p> : null}

                      <div className="home-ticket-modal-meta">
                        <span><FiCalendar /> {nextTicketDateParts.dayPart} • {nextTicketDateParts.timePart}</span>
                        <span><FiMapPin /> {primaryStackEvent.event?.location || 'Locație nespecificată'}</span>
                      </div>
                    </div>

                    <div className="home-ticket-modal-body home-private-invite-body">
                      {privateDescription ? (
                        <div className="home-private-details-block">
                          <p className="home-private-details-title">Descriere</p>
                          <p className="home-private-details-copy">{privateDescription}</p>
                        </div>
                      ) : null}

                      {privateGuestNotes ? (
                        <div className="home-private-details-block">
                          <p className="home-private-details-title">Detalii pentru invitați</p>
                          <p className="home-private-details-copy">{privateGuestNotes}</p>
                        </div>
                      ) : null}

                      {canViewGuestList ? (
                        <div className="home-private-details-block">
                          <p className="home-private-details-title">Lista invitaților</p>

                          {privateModalGuestsLoading ? (
                            <p className="home-private-details-copy">Se încarcă invitații...</p>
                          ) : null}

                          {!privateModalGuestsLoading && privateModalGuestsError ? (
                            <p className="home-private-details-copy">{privateModalGuestsError}</p>
                          ) : null}

                          {!privateModalGuestsLoading && !privateModalGuestsError && modalGuestsToRender.length > 0 ? (
                            <ul className="home-private-modal-guests-list">
                              {modalGuestsToRender.map((guest, index) => {
                                const fullName = String(guest?.displayName || guest?.fullName || 'Invitat').trim();
                                const initials = getGuestInitials(guest) || fullName.charAt(0).toUpperCase();
                                const inviteStatus = guest?.inviteStatus || 'accepted';
                                const inviteStatusLabel = inviteStatus === 'accepted' ? 'Acceptat' : (inviteStatus === 'pending' ? 'În așteptare' : inviteStatus);
                                return (
                                  <li key={guest?.id || `${fullName}-${index}`}>
                                    <span>{initials}</span>
                                    <strong>{fullName}</strong>
                                    <small>{inviteStatusLabel}</small>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : null}

                          {!privateModalGuestsLoading && !privateModalGuestsError && modalGuestsToRender.length === 0 ? (
                            <p className="home-private-details-copy">Nu există invitați încă.</p>
                          ) : null}
                        </div>
                      ) : (
                        <div className="home-private-details-block home-private-details-block-empty">
                          <p className="home-private-details-title">Lista invitaților</p>
                          <p className="home-private-details-copy">Lista invitaților este ascunsă de organizator.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {pdfPayload ? <TicketPdfRenderer payload={pdfPayload} ref={ticketPdfRef} /> : null}
            </div>
          );
        };

        export default Home;
