import React from 'react';
import '../styles/Benefits.css';
import { FiSearch, FiZap, FiAward } from 'react-icons/fi'; 

const Benefits = () => {
  const steps = [
    {
      icon: <FiSearch />,
      title: "Explorează Evenimente",
      description: "Explorează experiențe unice, de la ateliere creative la workshopuri technice, toate într-un singur loc."
    },
    {
      icon: <FiZap />,
      title: "Participă și câștigă puncte de fidelitate",
      description: "Mergi la evenimente și interacționează cu comunitatea pentru a acumula puncte."
    },
    {
      icon: <FiAward />,
      title: "Deblochează Recompense",
      description: "Schimbă punctele strânse în bilete exclusive, reduceri la evenimente și multe altele."
    }
  ];

  return (
    <section className="benefits-section">
      <div className="benefits-container">
        {steps.map((step, index) => (
          <div key={index} className="benefit-card">
            <div className="benefit-icon">
              {step.icon}
            </div>
            <div className="benefit-text">
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Benefits;