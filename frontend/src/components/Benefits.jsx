import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiUsers, FiTrendingUp, FiStar } from 'react-icons/fi';
import '../styles/Benefits.css';

const Benefits = () => {
  const navigate = useNavigate();
  const benefits = [
    {
      icon: <FiUsers />,
      title: "Organizezi cu prietenii",
      description: "Petreceri, ieșiri, aniversări sau întâlniri private. Creezi evenimentul rapid și inviți doar persoanele dorite."
    },
    {
      icon: <FiTrendingUp />,
      title: "Construiești o comunitate",
      description: "Pentru ONG-uri, asociații și grupuri locale. Aduci oamenii împreună și îți faci inițiativa mai vizibilă."
    },
    {
      icon: <FiStar />,
      title: "Promovezi și vinzi",
      description: "Pentru afaceri și organizatori. Publici evenimente, ajungi la participanți noi și gestionezi biletele."
    },
    {
      icon: <FiCalendar />,
      title: "Descoperi ce se întâmplă",
      description: "Găsești evenimente relevante în jurul tău și participi la cele care te interesează."
    }
  ];

  return (
    <section className="benefits-section">
      <div className="benefits-header">
        <span className="benefits-badge">Pentru oameni, comunități și organizatori</span>
        <h2 className="benefits-title">Planifică, adună și promovează</h2>
        <p className="benefits-subtitle">Planifică întâlniri private, adună comunități sau promovează evenimente publice – toate într-un singur loc.</p>
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
