import React, { useEffect, useRef, useState } from 'react';
import { FiCheck, FiZap, FiTrendingUp, FiStar, FiArrowUpRight, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../api';
import OrganizerShell from '../components/OrganizerShell';
import '../styles/OrganizerBilling.css';

const PLANS = [
  {
    id: 'gratuit',
    name: 'Gratuit',
    price: 0,
    icon: FiZap,
    description: 'Funcționalități reale, fără costuri.',
    features: [
      '10 evenimente / lună',
      '300 participanți / eveniment',
      'Vânzare bilete (gratuite și cu preț)',
      '2 tipuri de bilete personalizate',
      'Validare bilete prin cod QR',
      'Listare în pagina de Explorare',
      'Sistem de loialitate activat',
      'Dashboard de gestionare',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    icon: FiTrendingUp,
    badge: 'Recomandat',
    description: 'Pentru organizatori activi care vor să crească.',
    features: [
      'Evenimente nelimitate',
      'Participanți nelimitați',
      'Tipuri de bilete personalizate nelimitate',
      'Dashboard analytics complet',
      'Statistici venituri și check-in',
      'Sistem de loialitate activat',
      'Plasare standard în Explorare',
      'Suport prioritar (răspuns în 24h)',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 249,
    icon: FiStar,
    description: 'Pentru companii cu nevoi avansate de personalizare.',
    features: [
      'Tot ce include Pro',
      'Plasare featured în Explorare (prioritate maximă)',
      'Statistici avansate și comparații între evenimente',
      'Tendințe și evoluție pe perioadă',
      'Suport prioritar extins (răspuns în 12h)',
    ],
  },
];

const FREE_LIMITS = { eventsPerMonth: 10, participantsPerEvent: 300 };

const OrganizerBillingPage = ({ user, handleLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [currentPlanId, setCurrentPlanId] = useState(user?.organizationPlan || 'gratuit');
  const [upgrading, setUpgrading] = useState(null);
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [upgradeStatus, setUpgradeStatus] = useState(null);

  const autoTriggeredRef = useRef(false);

  useEffect(() => {
    const planName = sessionStorage.getItem('planUpgradeSuccess');
    if (planName) {
      sessionStorage.removeItem('planUpgradeSuccess');
      setUpgradeMsg(`Planul ${planName} a fost activat cu succes.`);
      setUpgradeStatus('success');
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, notifRes] = await Promise.all([
          API.get('/organizer/dashboard'),
          API.get('/organizer/notifications').catch(() => ({ data: { notifications: [] } })),
        ]);
        setStats(dashRes.data?.stats || null);
        setNotifications(notifRes.data?.notifications || []);
      } catch {
      }
    };
    load();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const payment = params.get('payment');
    const sessionId = params.get('session_id');

    if (payment === 'success' && sessionId) {
      setUpgradeStatus('confirming');
      API.post('/organizer/plan/confirm-session', { session_id: sessionId })
        .then((res) => {
          const activatedPlan = res.data?.plan;
          try {
            const stored = JSON.parse(localStorage.getItem('eventHubUser') || '{}');
            stored.organizationPlan = activatedPlan;
            localStorage.setItem('eventHubUser', JSON.stringify(stored));
            const planName = PLANS.find(p => p.id === activatedPlan)?.name || activatedPlan;
            sessionStorage.setItem('planUpgradeSuccess', planName);
          } catch { }
          window.location.replace('/organizer/billing');
        })
        .catch(() => {
          setUpgradeStatus('error');
          setUpgradeMsg('Nu am putut confirma plata. Contactează-ne la contact@eventhub.ro.');
          navigate('/organizer/billing', { replace: true });
        });
    } else if (payment === 'cancel') {
      setUpgradeStatus('cancel');
      setUpgradeMsg('Plata a fost anulată. Poți încerca din nou oricând.');
      navigate('/organizer/billing', { replace: true });
    }
  }, [location.search, navigate]);

  useEffect(() => {
    if (autoTriggeredRef.current) return;
    const params = new URLSearchParams(location.search);
    const planParam = params.get('plan');
    const paymentParam = params.get('payment');
    if (!planParam || paymentParam || !['pro', 'business'].includes(planParam)) return;
    autoTriggeredRef.current = true;

    const triggerCheckout = async () => {
      setUpgrading(planParam);
      try {
        const res = await API.post('/organizer/plan/checkout-session', { plan: planParam });
        if (res.data?.checkoutUrl) {
          window.location.href = res.data.checkoutUrl;
        }
      } catch {
        setUpgradeMsg('Eroare la inițializarea plății. Încearcă din nou.');
        setUpgradeStatus('error');
        setUpgrading(null);
      }
    };

    triggerCheckout();
  }, []);

  const handleUpgrade = async (planId) => {
    if (planId === currentPlanId || upgrading) return;
    setUpgrading(planId);
    setUpgradeMsg('');
    setUpgradeStatus(null);

    try {
      if (planId === 'gratuit') {
        await API.put('/organizer/plan', { plan: planId });
        setCurrentPlanId(planId);
        try {
          const stored = JSON.parse(localStorage.getItem('eventHubUser') || '{}');
          stored.organizationPlan = planId;
          localStorage.setItem('eventHubUser', JSON.stringify(stored));
        } catch {}
        setUpgradeMsg('Ai trecut la planul Gratuit.');
        setUpgradeStatus('success');
      } else {
        const res = await API.post('/organizer/plan/checkout-session', { plan: planId });
        window.location.href = res.data.checkoutUrl;
      }
    } catch {
      setUpgradeMsg('Eroare la inițializarea plății. Încearcă din nou.');
      setUpgradeStatus('error');
    } finally {
      setUpgrading(null);
    }
  };

  const currentPlan = PLANS.find((p) => p.id === currentPlanId) || PLANS[0];
  const monthlyEvents = stats?.monthlyEvents ?? stats?.activeEvents ?? 0;

  return (
    <OrganizerShell
      user={user}
      handleLogout={handleLogout}
      title="Abonament"
      subtitle="Gestionează planul tău EventHub"
      notifications={notifications}
    >
      <div className="ob-content">

        <div className="ob-current-plan">
          <div className="ob-current-left">
            <p className="ob-current-label">Planul tău curent</p>
            <h2 className="ob-current-name">{currentPlan?.name}</h2>
            <p className="ob-current-desc">{currentPlan?.description}</p>
          </div>
          {currentPlanId === 'gratuit' && (
            <div className="ob-current-right">
              <div className="ob-usage-item">
                <span className="ob-usage-val">{monthlyEvents}</span>
                <span className="ob-usage-key">evenimente luna aceasta</span>
                <div className="ob-usage-bar">
                  <div
                    className="ob-usage-fill"
                    style={{ width: `${Math.min(100, (monthlyEvents / FREE_LIMITS.eventsPerMonth) * 100)}%` }}
                  />
                </div>
                <span className="ob-usage-limit">din {FREE_LIMITS.eventsPerMonth} permise</span>
              </div>
              <div className="ob-usage-item">
                <span className="ob-usage-val">{FREE_LIMITS.participantsPerEvent}</span>
                <span className="ob-usage-key">participanți / eveniment</span>
              </div>
            </div>
          )}
        </div>

        {upgradeMsg && (
          <div className={`ob-upgrade-msg ob-upgrade-msg--${upgradeStatus === 'success' ? 'success' : upgradeStatus === 'cancel' ? 'cancel' : 'error'}`}>
            {upgradeStatus === 'success' ? <FiCheckCircle /> : <FiXCircle />}
            {upgradeMsg}
          </div>
        )}

        <div className="ob-section-title">Alege un plan</div>

        <div className="ob-plans-grid">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = plan.id === currentPlanId;
            const isLoading = upgrading === plan.id;
            return (
              <div key={plan.id} className={`ob-plan-card${isCurrent ? ' current' : ''}${plan.badge && !isCurrent ? ' featured' : ''}`}>
                {plan.badge && !isCurrent && (
                  <div className="ob-plan-badge">{plan.badge}</div>
                )}
                {isCurrent && (
                  <div className="ob-plan-badge ob-plan-badge--current">Plan activ</div>
                )}

                <div className="ob-plan-icon-wrap">
                  <Icon />
                </div>
                <h3 className="ob-plan-name">{plan.name}</h3>

                <div className="ob-plan-price">
                  {plan.price === 0 ? (
                    <span className="ob-price-amount">0 RON</span>
                  ) : (
                    <>
                      <span className="ob-price-amount">{plan.price} RON</span>
                      <span className="ob-price-period">/lună</span>
                    </>
                  )}
                </div>

                <ul className="ob-plan-features">
                  {plan.features.map((f) => (
                    <li key={f}>
                      <FiCheck className="ob-feature-check" />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button className="ob-plan-btn ob-plan-btn--current" disabled>
                    Plan activ
                  </button>
                ) : (
                  <button
                    className="ob-plan-btn ob-plan-btn--upgrade"
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={!!upgrading}
                  >
                    {isLoading
                    ? (plan.id === 'gratuit' ? 'Se activează...' : 'Se redirecționează...')
                    : plan.id === 'gratuit'
                      ? `Treci la ${plan.name}`
                      : <>{`Plătește și activează ${plan.name}`} <FiArrowUpRight /></>
                  }
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="ob-footer-note">
          Upgrade-ul intră în vigoare imediat după confirmare. Plata se procesează securizat prin Stripe.
          Poți schimba planul oricând din această pagină.
        </p>

      </div>
    </OrganizerShell>
  );
};

export default OrganizerBillingPage;
