import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiUsers, FiZap, FiAward } from 'react-icons/fi';
import '../styles/Benefits.css';

const Benefits = () => {
  const navigate = useNavigate();
  const benefits = [
    {
      icon: <FiCalendar />,
      title: "Calendar Personal",
      description: "Toate biletele și evenimentele tale într-un singur loc. Nu mai pierzi niciun eveniment important."
    },
    {
      icon: <FiUsers />,
      title: "Creează Evenimente",
      description: "Organizează-ți propriile evenimente și invită-ți prietenii. Simplu și rapid."
    },
    {
      icon: <FiZap />,
      title: "Puncte de Fidelitate",
      description: "Câștigă puncte la fiecare participare și interacțiune cu comunitatea."
    },
    {
      icon: <FiAward />,
      title: "Recompense Exclusive",
      description: "Schimbă punctele în bilete gratuite, reduceri și experiențe VIP."
    }
  ];

  return (
    <section className="benefits-section">
      <div className="benefits-header">
        <span className="benefits-badge">Beneficii Cont</span>
        <h2 className="benefits-title">De ce să îți faci cont?</h2>
      </div>
      
      <div className="benefits-grid">
        {benefits.map((benefit, index) => (
          <div key={index} className="benefit-card">
            <div className="benefit-icon">
              {benefit.icon}
            </div>
            <h3 className="benefit-title">{benefit.title}</h3>
            <p className="benefit-description">{benefit.description}</p>
          </div>
        ))}
      </div>
      
      <div className="benefits-cta">
        <button className="cta-button" onClick={() => navigate('/register')}>
          Înscrie-te gratuit
        </button>
      </div>
    </section>
  );
};

export default Benefits;
