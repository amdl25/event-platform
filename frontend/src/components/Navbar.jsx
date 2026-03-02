import React from 'react';
import '../styles/Navbar.css';

const Navbar = ({ user, handleLogout, setShowAuthModal }) => {
  return (
    <header className="app-header">
      <div className="header-content">
        <div className="nav-left">
          <h1 className="logo">Event<span>Hub</span></h1>
          
          <nav className="header-categories">
            <span className="nav-link">Arts</span>
            <span className="nav-link">Music</span>
            <span className="nav-link">Tech</span>
            <span className="nav-link">Food</span>
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
              <span className="user-name">{user.firstName}</span>
              <button className="btn-logout-header" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <>
              <button 
                className="btn-login-header btn-login" 
                onClick={() => setShowAuthModal(true)}
              >
                Login
              </button>
              <button 
                className="btn-login-header btn-signup" 
                onClick={() => setShowAuthModal(true)}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;