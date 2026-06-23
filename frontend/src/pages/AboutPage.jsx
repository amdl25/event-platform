import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiCalendar, FiTrendingUp, FiShield, FiStar, FiLock } from 'react-icons/fi';
import '../styles/AboutPage.css';

const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="about-hero-inner">
          <p className="about-kicker">DESPRE EVENTHUB</p>
          <h1 className="about-title">O platformă pentru toți.<br />Construită în jurul evenimentelor.</h1>
          <p className="about-lead">
            EventHub conectează oamenii prin evenimente - fie că vrei să descoperi ce se întâmplă în orașul tău,
            să organizezi o petrecere privată cu prietenii, sau să publici și să vinzi bilete ca business sau ONG.
          </p>
        </div>
      </section>

      <section className="about-audiences">
        <div className="about-audiences-inner">
          <h2 className="about-section-title">Pentru cine este EventHub?</h2>

          <div className="about-audience-grid">
            <div className="about-audience-card">
              <div className="about-audience-icon">
                <FiCalendar />
              </div>
              <h3>Participanți la evenimente</h3>
              <p>
                Descoperi concerte, festivaluri, expoziții, ateliere și multe altele. Poți cumpăra bilete direct
                din platformă, îți gestionezi calendarul de evenimente și primești recomandări personalizate.
                Nu ai nevoie de cont pentru a explora - contul îți adaugă beneficii extra.
              </p>
              <ul className="about-audience-list">
                <li><FiStar size={13} /> Explorează gratuit, fără cont</li>
                <li><FiStar size={13} /> Bilete și calendar personal</li>
                <li><FiStar size={13} /> Recomandări bazate pe interese</li>
                <li><FiStar size={13} /> Puncte de loialitate și recompense</li>
              </ul>
              <button className="about-audience-btn" onClick={() => navigate('/explore')}>Explorează evenimente</button>
            </div>

            <div className="about-audience-card about-audience-card--featured">
              <div className="about-audience-icon">
                <FiUsers />
              </div>
              <h3>Organizatori privați</h3>
              <p>
                Orice utilizator cu cont poate crea evenimente private - petreceri, ieșiri, aniversări sau
                întâlniri de grup. Evenimentele private sunt vizibile doar persoanelor invitate,
                nu apar în feed-ul public.
              </p>
              <ul className="about-audience-list">
                <li><FiLock size={13} /> Vizibil doar pentru invitați</li>
                <li><FiLock size={13} /> Link de invitație personalizat</li>
                <li><FiLock size={13} /> Gestionezi lista de participanți</li>
                <li><FiLock size={13} /> Fără proces de verificare</li>
              </ul>
              <button className="about-audience-btn about-audience-btn--primary" onClick={() => navigate('/register')}>Creează cont gratuit</button>
            </div>

            <div className="about-audience-card about-audience-card--dark">
              <div className="about-audience-icon">
                <FiTrendingUp />
              </div>
              <h3>Firme și ONG-uri verificate</h3>
              <p>
                Dacă organizezi evenimente ca firmă sau ONG, îți creezi un cont de organizator
                și treci printr-un proces scurt de verificare a identității juridice. Odată verificat,
                poți publica în feed-ul public, vinde bilete și accesa statistici detaliate.
              </p>
              <ul className="about-audience-list">
                <li><FiShield size={13} /> Verificare identitate juridică (CUI / statut ONG)</li>
                <li><FiShield size={13} /> Publicare în feed-ul public</li>
                <li><FiShield size={13} /> Vânzare bilete și încasări</li>
                <li><FiShield size={13} /> Dashboard cu analitics</li>
              </ul>
              <button className="about-audience-btn about-audience-btn--outline-light" onClick={() => navigate('/pricing')}>Vezi planuri organizator</button>
            </div>
          </div>
        </div>
      </section>

      <section className="about-how">
        <div className="about-how-inner">
          <h2 className="about-section-title">Cum funcționează?</h2>
          <div className="about-steps">
            <div className="about-step">
              <span className="about-step-num">01</span>
              <h4>Explorezi fără cont</h4>
              <p>Intri pe EventHub și poți vedea imediat evenimentele publice disponibile - fără înregistrare.</p>
            </div>
            <div className="about-step">
              <span className="about-step-num">02</span>
              <h4>Creezi un cont personal</h4>
              <p>Te înregistrezi gratuit și ai acces la calendar, bilete, evenimente private și recomandări.</p>
            </div>
            <div className="about-step">
              <span className="about-step-num">03</span>
              <h4>Participi sau organizezi</h4>
              <p>Cumperi bilete la evenimente publice sau creezi propriile evenimente private cu prietenii.</p>
            </div>
            <div className="about-step">
              <span className="about-step-num">04</span>
              <h4>Aplici ca organizator profesionist</h4>
              <p>Dacă ești business sau ONG, aplici pentru un cont de organizator - verificăm și aprobăm în câteva zile lucrătoare.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="about-cta">
        <div className="about-cta-inner">
          <h2>Gata să începi?</h2>
          <p>Explorează ce se întâmplă azi sau creează-ți contul în câteva secunde.</p>
          <div className="about-cta-btns">
            <button onClick={() => navigate('/explore')}>Explorează evenimente</button>
            <button className="outline" onClick={() => navigate('/register')}>Creează cont gratuit</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
