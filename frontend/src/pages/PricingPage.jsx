import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiZap, FiTrendingUp, FiStar, FiMinus } from 'react-icons/fi';
import '../styles/PricingPage.css';

const PLANS = [
  {
    id: 'gratuit',
    name: 'Gratuit',
    price: 0,
    period: null,
    badge: null,
    tag: 'Ideal pentru ONG-uri',
    description: 'Funcționalități reale, fără costuri. Perfect pentru organizații non-profit și organizatori independenți.',
    cta: 'Începe gratuit',
    ctaVariant: 'outline',
    icon: FiZap,
    features: [
      '10 evenimente / lună',
      'Pagină publică a evenimentului',
      'Vânzare bilete (gratuite și cu preț)',
      '2 tipuri de bilete personalizate',
      '300 participanți / eveniment',
      'Validare bilete prin cod QR',
      'Dashboard de gestionare',
      'Listare în pagina de Explorare',
      'Sistem de loialitate activat',
    ],
    missing: [
      'Analytics și rapoarte',
      'Suport prioritar',
      'Plasare featured în Explorare',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    period: 'lună',
    badge: 'Recomandat',
    tag: null,
    description: 'Pentru organizatori activi care vor să crească și să înțeleagă audiența.',
    cta: 'Alege Pro',
    ctaVariant: 'primary',
    icon: FiTrendingUp,
    features: [
      'Evenimente nelimitate',
      'Participanți nelimitați',
      'Tipuri de bilete personalizate nelimitate',
      'Plasare standard în Explorare',
      'Dashboard analytics complet',
      'Statistici venituri și check-in',
      'Sistem de loialitate activat',
      'Suport prioritar (răspuns în 24h)',
    ],
    missing: [
      'Plasare featured în Explorare',
      'Statistici avansate și comparații între evenimente',
      'Tendințe și evoluție pe perioadă',
      'Suport prioritar extins (răspuns în 12h)',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 249,
    period: 'lună',
    badge: null,
    tag: null,
    description: 'Pentru companii cu volume mari de evenimente și nevoi avansate de personalizare.',
    cta: 'Contactează-ne',
    ctaVariant: 'dark',
    icon: FiStar,
    features: [
      'Tot ce include Pro',
      'Plasare featured în Explorare (prioritate maximă)',
      'Statistici avansate și comparații între evenimente',
      'Tendințe și evoluție pe perioadă',
      'Suport prioritar extins (răspuns în 12h)',
    ],
    missing: [],
  },
];

const PricingPage = () => {
  const [billing, setBilling] = useState('lunar');
  const navigate = useNavigate();

  const handlePlanCta = (planId) => {
    if (planId === 'business') {
      navigate('/contact');
      return;
    }
    if (planId === 'gratuit') {
      navigate('/register');
      return;
    }
    try {
      const stored = localStorage.getItem('eventHubUser');
      const userData = stored ? JSON.parse(stored) : null;
      if (userData?.role === 'organizer') {
        navigate(`/organizer/billing?plan=${planId}`);
        return;
      }
    } catch { }
    navigate(`/register?redirect=${encodeURIComponent(`/organizer/billing?plan=${planId}`)}`);
  };

  const getPrice = (plan) => {
    if (plan.price === 0) return 0;
    return billing === 'anual' ? Math.round(plan.price * 0.8) : plan.price;
  };

  return (
    <div className="pricing-page">
      <div className="pricing-hero">
        <div className="container-max">
          <p className="pricing-eyebrow">Planuri & Prețuri</p>
          <h1 className="pricing-title">Alege planul potrivit<br />pentru organizația ta</h1>
          <p className="pricing-subtitle">
            Fără comisioane ascunse. Upgrade sau downgrade oricând.
          </p>

          <div className="pricing-billing-toggle">
            <button
              className={`billing-btn${billing === 'lunar' ? ' active' : ''}`}
              onClick={() => setBilling('lunar')}
            >
              Lunar
            </button>
            <button
              className={`billing-btn${billing === 'anual' ? ' active' : ''}`}
              onClick={() => setBilling('anual')}
            >
              Anual
              <span className="billing-badge">-20%</span>
            </button>
          </div>
        </div>
      </div>

      <div className="pricing-cards-wrap">
        <div className="container-max">
          <div className="pricing-grid">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const price = getPrice(plan);
              return (
                <div key={plan.id} className={`pricing-card${plan.badge ? ' featured' : ''}`}>
                  {plan.badge && (
                    <div className="pricing-badge">{plan.badge}</div>
                  )}

                  <div className="pricing-card-header">
                    <div className={`pricing-icon pricing-icon--${plan.id}`}>
                      <Icon />
                    </div>
                    <div className="pricing-name-row">
                      <h2 className="pricing-plan-name">{plan.name}</h2>
                      {plan.tag && <span className="pricing-plan-tag">{plan.tag}</span>}
                    </div>
                    <p className="pricing-plan-desc">{plan.description}</p>
                  </div>

                  <div className="pricing-price-wrap">
                    <div className="pricing-price-row">
                      <span className="pricing-amount">
                        {price === 0 ? '0 RON' : `${price} RON`}
                      </span>
                      {plan.period && (
                        <span className="pricing-period">/ {plan.period}</span>
                      )}
                    </div>
                    {billing === 'anual' && plan.price > 0 && (
                      <p className="pricing-annual-note">
                        față de {plan.price} RON/lună lunar
                      </p>
                    )}
                  </div>

                  <button
                    className={`pricing-cta pricing-cta--${plan.ctaVariant}`}
                    onClick={() => handlePlanCta(plan.id)}
                  >
                    {plan.cta}
                  </button>

                  <div className="pricing-features-section">
                    <ul className="pricing-features">
                      {plan.features.map((f) => (
                        <li key={f} className="pricing-feature pricing-feature--yes">
                          <FiCheck className="pricing-feature-icon" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    {plan.missing.length > 0 && (
                      <>
                        <div className="pricing-features-divider" />
                        <ul className="pricing-features">
                          {plan.missing.map((f) => (
                            <li key={f} className="pricing-feature pricing-feature--no">
                              <FiMinus className="pricing-feature-icon pricing-feature-dash" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pricing-ong-banner">
            <div className="pricing-ong-left">
              <div>
                <p className="pricing-ong-title">Ești o organizație non-profit?</p>
                <p className="pricing-ong-desc">ONG-urile verificate beneficiază de <strong>50% reducere</strong> la orice plan plătit. Contactează-ne cu dovada statutului non-profit.</p>
              </div>
            </div>
            <button className="pricing-ong-cta" onClick={() => navigate('/contact')}>
              Aplică pentru reducere
            </button>
          </div>

          <div className="pricing-footer-note">
            <p>
              Toate planurile includ vânzare de bilete, gestionare participanți și acces la sistemul EventHub.
              Plata se procesează securizat prin Stripe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
