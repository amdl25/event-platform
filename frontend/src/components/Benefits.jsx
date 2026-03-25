import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiUsers, FiStar, FiGift } from 'react-icons/fi';
import '../styles/Benefits.css';

const Benefits = () => {
  const navigate = useNavigate();
  const benefits = [
    {
      icon: <FiCalendar />,
      title: "Calendar Personal",
      description: "Toate biletele si evenimentele intr-un singur loc."
    },
    {
      icon: <FiUsers />,
      title: "Creeaza Evenimente",
      description: "Organizeaza-ti propriile evenimente si invita-ti prietenii."
    },
    {
      icon: <FiStar />,
      title: "Puncte de Fidelitate",
      description: "Castigi puncte la fiecare participare."
    },
    {
      icon: <FiGift />,
      title: "Recompense Exclusive",
      description: "Schimba punctele in bilete gratuite si reduceri."
    }
  ];

  return (
    <section className="benefits-section">
      <div className="benefits-header">
        <span className="benefits-badge">Beneficii Cont</span>
        <h2 className="benefits-title">De ce sa iti faci cont?</h2>
        <p className="benefits-subtitle">Descopera toate avantajele pe care le ai ca membru inregistrat</p>
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
          Inscrie-te gratuit
        </button>
      </div>
    </section>
  );
};

export default Benefits;
