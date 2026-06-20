import React, { useEffect, useState } from 'react';
import { FiCheck, FiZap, FiTrendingUp, FiStar, FiArrowUpRight } from 'react-icons/fi';
import API from '../api';
import OrganizerShell from '../components/OrganizerShell';
import '../styles/OrganizerBilling.css';

const PLANS = [
  {
    id: 'gratuit',
    name: 'Gratuit',
    price: 0,
    icon: FiZap,
    description: 'Pentru teste și evenimente mici.',
    features: [
      '1 eveniment activ simultan',
      'Max. 50 participanți / eveniment',
      'Dashboard basic',
      'Vânzare bilete gratuite',
    ],
    limits: { events: 1, participants: 50 },
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
      'Analytics detaliat',
      'Sistem de loialitate activat',
      'Export participanți CSV',
      'Suport prioritar (24h)',
    ],
    limits: null,
  },
  {
    id: 'business',
    name: 'Business',
    price: 249,
    icon: FiStar,
    description: 'Pentru companii și ONG-uri cu volume mari.',
    features: [
      'Tot ce include Pro',
      'Plasare featured în Explorare',
      'Manager de cont dedicat',
      'Integrare API (webhook-uri)',
      'Branding personalizat pe bilete',
    ],
    limits: null,
  },
];

const CURRENT_PLAN_ID = 'gratuit';

const OrganizerBillingPage = ({ user, handleLogout }) => {
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);

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

  const currentPlan = PLANS.find((p) => p.id === CURRENT_PLAN_ID);
  const activeEvents = stats?.activeEvents ?? 0;
  const totalParticipants = stats?.totalParticipants ?? 0;

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
          <div className="ob-current-right">
            <div className="ob-usage-item">
              <span className="ob-usage-val">{activeEvents}</span>
              <span className="ob-usage-key">evenimente active</span>
              {currentPlan?.limits && (
                <div className="ob-usage-bar">
                  <div
                    className="ob-usage-fill"
                    style={{ width: `${Math.min(100, (activeEvents / currentPlan.limits.events) * 100)}%` }}
                  />
                </div>
              )}
              {currentPlan?.limits && (
                <span className="ob-usage-limit">din {currentPlan.limits.events} permise</span>
              )}
            </div>
            <div className="ob-usage-item">
              <span className="ob-usage-val">{totalParticipants}</span>
              <span className="ob-usage-key">participanți totali</span>
              {currentPlan?.limits && (
                <div className="ob-usage-bar">
                  <div
                    className="ob-usage-fill"
                    style={{ width: `${Math.min(100, (totalParticipants / currentPlan.limits.participants) * 100)}%` }}
                  />
                </div>
              )}
              {currentPlan?.limits && (
                <span className="ob-usage-limit">din {currentPlan.limits.participants} permise</span>
              )}
            </div>
          </div>
        </div>

        <div className="ob-section-title">Alege un plan</div>

        <div className="ob-plans-grid">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = plan.id === CURRENT_PLAN_ID;
            return (
              <div key={plan.id} className={`ob-plan-card${isCurrent ? ' current' : ''}${plan.badge ? ' featured' : ''}`}>
                {plan.badge && !isCurrent && (
                  <div className="ob-plan-badge">{plan.badge}</div>
                )}
                {isCurrent && (
                  <div className="ob-plan-badge ob-plan-badge--current">Plan curent</div>
                )}

                <div className="ob-plan-icon-wrap">
                  <Icon />
                </div>
                <h3 className="ob-plan-name">{plan.name}</h3>

                <div className="ob-plan-price">
                  {plan.price === 0 ? (
                    <span className="ob-price-amount">Gratuit</span>
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
                  <button className="ob-plan-btn ob-plan-btn--upgrade">
                    Activează {plan.name} <FiArrowUpRight />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="ob-footer-note">
          Upgrade-ul intră în vigoare imediat după confirmare. Plata se procesează securizat prin Stripe.
          Poți anula oricând din această pagină.
        </p>

      </div>
    </OrganizerShell>
  );
};

export default OrganizerBillingPage;
