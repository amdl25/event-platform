import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiZap, FiTrendingUp, FiStar } from 'react-icons/fi';
import '../styles/PricingPage.css';

const PLANS = [
  {
    id: 'gratuit',
    name: 'Gratuit',
    price: 0,
    period: null,
    badge: null,
    description: 'Perfect pentru a testa platforma și evenimentele mici.',
    cta: 'Începe gratuit',
    ctaVariant: 'outline',
    icon: FiZap,
    features: [
      '1 eveniment activ simultan',
      'Max. 50 participanți / eveniment',
      'Pagină publică a evenimentului',
      'Vânzare bilete gratuite',
      'Acces la dashboard basic',
    ],
    missing: [
      'Analitics și rapoarte',
      'Sistem de loialitate pentru participanți',
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
    description: 'Pentru organizatori activi care vor să crească.',
    cta: 'Alege Pro',
    ctaVariant: 'primary',
    icon: FiTrendingUp,
    features: [
      'Evenimente nelimitate',
      'Participanți nelimitați',
      'Analytics detaliat (revenue, check-in, tendințe)',
      'Sistem de loialitate activat pentru participanți',
      'Export participanți CSV',
      'Suport prioritar (răspuns în 24h)',
      'Plasare standard în Explorare',
    ],
    missing: [
      'Plasare featured premium',
      'Manager de cont dedicat',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 249,
    period: 'lună',
    badge: null,
    description: 'Pentru companii și ONG-uri cu volume mari de evenimente.',
    cta: 'Contactează-ne',
    ctaVariant: 'dark',
    icon: FiStar,
    features: [
      'Tot ce include Pro',
      'Plasare featured în Explorare (prioritate maximă)',
      'Manager de cont dedicat',
      'Rapoarte personalizate',
      'Integrare API (webhook-uri)',
      'Branding personalizat pe bilete',
      'SLA garantat 99.9% uptime',
    ],
    missing: [],
  },
];

const PricingPage = () => {
  const [billing, setBilling] = useState('lunar');
  const navigate = useNavigate();

  const getPrice = (plan) => {
    if (plan.price === 0) return 0;
    return billing === 'anual' ? Math.round(plan.price * 0.8) : plan.price;
  };

  return (
    <div className="pricing-page">
      <div className="pricing-hero">
        <div className="container-max">
          <p className="pricing-eyebrow">Planuri & Prețuri</p>
          <h1 className="pricing-title">Alege planul potrivit<br />pentru organizatia ta</h1>
          <p className="pricing-subtitle">
            Fără comisioane ascunse. Poți face upgrade sau downgrade oricând.
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
                    <h2 className="pricing-plan-name">{plan.name}</h2>
                    <p className="pricing-plan-desc">{plan.description}</p>
                  </div>

                  <div className="pricing-price-wrap">
                    <span className="pricing-amount">
                      {price === 0 ? 'Gratuit' : `${price} RON`}
                    </span>
                    {plan.period && (
                      <span className="pricing-period">/ {plan.period}</span>
                    )}
                    {billing === 'anual' && plan.price > 0 && (
                      <p className="pricing-annual-note">
                        {plan.price} RON/lună facturat anual
                      </p>
                    )}
                  </div>

                  <button
                    className={`pricing-cta pricing-cta--${plan.ctaVariant}`}
                    onClick={() => navigate(plan.id === 'business' ? '/contact' : '/register')}
                  >
                    {plan.cta}
                  </button>

                  <ul className="pricing-features">
                    {plan.features.map((f) => (
                      <li key={f} className="pricing-feature pricing-feature--yes">
                        <FiCheck className="pricing-feature-icon" />
                        {f}
                      </li>
                    ))}
                    {plan.missing.map((f) => (
                      <li key={f} className="pricing-feature pricing-feature--no">
                        <span className="pricing-feature-icon pricing-feature-dash">–</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="pricing-footer-note">
            <p>
              Toate planurile includ acces la sistemul de loialitate EventHub, vânzare de bilete și gestionare participanți.
              Plata se procesează securizat prin Stripe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
