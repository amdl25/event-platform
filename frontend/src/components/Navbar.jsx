import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';

const Navbar = ({ user, handleLogout }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchTerm.trim() !== "") {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
      setSearchTerm("");
    }
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="nav-left">
          <Link to="/" className="navbar-logo-link">
            <h1 className="logo">Event<span>Hub</span></h1>
          </Link>
          
          <nav className="header-categories">
            <Link to="/category/Muzică" className="nav-link">Muzică</Link>
            <Link to="/category/Artă" className="nav-link">Artă</Link>
            <Link to="/category/Tech" className="nav-link">Tech</Link>
            <Link to="/category/Sport" className="nav-link">Sport</Link>
            <Link to="/category/Lifestyle" className="nav-link">Lifestyle</Link>
          </nav>
        </div>

        <div className="header-actions">
          <div className="search-container">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input 
              type="text" 
              placeholder="Caută evenimente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="search-input"
            />
          </div>
          
          {user ? (
            <div className="user-menu">
              <Link to="/profile" className="nav-profile-link">
                <div className="nav-avatar-mini">
                  {user.firstName[0].toUpperCase()}
                </div>
                <span className="nav-user-name">{user.firstName}</span>
              </Link>

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