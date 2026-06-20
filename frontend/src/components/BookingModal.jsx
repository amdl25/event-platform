import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiGift, FiStar, FiX } from 'react-icons/fi';
import '../styles/BookingModal.css';

const benefits = [
  { icon: FiCalendar, text: 'Calendar personal cu toate biletele tale.' },
  { icon: FiStar, text: 'Puncte de fidelitate la fiecare participare.' },
  { icon: FiGift, text: 'Recompense exclusive și bilete gratuite.' }
];

const BookingModal = ({ isOpen, onClose, event, user }) => {
  const navigate = useNavigate();
  const redirectToUserPurchase = `/purchase/${event?.id}?mode=user`;
  const redirectToGuestPurchase = `/purchase/${event?.id}?mode=guest`;

  const handleChooseUser = () => { onClose(); navigate(`/login?redirect=${encodeURIComponent(redirectToUserPurchase)}`); };
  const handleRegister = () => { onClose(); navigate(`/register?redirect=${encodeURIComponent(redirectToUserPurchase)}`); };
  const handleChooseGuest = () => { onClose(); navigate(redirectToGuestPurchase); };

  if (!isOpen || user?.id) return null;

  return (
    <div className="booking-overlay" onClick={onClose}>
      <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
        <button className="booking-close" onClick={onClose} aria-label="Închide"><FiX /></button>

        <div className="booking-layout">
          <aside className="booking-left-panel">
            <div className="booking-brand">
              <span className="booking-brand-event">Event</span><span className="booking-brand-hub">Hub</span>
            </div>
            <h2 className="booking-left-heading">Bună!</h2>
            <p className="booking-left-sub">Conectează-te pentru o experiență completă</p>
            <button className="booking-login-btn" onClick={handleChooseUser}>Intră în cont</button>
          </aside>

          <section className="booking-right-panel">
            <p className="booking-eyebrow">De ce să îți faci cont?</p>
            <h3 className="booking-main-title">Controlezi totul dintr-un singur loc.</h3>

            <ul className="booking-benefits-list">
              {benefits.map(({ icon: Icon, text }) => (
                <li key={text} className="booking-benefit-item">
                  <span className="booking-benefit-icon"><Icon /></span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>

            <button className="booking-register-btn" onClick={handleRegister}>Înscrie-te gratuit</button>

            <div className="booking-divider"><span>sau</span></div>

            <button className="booking-guest-link" onClick={handleChooseGuest}>Continuă ca vizitator</button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
