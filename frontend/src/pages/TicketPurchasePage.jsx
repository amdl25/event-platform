import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiArrowLeft, FiCreditCard, FiLock, FiMinus, FiPlus, FiStar } from 'react-icons/fi';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import API from '../api';
import '../styles/TicketPurchasePage.css';

const TicketPurchasePage = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'user' ? 'user' : 'guest';
  const paymentStatus = searchParams.get('payment');
  const sessionId = searchParams.get('session_id');
  const requestedTicketTypeId = searchParams.get('ticket_type_id');
  const requestedQty = Number(searchParams.get('qty'));

  const [event, setEvent] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [loadingPurchase, setLoadingPurchase] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [error, setError] = useState('');
  const [purchaseNotice, setPurchaseNotice] = useState('');

  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [quantity, setQuantity] = useState(() => (
    Number.isInteger(requestedQty) && requestedQty >= 1 && requestedQty <= 20 ? requestedQty : 1
  ));
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [pricing, setPricing] = useState(null);
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState(null);
  const [touched, setTouched] = useState({ buyerEmail: false, buyerName: false, pointsToUse: false });
  const canUsePoints = Boolean(mode === 'user' && user?.id);
  const confirmedSessionRef = useRef('');
  const redirectTimeoutRef = useRef(null);
  const emailError = touched.buyerEmail && (!String(buyerEmail || '').trim() ? 'Email-ul este obligatoriu.' : (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(buyerEmail || '').trim()) ? 'Format email invalid.' : ''));
  const nameError = touched.buyerName && (!String(buyerName || '').trim() ? 'Numele este obligatoriu.' : (String(buyerName || '').trim().length < 2 ? 'Minim 2 caractere.' : ''));
  const numericPoints = Number(pointsToUse || 0);
  const pointsError = canUsePoints && usePoints && touched.pointsToUse && (!Number.isInteger(numericPoints) || numericPoints < 0 ? 'Introdu un număr valid de puncte.' : '');

  const saveLastPurchaseContext = (successData, eventData) => {
    try {
      sessionStorage.setItem('eventHubLastPurchase', JSON.stringify({
        successData,
        event: eventData,
        savedAt: Date.now()
      }));
    } catch {
    }
  };

  const defaultName = useMemo(() => {
    if (!user) return '';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
  }, [user]);

  const defaultEmail = useMemo(() => user?.email || '', [user]);

  useEffect(() => {
    if (mode === 'user' && !user?.id) {
      navigate(`/login?redirect=${encodeURIComponent(`/purchase/${id}?mode=user`)}`);
      return;
    }

    if (mode === 'user') {
      setBuyerName(defaultName);
      setBuyerEmail(defaultEmail);
    }
  }, [mode, user?.id, defaultName, defaultEmail, id, navigate]);

  useEffect(() => {
    const loadEvent = async () => {
      setLoadingEvent(true);
      try {
        const response = await API.get(`/events/${id}`);
        setEvent(response.data);
        const rawTicketTypes = Array.isArray(response.data?.ticketTypes) ? response.data.ticketTypes : [];
        const sortedTicketTypes = [...rawTicketTypes].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
        setTicketTypes(sortedTicketTypes);
        if (sortedTicketTypes.length > 0 && !selectedTicketTypeId) {
          const requestedIsValid = sortedTicketTypes.some((tt) => String(tt.id) === String(requestedTicketTypeId));
          setSelectedTicketTypeId(requestedIsValid ? requestedTicketTypeId : sortedTicketTypes[0].id);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Nu am putut încărca evenimentul.');
      } finally {
        setLoadingEvent(false);
      }
    };

    if (id) loadEvent();
  }, [id]);

  useEffect(() => {
    const loadQuote = async () => {
      const qty = Number(quantity);
      if (!id || !selectedTicketTypeId || !Number.isInteger(qty) || qty < 1 || qty > 20) {
        return;
      }

      try {
        setLoadingQuote(true);
        const response = await API.get('/events/purchase/quote', {
          params: {
            event_id: id,
            ticket_type_id: selectedTicketTypeId,
            quantity: qty,
            points_to_use: usePoints ? pointsToUse : 0
          }
        });

        const nextPricing = response.data?.pricing || null;
        setPricing(nextPricing);

        if (nextPricing) {
          if (!usePoints) {
            setPointsToUse(0);
          } else if (pointsToUse > Number(nextPricing.maxPointsUsable || 0)) {
            setPointsToUse(Number(nextPricing.maxPointsUsable || 0));
          }
        }
      } catch {
      } finally {
        setLoadingQuote(false);
      }
    };

    loadQuote();
  }, [id, pointsToUse, quantity, usePoints, selectedTicketTypeId]);

  useEffect(() => {
    const confirmStripePayment = async () => {
      if (paymentStatus !== 'success' || !sessionId) return;
      if (loadingEvent) {
        setPurchaseNotice('Plata a fost inregistrata. Pregatim confirmarea comenzii...');
        return;
      }
      if (confirmedSessionRef.current === sessionId) return;
      confirmedSessionRef.current = sessionId;

      try {
        setError('');
        setConfirmingPayment(true);
        setPurchaseNotice('Plata a fost inregistrata. Confirmam comanda si generam biletele...');
        const response = await API.post('/events/purchase/confirm-session', {
          session_id: sessionId
        }, {
          timeout: 20000
        });

        const firstTicket = response.data?.tickets?.[0] || null;
        const resolvedEvent = event || {
          id,
          title: firstTicket?.eventTitle || 'Eveniment',
          start_date: firstTicket?.eventDate || null,
          location: firstTicket?.eventLocation || 'Locatie nespecificata'
        };

        setPurchaseNotice('Comanda confirmata. Te redirectionam catre bilete...');
        redirectTimeoutRef.current = setTimeout(() => {
          saveLastPurchaseContext(response.data, resolvedEvent);
          navigate('/purchase-confirmation', {
            state: {
              successData: response.data,
              event: resolvedEvent
            },
            replace: true
          });
        }, 1800);
      } catch (err) {
        setError(err.response?.data?.message || 'Nu am putut confirma plata Stripe.');
        confirmedSessionRef.current = '';
        setPurchaseNotice('');
      } finally {
        setConfirmingPayment(false);
      }
    };

    if (paymentStatus === 'cancel') {
      setError('Plata a fost anulată. Poți încerca din nou.');
      return;
    }

    confirmStripePayment();
  }, [event, id, loadingEvent, navigate, paymentStatus, sessionId]);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const handlePurchase = async () => {
    setTouched((prev) => ({ ...prev, buyerEmail: true, buyerName: true, pointsToUse: true }));
    const nameToSend = buyerName.trim();
    const emailToSend = buyerEmail.trim();
    const qty = Number(quantity);
    const pointsAmount = Number(pointsToUse || 0);

    if (!nameToSend || !emailToSend) {
      setError('Numele și email-ul sunt obligatorii.');
      return;
    }

    if (nameToSend.length < 2) {
      setError('Numele cumpărătorului trebuie să aibă cel puțin 2 caractere.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToSend)) {
      setError('Introdu o adresă de email validă.');
      return;
    }

    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      setError('Numărul de bilete trebuie să fie între 1 și 20.');
      return;
    }

    if (usePoints && (!Number.isInteger(pointsAmount) || pointsAmount < 0)) {
      setError('Punctele folosite trebuie să fie un număr valid.');
      return;
    }

    try {
      setError('');
      setLoadingPurchase(true);

      const referredBy = localStorage.getItem(`eventhub_ref_${id}`);

      const payload = {
        event_id: id,
        ticket_type_id: selectedTicketTypeId,
        buyer_name: nameToSend,
        buyer_email: emailToSend,
        quantity: qty,
        use_points: mode === 'user' ? usePoints : false,
        points_to_use: mode === 'user' && usePoints ? pointsAmount : 0,
        ...(referredBy ? { referred_by: referredBy } : {})
      };

      const response = await API.post('/events/purchase/checkout-session', payload);

      if (response.data?.checkoutRequired === false) {
        const firstTicket = response.data?.tickets?.[0] || null;
        const resolvedEvent = event || {
          id,
          title: firstTicket?.eventTitle || 'Eveniment',
          start_date: firstTicket?.eventDate || null,
          location: firstTicket?.eventLocation || 'Locatie nespecificata'
        };
        localStorage.removeItem(`eventhub_ref_${id}`);
        setPurchaseNotice('Comanda confirmata. Pregatim biletele tale...');
        redirectTimeoutRef.current = setTimeout(() => {
          saveLastPurchaseContext(response.data, resolvedEvent);
          navigate('/purchase-confirmation', {
            state: {
              successData: response.data,
              event: resolvedEvent
            }
          });
        }, 1600);
        return;
      }

      if (response.data?.checkoutUrl) {
        window.location.assign(response.data.checkoutUrl);
        return;
      }

      setError('Nu am primit URL-ul de plată Stripe.');
    } catch (err) {
      setError(err.response?.data?.message || 'Eroare la cumpărarea biletelor.');
    } finally {
      setLoadingPurchase(false);
    }
  };

  const selectedTicketType = ticketTypes.find((tt) => String(tt.id) === String(selectedTicketTypeId)) || null;
  const unitPrice = Number(selectedTicketType?.price ?? event?.price ?? 0);
  const ticketTypeName = selectedTicketType?.name || 'Bilet General';
  const selectedQuantity = Math.max(1, Math.min(20, Number(quantity) || 1));

  const handleDecrementQuantity = () => {
    setQuantity((prev) => Math.max(1, Number(prev || 1) - 1));
  };

  const handleIncrementQuantity = () => {
    setQuantity((prev) => Math.min(20, Number(prev || 1) + 1));
  };

  if (loadingEvent) return null;
  if (!event) return <div className="checkout-page"><div className="checkout-shell">Evenimentul nu a fost găsit.</div></div>;

  const eventDateLabel = event.start_date
    ? new Date(event.start_date).toLocaleString('ro-RO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    : 'Data nespecificată';

  return (
    <div className="checkout-page">
      <header className="checkout-topbar">
        <button type="button" className="checkout-back" onClick={() => navigate(`/event/${id}`)}>
          <FiArrowLeft />
        </button>
        <h1>Checkout</h1>
      </header>

      <div className="checkout-shell">
        <section className="checkout-card">
          <div className="checkout-event-head">
            <div className="checkout-event-icon"><FiCreditCard /></div>
            <div>
              <h2>{event.title}</h2>
              <p>{eventDateLabel}</p>
            </div>
          </div>

          <div className="checkout-ticket-row">
            <div>
              <strong>{ticketTypeName}</strong>
              <p>{unitPrice.toFixed(0)} RON / bilet</p>
            </div>

            <div className="checkout-qty-controls">
              <button type="button" onClick={handleDecrementQuantity} disabled={loadingPurchase || confirmingPayment || selectedQuantity <= 1}>
                <FiMinus />
              </button>
              <span>{selectedQuantity}</span>
              <button type="button" onClick={handleIncrementQuantity} disabled={loadingPurchase || confirmingPayment || selectedQuantity >= 20}>
                <FiPlus />
              </button>
            </div>
          </div>
        </section>

        {canUsePoints ? (
          <section className="checkout-card checkout-points-row">
            <div className="checkout-points-left">
              <FiStar />
              <strong>Folosește puncte</strong>
              <span>{Number(pricing?.availablePoints || 0)} disponibile</span>
            </div>

            <label className="checkout-switch">
              <input
                type="checkbox"
                checked={usePoints}
                onChange={(e) => setUsePoints(e.target.checked)}
                disabled={
                  loadingPurchase
                  || confirmingPayment
                  || Number(pricing?.availablePoints || 0) <= 0
                }
              />
              <span className="checkout-slider" />
            </label>
          </section>
        ) : null}

        {canUsePoints && usePoints ? (
          <section className="checkout-card">
            <label className="checkout-field-label">Câte puncte vrei să folosești?</label>
            <input
              className="checkout-input"
              type="number"
              min="0"
              max={Number(pricing?.maxPointsUsable || 0)}
              value={pointsToUse}
              onChange={(e) => {
                setPointsToUse(e.target.value);
                if (error) setError('');
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, pointsToUse: true }))}
              disabled={loadingPurchase || confirmingPayment}
              placeholder="Ex: 250"
            />
            {pointsError ? <p className="checkout-field-error">{pointsError}</p> : null}
          </section>
        ) : null}

        <section className="checkout-card">
          <div className="checkout-section-title"><FiCreditCard /> Detalii plată</div>

          <label className="checkout-field-label">Email</label>
          <input
            type="email"
            placeholder="adresa@email.com"
            value={buyerEmail}
            onChange={(e) => {
              setBuyerEmail(e.target.value);
              if (error) setError('');
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, buyerEmail: true }))}
            autoComplete="email"
            className={`checkout-input${emailError ? ' checkout-input-invalid' : ''}`}
            disabled={loadingPurchase || confirmingPayment}
          />
          {emailError ? <p className="checkout-field-error">{emailError}</p> : null}

          <label className="checkout-field-label">Nume cumpărător</label>
          <input
            className={`checkout-input${nameError ? ' checkout-input-invalid' : ''}`}
            type="text"
            placeholder="Ion Popescu"
            value={buyerName}
            onChange={(e) => {
              setBuyerName(e.target.value);
              if (error) setError('');
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, buyerName: true }))}
            minLength={2}
            maxLength={120}
            autoComplete="name"
            disabled={loadingPurchase || confirmingPayment}
          />
          {nameError ? <p className="checkout-field-error">{nameError}</p> : null}

          <p className="checkout-stripe-hint">Datele cardului se introduc securizat pe pagina Stripe după apăsarea butonului de plată.</p>
        </section>

        <section className="checkout-card">
          <h3 className="checkout-summary-title">Sumar comandă</h3>
          <div className="checkout-summary-line">
            <span>{selectedQuantity}x {ticketTypeName}</span>
            <span>{Number(pricing?.subtotal || unitPrice * selectedQuantity).toFixed(2)} RON</span>
          </div>
          {Number(pricing?.discount || 0) > 0 ? (
            <div className="checkout-summary-line points">
              <span>Reducere puncte</span>
              <span>-{Number(pricing?.discount || 0).toFixed(2)} RON</span>
            </div>
          ) : null}
          <div className="checkout-summary-total">
            <span>Total</span>
            <strong>{Number(pricing?.total || unitPrice * selectedQuantity).toFixed(2)} RON</strong>
          </div>
          {loadingQuote ? <p className="checkout-loading-note">Actualizăm totalul...</p> : null}
        </section>

        {error ? <div className="checkout-error">{error}</div> : null}
        {purchaseNotice ? <div className="checkout-loading-note">{purchaseNotice}</div> : null}

        <button className="checkout-pay-button" onClick={handlePurchase} disabled={loadingPurchase || confirmingPayment}>
          {confirmingPayment
            ? 'Confirmăm plata...'
            : loadingPurchase
              ? 'Se redirecționează la Stripe...'
              : `Plătește ${Number(pricing?.total || unitPrice * selectedQuantity).toFixed(2)} RON`}
        </button>

        <p className="checkout-secure-note"><FiLock /> Plată securizată prin Stripe</p>

        <div className="checkout-cancel-wrap">
          <button type="button" className="checkout-cancel-button" onClick={() => navigate(`/event/${id}`)}>Renunță</button>
        </div>
      </div>
    </div>
  );
};

export default TicketPurchasePage;
