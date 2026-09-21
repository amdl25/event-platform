import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCalendar, FiCheck, FiClock, FiCopy, FiDownload, FiMail, FiMapPin, FiUser } from 'react-icons/fi';
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
  const [copied, setCopied] = useState(false);

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
      setEmailStatusMessage(`trimis la ${firstTicket.buyerEmail}`);
    }
  }, [location, navigate]);

  const firstTicket = useMemo(() => ticketData?.tickets?.[0] || null, [ticketData]);

  const confirmationDateLong = useMemo(() => {
    if (!firstTicket?.eventDate) return '-';
    const raw = new Date(firstTicket.eventDate).toLocaleDateString('ro-RO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [firstTicket]);

  const confirmationTimeLabel = useMemo(() => {
    if (!firstTicket?.eventDate) return '-';
    return new Date(firstTicket.eventDate).toLocaleTimeString('ro-RO', {
      hour: '2-digit', minute: '2-digit'
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
        points: Number(ticket.points || 0),
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
          .toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'eveniment'}`,
        layoutMode: 'stack'
      });
    } catch (err) {
      setError('Eroare la generarea PDF-ului.');
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = useCallback(async () => {
    if (!ticketData || !eventData || !firstTicket?.buyerName) return;
    setSending(true);
    setError('');
    try {
      const response = await API.post('/events/tickets/send-email', {
        buyerEmail: firstTicket.buyerEmail,
        buyerName: firstTicket.buyerName,
        eventTitle: eventData.title || firstTicket?.eventTitle || 'Eveniment',
        eventDate: eventData.start_date || firstTicket?.eventDate || new Date().toISOString(),
        eventLocation: eventData.location || firstTicket?.eventLocation || 'Locatie nespecificata',
        tickets: ticketData.tickets,
        quantity: ticketData.quantity,
        totalPrice: ticketData.totalPrice
      });
      if (response.status === 200) {
        setEmailSent(true);
        const accepted = response.data?.accepted?.[0] || firstTicket.buyerEmail;
        setEmailStatusMessage(`trimis la ${accepted}`);
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

  const handleCopyCode = () => {
    navigator.clipboard.writeText(ticketCodeLabel).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!ticketData || !eventData) return null;

  const buyerEmailLabel = firstTicket?.buyerEmail || '-';
  const buyerNameLabel = firstTicket?.buyerName || '-';
  const ticketCodeLabel = firstTicket?.code || '-';
  const eventLocationLabel = firstTicket?.eventLocation || eventData.location || '-';
  const eventTitleLabel = firstTicket?.eventTitle || eventData.title || 'Eveniment';

  return (
    <div className="pcp-page">
      <div className="pcp-wrapper">
      <div className="pcp-container">
        <div className="pcp-header">
          <div className="pcp-check-circle">
            <FiCheck strokeWidth={2.5} />
          </div>
          <h1 className="pcp-title">Locul tău este rezervat</h1>
          <p className="pcp-subtitle">
            Îți mulțumim, <strong>{buyerNameLabel}</strong>. Ai cumpărat{' '}
            {ticketData.quantity} bilet{ticketData.quantity > 1 ? 'e' : ''} pentru:
          </p>
          <p className="pcp-event-name">{eventTitleLabel}</p>
        </div>

        <div className="pcp-info-grid">
          <div className="pcp-info-card">
            <span className="pcp-info-label"><FiCalendar size={11} /> DATA</span>
            <span className="pcp-info-value">{confirmationDateLong}</span>
          </div>
          <div className="pcp-info-card">
            <span className="pcp-info-label"><FiClock size={11} /> ORA</span>
            <span className="pcp-info-value">{confirmationTimeLabel}</span>
          </div>
          <div className="pcp-info-card pcp-info-card--full">
            <span className="pcp-info-label"><FiMapPin size={11} /> LOCAȚIE</span>
            <span className="pcp-info-value">{eventLocationLabel}</span>
          </div>
          <div className="pcp-info-card pcp-info-card--full">
            <span className="pcp-info-label"><FiUser size={11} /> CUMPĂRĂTOR</span>
            <div className="pcp-buyer-row">
              <div className="pcp-buyer-avatar">
                {(buyerNameLabel || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="pcp-buyer-info">
                <strong>{buyerNameLabel}</strong>
                <span>{buyerEmailLabel}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pcp-ticket">
          <div className="pcp-ticket-qr-col">
            {firstTicket?.qr ? (
              <img src={firstTicket.qr} alt="QR Code" className="pcp-qr-img" />
            ) : (
              <div className="pcp-qr-placeholder" />
            )}
            <span className="pcp-qr-hint">Prezintă acest cod la intrare</span>
          </div>
          <div className="pcp-ticket-divider" aria-hidden="true" />
          <div className="pcp-ticket-code-col">
            <span className="pcp-code-label">COD BILET</span>
            <span className="pcp-code-value">{ticketCodeLabel}</span>
            <button className="pcp-copy-btn" onClick={handleCopyCode} type="button">
              <FiCopy size={12} />
              {copied ? 'Copiat!' : 'Copiază codul'}
            </button>
          </div>
        </div>

        <div className="pcp-actions">
          <button className="pcp-btn-primary" onClick={handleDownloadPDF} disabled={downloading} type="button">
            <FiDownload size={15} />
            {downloading ? 'Se descarcă...' : 'Descarcă PDF'}
          </button>
        </div>

        {error ? <div className="pcp-error">{error}</div> : null}

        <div className="pcp-email-note">
          <FiMail size={13} />
          <span>
            Un email cu biletul a fost trimis către <strong>{buyerEmailLabel}</strong>.{' '}
            {!emailSent && !sending && (
              <button className="pcp-resend-link" onClick={handleSendEmail} type="button">
                Retrimite
              </button>
            )}
          </span>
        </div>
        <p className="pcp-spam-hint">Verifică și folderul Spam dacă nu-l găsești în câteva minute.</p>

      </div>

      <div className="pcp-footer">
        <button className="pcp-nav-btn" onClick={() => navigate('/')} type="button">
          <FiArrowLeft size={13} /> Acasă
        </button>
        {eventData.id ? (
          <button className="pcp-nav-btn" onClick={() => navigate(`/event/${eventData.id}`)} type="button">
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
