import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FiDownload, FiMail, FiCheckCircle } from 'react-icons/fi';
import API from '../api';
import '../styles/TicketsDownloadPage.css';

const TicketsDownloadPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const ticketPrintRef = useRef(null);

  const [ticketData, setTicketData] = useState(null);
  const [eventData, setEventData] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [autoEmailAttempted, setAutoEmailAttempted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const state = location.state;
    if (!state?.successData || !state?.event) {
      navigate('/');
      return;
    }
    setTicketData(state.successData);
    setEventData(state.event);
  }, [location, navigate]);

  const handleDownloadPDF = async () => {
    if (!ticketPrintRef.current || !ticketData) return;

    setDownloading(true);
    try {
      const canvas = await html2canvas(ticketPrintRef.current, {
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

      pdf.save(`bilete-${eventData.id || 'eveniment'}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      setError('Eroare la generarea PDF-ului.');
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!ticketData || !eventData) return;

    const firstTicket = ticketData.tickets?.[0];
    if (!firstTicket?.buyerEmail || !firstTicket?.buyerName) {
      setError('Nu am găsit datele cumpărătorului pentru trimiterea pe email.');
      return;
    }

    setSending(true);
    setError('');

    try {
      const response = await API.post('/events/tickets/send-email', {
        buyerEmail: firstTicket.buyerEmail,
        buyerName: firstTicket.buyerName,
        eventTitle: eventData.title,
        eventDate: eventData.start_date,
        eventLocation: eventData.location,
        tickets: ticketData.tickets,
        quantity: ticketData.quantity,
        totalPrice: ticketData.totalPrice
      });

      if (response.status === 200) {
        setEmailSent(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Eroare la trimiterea email-ului.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!ticketData || !eventData || autoEmailAttempted || emailSent || sending) return;
    setAutoEmailAttempted(true);
    handleSendEmail();
  }, [ticketData, eventData, autoEmailAttempted, emailSent, sending]);

  if (!ticketData || !eventData) {
    return <div className="auth-page-container"><div className="auth-card">Se încarcă...</div></div>;
  }

  const firstTicket = ticketData.tickets?.[0];

  return (
    <div className="tickets-download-page">
      <div className="tickets-container">
        <div className="tickets-header">
          <div className="success-badge">
            <FiCheckCircle />
            <span>Bilete cumpărate cu succes!</span>
          </div>
          <h1>{eventData.title}</h1>
          <p className="purchase-summary">
            Ai cumpărat <strong>{ticketData.quantity} bilet(e)</strong> • 
            Total: <strong>{Number(ticketData.totalPrice || 0).toFixed(2)} lei</strong>
          </p>
        </div>

        <div className="tickets-preview" ref={ticketPrintRef}>
          <div className="ticket-print-header">
            <h2>EventHub - Biletele Tale</h2>
            <p>Eveniment: {eventData.title}</p>
          </div>

          {ticketData.tickets && ticketData.tickets.map((ticket, index) => (
            <div key={index} className="ticket-card-large">
              <div className="ticket-section-header">
                <span className="ticket-number">Bilet {index + 1}</span>
                <span className="ticket-code">{ticket.code}</span>
              </div>

              <div className="ticket-details-grid">
                <div className="ticket-detail">
                  <span className="label">Eveniment</span>
                  <span className="value">{ticket.eventTitle}</span>
                </div>
                <div className="ticket-detail">
                  <span className="label">Data</span>
                  <span className="value">{new Date(ticket.eventDate).toLocaleDateString('ro-RO')}</span>
                </div>
                <div className="ticket-detail">
                  <span className="label">Locație</span>
                  <span className="value">{ticket.eventLocation}</span>
                </div>
                <div className="ticket-detail">
                  <span className="label">Pret</span>
                  <span className="value">{Number(ticket.price || 0).toFixed(2)} lei</span>
                </div>
              </div>

              <div className="ticket-qr-section">
                <p>Cod de acces</p>
                <img src={ticket.qr} alt="QR Code" className="qr-large" />
                <p className="qr-note">Prezintă acest cod la intrare</p>
              </div>

              <div className="ticket-footer">
                <p>Cumpărător: {ticket.buyerName}</p>
                <p className="text-muted">Email: {ticket.buyerEmail}</p>
              </div>
            </div>
          ))}
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
            {emailSent ? 'Retrimite pe Email' : (sending ? 'Se trimite...' : 'Trimite pe Email')}
          </button>
        </div>

        {error ? <div className="error-message">{error}</div> : null}

        <div className="tickets-quick-view">
          <h3>Previzualizare Rapidă</h3>
          {firstTicket ? (
            <div className="quick-ticket">
              <div>
                <h4>{firstTicket.eventTitle}</h4>
                <p>{new Date(firstTicket.eventDate).toLocaleDateString('ro-RO')} • {firstTicket.eventLocation}</p>
              </div>
              <div className="quick-qr">
                <img src={firstTicket.qr} alt="QR" />
              </div>
            </div>
          ) : null}
        </div>

        <div className="tickets-footer">
          <button className="btn-secondary" onClick={() => navigate('/')}>
            Acasă
          </button>
          {eventData.id ? (
            <button className="btn-secondary" onClick={() => navigate(`/event/${eventData.id}`)}>
              Înapoi la eveniment
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default TicketsDownloadPage;
