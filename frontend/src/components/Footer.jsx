import '../styles/Footer.css';

const Footer = () => {
  return (
    <footer className="main-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <h2 className="footer-logo">Event<span>Hub</span></h2>
          <p>Your unified experience hub. Public or private, manage your entire social life in one single calendar.</p>
          <div className="footer-status">
            <span className="status-dot"></span> System Operational
          </div>
        </div>
        
        <div className="footer-links-group">
          <div className="footer-column">
            <h4>Platform</h4>
            <ul>
              <li>Explore Events</li>
              <li>How it Works</li>
              <li>For Organizers</li>
              <li>Loyalty Program</li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>Support</h4>
            <ul>
              <li>Help Center</li>
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>Connect</h4>
            <div className="social-links">
              <li>Instagram</li>
              <li>LinkedIn</li>
              <li>X (Twitter)</li>
            </div>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; 2026 EventHub Experience Technologies.</p>
      </div>
    </footer>
  );
};

export default Footer;