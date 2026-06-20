import { Link } from 'react-router-dom';
import '../styles/Footer.css';

const Footer = () => {
  return (
    <footer className="main-footer">
      <div className="footer-inner">

        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <span>Event</span><span className="footer-logo-accent">Hub</span>
          </Link>
          <p className="footer-brand-desc">Platforma unde descoperi, organizezi și trăiești evenimente.</p>
        </div>

        <div className="footer-col">
          <h4>PENTRU PARTICIPANȚI</h4>
          <Link to="/explore">Explorează evenimente</Link>
          <Link to="/register">Creează cont gratuit</Link>
        </div>

        <div className="footer-col">
          <h4>PENTRU ORGANIZATORI</h4>
          <Link to="/pricing">Planuri și prețuri</Link>
          <Link to="/about">Cum funcționează</Link>
        </div>

        <div className="footer-col">
          <h4>EVENTHUB</h4>
          <Link to="/about">Despre noi</Link>
          <a href="mailto:contact@eventhub.ro">Contact</a>
        </div>

      </div>

      <div className="footer-bottom">
        <span>© 2026 EventHub.</span>
        <span>Făcut cu energie în România.</span>
      </div>
    </footer>
  );
};

export default Footer;
