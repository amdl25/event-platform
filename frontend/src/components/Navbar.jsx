import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { FiSearch, FiMenu, FiX, FiCompass, FiCalendar, FiPlus } from 'react-icons/fi';
import '../styles/Navbar.css';

const Navbar = ({ user, handleLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="navbar">
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
          <NavLink to="/calendar" className="navbar-link">
            <FiCalendar size={14} />
            Calendarul meu
          </NavLink>
          <NavLink to="/create-event" className="navbar-link navbar-link-create">
            <FiPlus size={14} />
            Creează
          </NavLink>
        </div>

        <div className="navbar-actions">
          <div className="navbar-search">
            <FiSearch size={15} className="navbar-search-icon" />
            <input 
              type="text" 
              placeholder=""
              className="navbar-search-input"
            />
          </div>

          {user ? (
            <>
              <Link to="/profile" className="navbar-btn-secondary">Profil</Link>
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
          <Link to="/explore" className="navbar-mobile-link">Explorează</Link>
          <Link to="/calendar" className="navbar-mobile-link">Calendarul meu</Link>
          <Link to="/create-event" className="navbar-mobile-link">Creează</Link>
          <div className="navbar-mobile-actions">
            {user ? (
              <>
                <Link to="/profile" className="navbar-btn-secondary">Profil</Link>
                <button className="navbar-btn-primary" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="navbar-btn-secondary">Intră în cont</Link>
                <Link to="/register" className="navbar-btn-primary">Înregistrare</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
