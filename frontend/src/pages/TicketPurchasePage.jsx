import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import API from '../api';

const TicketPurchasePage = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'user' ? 'user' : 'guest';

  const [event, setEvent] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [loadingPurchase, setLoadingPurchase] = useState(false);
  const [error, setError] = useState('');

  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [quantity, setQuantity] = useState(1);

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
      } catch (err) {
        setError(err.response?.data?.message || 'Nu am putut încărca evenimentul.');
      } finally {
        setLoadingEvent(false);
      }
    };

    if (id) loadEvent();
  }, [id]);

  const handlePurchase = async () => {
    const nameToSend = buyerName.trim();
    const emailToSend = buyerEmail.trim();
    const qty = Number(quantity);

    if (!nameToSend || !emailToSend) {
      setError('Numele și email-ul sunt obligatorii.');
      return;
    }

    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      setError('Numărul de bilete trebuie să fie între 1 și 20.');
      return;
    }

    try {
      setError('');
      setLoadingPurchase(true);

      const payload = {
        event_id: id,
        buyer_name: nameToSend,
        buyer_email: emailToSend,
        quantity: qty,
      };

      const response = mode === 'user'
        ? await API.post('/events/purchase/user', { ...payload, account_id: user.id })
        : await API.post('/events/purchase/guest', payload);

      navigate('/tickets-download', {
        state: {
          successData: response.data,
          event: event
        }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Eroare la cumpărarea biletelor.');
    } finally {
      setLoadingPurchase(false);
    }
  };

  if (loadingEvent) return <div className="auth-page-container"><div className="auth-card">Se încarcă...</div></div>;
  if (!event) return <div className="auth-page-container"><div className="auth-card">Evenimentul nu a fost găsit.</div></div>;

  return (
    <div className="auth-page-container">
      <div className="auth-card" style={{ maxWidth: 640 }}>
        <header className="auth-header">
          <h2>{mode === 'user' ? 'Cumpără ca utilizator' : 'Cumpără ca vizitator'}</h2>
          <p>{event.title}</p>
        </header>

        <div className="auth-form">
          <input
            type="text"
            placeholder="Nume cumpărător"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            disabled={loadingPurchase}
          />

          <input
            type="email"
            placeholder="Email cumpărător"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            disabled={loadingPurchase}
          />

          <input
            type="number"
            min="1"
            max="20"
            placeholder="Număr bilete"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={loadingPurchase}
          />

          {error ? <div className="auth-error-msg">{error}</div> : null}

          <button className="btn-auth-main" onClick={handlePurchase} disabled={loadingPurchase}>
            {loadingPurchase ? 'Se procesează...' : 'Confirmă cumpărarea (Descarcă Bilete)'}
          </button>

          <Link to={`/event/${id}`} className="auth-footer-text" style={{ textAlign: 'center' }}>
            Renunță
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TicketPurchasePage;
