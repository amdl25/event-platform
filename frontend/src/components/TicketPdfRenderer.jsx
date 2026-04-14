import React, { forwardRef } from 'react';
import QRCode from 'react-qr-code';
import '../styles/TicketPdfRenderer.css';

const formatDateLabel = (dateValue) => {
  if (!dateValue) return 'Data necunoscuta';
  return new Date(dateValue).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatTimeLabel = (dateValue) => {
  if (!dateValue) return '--:--';
  return new Date(dateValue).toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const TicketPdfRenderer = forwardRef(({ payload }, ref) => {
  if (!payload) return null;

  return (
    <div className="ticket-pdf-render-shell" aria-hidden="true">
      <div className="ticket-pdf-render" ref={ref}>
        <div className="ticket-pdf-header">
          <h2>EventHub - Biletele Tale</h2>
          <p>{payload.eventTitle}</p>
        </div>

        {payload.tickets.map((ticket) => (
          <article key={ticket.code} className="ticket-pdf-card">
            <div className="ticket-pdf-top">
              <strong>{ticket.code}</strong>
              <span>{ticket.organizationName}</span>
            </div>

            <div className="ticket-pdf-meta">
              <span>Data: {formatDateLabel(ticket.date)}</span>
              <span>Ora: {formatTimeLabel(ticket.date)}</span>
              <span>Locatie: {ticket.location}</span>
              <span>Puncte: +{ticket.points}</span>
            </div>

            <div className="ticket-pdf-qr">
              <QRCode value={ticket.qrValue || ticket.code} size={110} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
});

TicketPdfRenderer.displayName = 'TicketPdfRenderer';

export default TicketPdfRenderer;