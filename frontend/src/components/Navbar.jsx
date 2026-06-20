import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FiSearch, FiMenu, FiX, FiCompass, FiCalendar, FiPlus } from 'react-icons/fi';
import '../styles/Navbar.css';

const Navbar = ({ user, handleLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchTerm.trim() !== "") {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
      setMobileMenuOpen(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 850) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <nav className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-event">Event</span>
          <span className="logo-hub">Hub</span>
        </Link>

        <div className="navbar-links">
          <NavLink to="/explore" className="navbar-link">
            <FiCompass size={14} />
            Explorează
          </NavLink>
          {!user && (
            <NavLink to="/about" className="navbar-link">
              Despre noi
            </NavLink>
          )}
          {user && (
            <NavLink to="/my-events" className="navbar-link">
              <FiCalendar size={14} />
              Evenimentele mele
            </NavLink>
          )}
          {user?.role === 'admin' && (
            <NavLink to="/admin/verification-queue" className="navbar-link">
              Admin Panel
            </NavLink>
          )}
          {user && (
            <NavLink to="/calendar" className="navbar-link">
              <FiCalendar size={14} />
              Calendarul meu
            </NavLink>
          )}
          {user && (
            <NavLink to="/create-event" className="navbar-link navbar-link-create">
              <FiPlus size={14} />
              Creează
            </NavLink>
          )}
        </div>

        <div className="navbar-actions">
          <div className="navbar-search">
            <FiSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Caută evenimente..." 
              className="navbar-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>

          {user ? (
            <>
              <Link to="/profile" className="navbar-btn-secondary navbar-btn-profile">Profil</Link>
              <button className="navbar-btn-primary" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-btn-secondary">Intră în cont</Link>
              <Link to="/register" className="navbar-btn-primary">Înregistrare</Link>
            </>
          )}
        </div>

        <button 
          className="navbar-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="navbar-mobile-menu">
          <div className="navbar-mobile-search">
             <FiSearch className="search-icon" />
             <input 
                type="text" 
                placeholder="Caută..." 
                className="navbar-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearch}
             />
          </div>
          <Link to="/explore" className="navbar-mobile-link" onClick={() => setMobileMenuOpen(false)}>Explorează</Link>
          {!user && (
            <Link to="/about" className="navbar-mobile-link" onClick={() => setMobileMenuOpen(false)}>Despre noi</Link>
          )}
          {user && (
            <Link to="/my-events" className="navbar-mobile-link" onClick={() => setMobileMenuOpen(false)}>Evenimentele mele</Link>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin/verification-queue" className="navbar-mobile-link" onClick={() => setMobileMenuOpen(false)}>Admin Panel</Link>
          )}
          {user && (
            <Link to="/calendar" className="navbar-mobile-link" onClick={() => setMobileMenuOpen(false)}>Calendarul meu</Link>
          )}
          {user && (
            <Link to="/create-event" className="navbar-mobile-link" onClick={() => setMobileMenuOpen(false)}>Creează</Link>
          )}
          <div className="navbar-mobile-account">
            {user ? (
              <>
                <p className="navbar-mobile-account-label">Contul tău</p>
                <Link to="/profile" className="navbar-btn-secondary navbar-btn-profile navbar-mobile-account-link" onClick={() => setMobileMenuOpen(false)}>Profil</Link>
                <button className="navbar-btn-primary navbar-mobile-account-logout" onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>Logout</button>
              </>
            ) : (
              <>
                <p className="navbar-mobile-account-label">Autentificare</p>
                <Link to="/login" className="navbar-btn-secondary navbar-mobile-account-link" onClick={() => setMobileMenuOpen(false)}>Intră în cont</Link>
                <Link to="/register" className="navbar-btn-primary navbar-mobile-account-logout" onClick={() => setMobileMenuOpen(false)}>Înregistrare</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;