import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navbar.css';

const Navbar = ({ user, handleLogout }) => {
  return (
    <header className="app-header">
      <div className="header-content">
        <div className="nav-left">
          <Link to="/" className="navbar-logo-link">
            <h1 className="logo">Event<span>Hub</span></h1>
          </Link>
          
          <nav className="header-categories">
            <span className="nav-link">Artă</span>
            <span className="nav-link">Muzică</span>
            <span className="nav-link">Tech</span>
            <span className="nav-link">Sport</span>
          </nav>
        </div>

        <div className="header-actions">
          <div className="search-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </div>
          
          {user ? (
            <div className="user-menu">
              <span>{user.firstName}</span>
              <button className="btn-logout-header" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-login-header">
                Autentificare
              </Link>
              <Link to="/register" className="btn-login-header btn-signup">
                Cont nou
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;