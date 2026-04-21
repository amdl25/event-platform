import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheckCircle, FiDownload, FiMail } from 'react-icons/fi';
import API from '../api';
import TicketPdfRenderer from '../components/TicketPdfRenderer';
import { downloadTicketsPdf } from '../utils/downloadTicketsPdf';
import '../styles/TicketsDownloadPage.css';

const PurchaseConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const ticketPdfRef = useRef(null);

  const [ticketData, setTicketData] = useState(null);
  const [eventData, setEventData] = useState(null);
  const [pdfPayload, setPdfPayload] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const state = location.state;
    let successState = state;

    if (!successState?.successData || !successState?.event) {
      try {
        const stored = sessionStorage.getItem('eventHubLastPurchase');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.successData && parsed?.event) {
            successState = parsed;
          }
        }
      } catch {
      }
    }

    if (!successState?.successData) {
      navigate('/');
      return;
    }

    const firstTicket = successState.successData?.tickets?.[0] || null;
    const resolvedEvent = successState.event || {
      id: null,
      title: firstTicket?.eventTitle || 'Eveniment',
      start_date: firstTicket?.eventDate || null,
      location: firstTicket?.eventLocation || 'Locatie nespecificata'
    };

    setTicketData(successState.successData);
    setEventData(resolvedEvent);
    setEmailSent(Boolean(successState.successData?.emailSent));
    if (successState.successData?.emailSent && firstTicket?.buyerEmail) {
      setEmailStatusMessage(`Email trimis catre ${firstTicket.buyerEmail}`);
    }
  }, [location, navigate]);

  const firstTicket = useMemo(() => ticketData?.tickets?.[0] || null, [ticketData]);

  const confirmationDateLabel = useMemo(() => {
    if (!firstTicket?.eventDate) return '';
    return new Date(firstTicket.eventDate).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, [firstTicket]);

  const confirmationTimeLabel = useMemo(() => {
    if (!firstTicket?.eventDate) return '';
    return new Date(firstTicket.eventDate).toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [firstTicket]);

  const buildPdfPayload = useCallback(() => {
    if (!ticketData || !eventData) return null;

    return {
      eventTitle: eventData.title || 'Eveniment',
      generatedAt: new Date().toISOString(),
      tickets: (ticketData.tickets || []).map((ticket, index) => ({
        number: index + 1,
        code: ticket.code || `TK-${String(index + 1).padStart(3, '0')}`,
        qrValue: ticket.qr || ticket.code || `ticket-${index + 1}`,
        eventId: ticket.eventId || eventData.id || null,
        date: ticket.eventDate || eventData.start_date,
        location: ticket.eventLocation || eventData.location || 'Locatie nespecificata',
        points: Number(eventData.points_value || 0),
        organizationName: ticket.organizationName || eventData.organizationName || 'Organizator'
      }))
    };
  }, [eventData, ticketData]);

  const handleDownloadPDF = async () => {
    if (!ticketData || !eventData || downloading) return;

    setDownloading(true);
    try {
      const payload = buildPdfPayload();
      await downloadTicketsPdf({
        eventTitle: payload.eventTitle,
        tickets: payload.tickets,
        fileName: `bilete-${String(eventData?.title || eventData?.id || 'eveniment')
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '') || 'eveniment'}`
      });
    } catch (err) {
      console.error('PDF generation error:', err);
      setError('Eroare la generarea PDF-ului.');
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = useCallback(async () => {
    if (!ticketData || !eventData) return;

    if (!firstTicket?.buyerName) {
      setError('Nu am găsit datele cumpărătorului pentru trimiterea pe email.');
      return;
    }

    setSending(true);
    setError('');
    setEmailStatusMessage('');

    try {
      const resolvedEventTitle = eventData.title || firstTicket?.eventTitle || 'Eveniment';
      const resolvedEventDate = eventData.start_date || firstTicket?.eventDate || new Date().toISOString();
      const resolvedEventLocation = eventData.location || firstTicket?.eventLocation || 'Locatie nespecificata';

      const response = await API.post('/events/tickets/send-email', {
        buyerEmail: firstTicket.buyerEmail,
        buyerName: firstTicket.buyerName,
        eventTitle: resolvedEventTitle,
        eventDate: resolvedEventDate,
        eventLocation: resolvedEventLocation,
        tickets: ticketData.tickets,
        quantity: ticketData.quantity,
        totalPrice: ticketData.totalPrice
      });

      if (response.status === 200) {
        setEmailSent(true);
        const acceptedEmail = response.data?.accepted?.[0] || firstTicket.buyerEmail;
        setEmailStatusMessage(`Email trimis cu succes catre ${acceptedEmail}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Eroare la trimiterea email-ului.');
    } finally {
      setSending(false);
    }
  }, [eventData, firstTicket, ticketData]);

  useEffect(() => {
    if (!ticketData || !eventData || emailSent || sending) return;
    if (!firstTicket?.buyerEmail) return;
    handleSendEmail();
  }, [ticketData, eventData, emailSent, sending, firstTicket, handleSendEmail]);

  if (!ticketData || !eventData) {
    return null;
  }

  const buyerEmailLabel = firstTicket?.buyerEmail || '—';
  const buyerNameLabel = firstTicket?.buyerName || '—';
  const ticketCodeLabel = firstTicket?.code || '—';
  const eventLocationLabel = firstTicket?.eventLocation || eventData.location || '—';
  const eventTitleLabel = firstTicket?.eventTitle || eventData.title || 'Eveniment';
  const totalPaidLabel = Number(ticketData.totalPrice || 0).toFixed(2);

  return (
    <div className="tickets-download-page">
      <div className="tickets-container">
        <div className="tickets-header">
          <div className="success-badge">
            <FiCheckCircle />
            <span>Bilete cumpărate cu succes!</span>
          </div>
          <h1>Vă mulțumim.</h1>
          <p className="tickets-subtitle">Locul dumneavoastră este rezervat.</p>
          <p className="purchase-summary">
            Ai cumpărat {ticketData.quantity} bilet(e) • Total: <strong>{totalPaidLabel} lei</strong>
          </p>
        </div>

        <div className="tickets-ticket-card">
          <div className="tickets-ticket-grid">
            <div className="tickets-ticket-left">
              <span className="tickets-ticket-pill">ACCES GENERAL</span>
              <h2 className="tickets-event-title">{eventTitleLabel}</h2>
              <p className="tickets-event-location">{eventLocationLabel}</p>

              <div className="tickets-meta-grid">
                <div className="tickets-meta-item">
                  <span className="tickets-meta-label">DATA</span>
                  <strong>{confirmationDateLabel || '—'}</strong>
                </div>
                <div className="tickets-meta-item">
                  <span className="tickets-meta-label">ORA</span>
                  <strong>{confirmationTimeLabel || '—'}</strong>
                </div>
                <div className="tickets-meta-item tickets-code-item">
                  <span className="tickets-meta-label">COD BILET</span>
                  <strong>{ticketCodeLabel}</strong>
                </div>
              </div>
            </div>

            <div className="tickets-ticket-right">
              <div className="tickets-qr-shell">
                <img src={firstTicket?.qr} alt="QR Code" className="tickets-qr-large" />
                <span>PREZINTĂ ACEST COD LA INTRARE</span>
              </div>
            </div>
          </div>

          <div className="tickets-ticket-footer-row">
            <div className="tickets-buyer-chip">{(buyerNameLabel || 'U').slice(0, 2).toUpperCase()}</div>
            <div className="tickets-footer-info">
              <div>
                <span>Cumpărător</span>
                <strong>{buyerNameLabel}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{buyerEmailLabel}</strong>
              </div>
              <div>
                <span>Total achitat</span>
                <strong>{totalPaidLabel} lei</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="tickets-confirm-note">
          {emailStatusMessage || `O copie a confirmării a fost trimisă la ${buyerEmailLabel}`}
        </div>

        <div className="tickets-actions">
          <button 
            className="btn-action download-btn" 
            onClick={handleDownloadPDF}
            disabled={downloading}
          >
            <FiDownload />
            {downloading ? 'Se descarcă...' : 'Descarcă PDF'}
          </button>

          <button 
            className={`btn-action email-btn ${emailSent ? 'sent' : ''}`}
            onClick={handleSendEmail}
            disabled={sending}
          >
            <FiMail />
            {sending ? 'Se trimite...' : 'Retrimite pe Email'}
          </button>
        </div>

        {error ? <div className="error-message">{error}</div> : null}

        <div className="tickets-footer">
          <button className="btn-secondary" onClick={() => navigate('/')}>
            <FiArrowLeft /> Acasă
          </button>
          {eventData.id ? (
            <button className="btn-secondary" onClick={() => navigate(`/event/${eventData.id}`)}>
              Înapoi la eveniment
            </button>
          ) : null}
        </div>
      </div>

      {pdfPayload ? <TicketPdfRenderer payload={pdfPayload} ref={ticketPdfRef} /> : null}
    </div>
  );
};

export default PurchaseConfirmationPage;
