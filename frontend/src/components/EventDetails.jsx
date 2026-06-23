import React, { useEffect, useState } from 'react';

import BookingModal from './BookingModal';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiClock, FiHeart, FiMapPin, FiShield, FiStar, FiUsers } from 'react-icons/fi';
import { getEventStartValue, getEventEndValue, getEventTimeRangeLabel, getEventDateLabel } from '../utils/eventDateTime';
import '../styles/EventDetails.css';

const EventDetails = ({ event, user }) => {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && event?.id) {
      localStorage.setItem(`eventhub_ref_${event.id}`, ref);
    }
  }, [event?.id]);

  const isGlobalSoldOut = event.max_capacity > 0 && event.current_occupancy >= event.max_capacity;
  const eventStart = getEventStartValue(event);
  const eventEnd = getEventEndValue(event);
  const eventTimeRange = getEventTimeRangeLabel(eventStart, eventEnd);

  const ticketTypes = Array.isArray(event.ticketTypes) ? event.ticketTypes : [];
  
  React.useEffect(() => {
    if (ticketTypes.length > 0 && !selectedTicketTypeId) {
      setSelectedTicketTypeId(ticketTypes[0].id);
    }
  }, [ticketTypes, selectedTicketTypeId]);
  
  const selectedTicketType = ticketTypes.find(tt => tt.id === selectedTicketTypeId);
  const selectedTypeCapacity = selectedTicketType ? Number(selectedTicketType.quantity || 0) : null;
  const selectedTypeSold = selectedTicketType ? Number(selectedTicketType.sold_quantity || 0) : null;
  const remainingTickets = selectedTicketType
    ? Math.max(0, (selectedTypeCapacity || 0) - (selectedTypeSold || 0))
    : null;
  const isSelectedTypeSoldOut = selectedTicketType ? remainingTickets <= 0 : false;
  const isSoldOut = isGlobalSoldOut || isSelectedTypeSoldOut;
  const unitPrice = selectedTicketType ? Number(selectedTicketType.price || 0) : 0;
  const totalPrice = Number((unitPrice * quantity).toFixed(2));
  
  const pointsPerTicket = selectedTicketType ? Number(selectedTicketType.points_reward || 0) : 0;
  const earnedPoints = pointsPerTicket * quantity;

  const descriptionParagraphs = String(event.description || '')
    .split(/\n+/)
    .map((text) => text.trim())
    .filter(Boolean);
  const mapQuery = encodeURIComponent(event.location || event.city || 'Bucuresti');
  const mapEmbedSrc = `https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`;

  const onReserve = () => {
    if (isSoldOut) return;
    if (user?.id) {
      navigate(`/purchase/${event.id}?mode=user`);
      return;
    }
    setIsBookingOpen(true);
  };

  return (
    <>
      <div className="event-details-wrapper">
        <div className="event-details-shell">
          <main className="event-content-column">
            <h1 className="event-main-title">{event.title}</h1>

            <div className="event-image-frame">
              <img
                src={(event.image_url && (event.image_url.startsWith('http') || event.image_url.startsWith('data:'))) ? event.image_url : ''}
                alt={event.title}
              />
            </div>

            <section className="event-meta-grid">
              <article className="event-meta-card">
                <span>DATA ȘI ORA</span>
                <p><FiCalendar /> {eventStart ? getEventDateLabel(eventStart, 'ro-RO') : '-'}</p>
                <small><FiClock /> {eventTimeRange ? eventTimeRange : 'Ora nespecificata'}</small>
              </article>
              <article className="event-meta-card">
                <span>LOCAȚIE</span>
                <p><FiMapPin /> {event.location || 'Locatie nespecificata'}</p>
                <small>{event.city || 'Bucuresti'}</small>
              </article>
              <article className="event-meta-card">
                <span>ORGANIZATOR</span>
                <p><FiUsers /> {event.organization ? event.organization.name : 'Vibe Archive'}</p>
                <small>Comunitate de Artă Urbană</small>
              </article>
            </section>

            <section className="event-about-section">
              <h2>Despre Eveniment</h2>
              {descriptionParagraphs.length > 0 ? (
                descriptionParagraphs.slice(0, 2).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))
              ) : (
                <p>Evenimentul aduce o experiență urbană imersivă, cu muzică live.</p>
              )}
            </section>

            <section className="event-map-section">
              <div className="event-map-header">
                <h3>Locație</h3>
                <p>{event.location || 'Locație nespecificată'}</p>
              </div>
              <div className="event-map-frame">
                <iframe
                  title={`Harta locație pentru ${event.title}`}
                  src={mapEmbedSrc}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            </section>

          </main>

          <aside className="event-booking-column">
            <div className="event-booking-card">
              <h3>Selectează Bilete</h3>

              {ticketTypes.length > 0 ? (
                <>
                  {ticketTypes.map((ticketType) => (
                    <button
                      key={ticketType.id}
                      type="button"
                      className={`ticket-option ${selectedTicketTypeId === ticketType.id ? 'selected' : ''}`}
                      onClick={() => setSelectedTicketTypeId(ticketType.id)}
                    >
                      <div>
                        <strong>{ticketType.name}</strong>
                        {ticketType.description && <small>{ticketType.description}</small>}
                        <small>{Number(ticketType.price || 0).toFixed(2)} RON</small>
                      </div>
                      <span className="ticket-radio" />
                    </button>
                  ))}
                </>
              ) : (
                <p>Nu sunt bilete disponibile.</p>
              )}

              <div className="qty-wrap">
                <span>Cantitate</span>
                <div className="qty-controls">
                  <button type="button" onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}>-</button>
                  <strong>{quantity}</strong>
                  <button type="button" onClick={() => setQuantity((prev) => Math.min(10, prev + 1))}>+</button>
                </div>
              </div>

              {earnedPoints > 0 ? (
                <div className="loyalty-banner">
                  <span>BENEFICIU LOIALITATE</span>
                  <p>Câștigi +{earnedPoints} puncte cu această achiziție pentru reduceri viitoare.</p>
                </div>
              ) : null}

              <div className="booking-total">
                <span>Total de plată</span>
                <strong>{totalPrice.toFixed(2)} RON</strong>
              </div>

              <button className="reserve-btn" disabled={isSoldOut} onClick={onReserve}>
                {isSoldOut ? 'SOLD OUT' : 'REZERVA LOCUL ACUM'}
              </button>

              <p className="booking-safe-note">PLATĂ SECURIZATĂ · CONFIRMARE INSTANTĂ</p>
            </div>

            {remainingTickets !== null && remainingTickets > 0 && remainingTickets < 100 ? (
              <div className="scarcity-card">
                <span>!</span>
                <p>Doar {remainingTickets} bilete rămase la acest pret. Asigură-ți prezența în centrul acțiunii.</p>
              </div>
            ) : null}

          </aside>
        </div>
      </div>

      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        event={event}
        user={user}
      />
    </>
  );
};

export default EventDetails;