import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/BookingModal.css';

const BookingModal = ({ isOpen, onClose, event, user }) => {
  const navigate = useNavigate();
  const redirectToUserPurchase = `/purchase/${event?.id}?mode=user`;
  const redirectToGuestPurchase = `/purchase/${event?.id}?mode=guest`;

  const handleChooseUser = () => {
    onClose();
    navigate(`/login?redirect=${encodeURIComponent(redirectToUserPurchase)}`);
  };

	const handleRegister = () => {
		onClose();
		navigate(`/register?redirect=${encodeURIComponent(redirectToUserPurchase)}`);
	};

  const handleChooseGuest = () => {
    onClose();
    navigate(redirectToGuestPurchase);
  };

	if (!isOpen) return null;
	if (user?.id) return null;

	return (
		<div className="booking-overlay" onClick={onClose}>
			<div className="booking-modal" onClick={(eventClick) => eventClick.stopPropagation()}>
				<button className="booking-close" onClick={onClose}>×</button>
				<div className="booking-layout">
					<aside className="booking-left-panel">
						<h2>Bună!</h2>
						<p className="booking-left-title">Conectează-te pentru o experiență completă</p>
						<div className="booking-left-actions">
							<button className="booking-pill-btn" onClick={handleChooseUser}>INTRĂ ÎN CONT</button>
						</div>
					</aside>

					<section className="booking-right-panel">
						<h3 className="booking-main-title">
							Contul tău îți oferă control total asupra experienței.
						</h3>

						<ul className="booking-benefits-list">
							<li>Vezi toate biletele și evenimentele într-un calendar personal.</li>
							<li>Creezi și administrezi propriile evenimente.</li>
							<li>Acumulezi puncte de fidelitate pentru beneficii viitoare.</li>
						</ul>

						<div className="booking-right-actions">
							<button className="booking-mode-btn" onClick={handleRegister}>
								ÎNSCRIE-TE GRATUIT
							</button>
						</div>

						<div className="booking-guest-divider" />
						<div className="booking-guest-section">
							<button className="booking-mode-btn booking-guest-btn" onClick={handleChooseGuest}>
								Continuă ca vizitator
							</button>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
};

export default BookingModal;
