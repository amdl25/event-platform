import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import '../styles/Navbar.css';

const Navbar = ({ user, handleLogout }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchTerm.trim() !== "") {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
      setSearchTerm("");
    }
  };

  const handleCreateClick = () => {
    if (user) {
      navigate('/create-event');
    } else {
      navigate('/login');
    }
  };

  const onLogoutClick = () => {
    handleLogout();
    navigate('/');
  };

  return (
    <header className="app-header">
      <div className=" container-max header-content">
        
        <div className="nav-left">
          <Link to="/" className="navbar-logo-link">
            <h1 className="logo">Event<span>Hub</span></h1>
          </Link>
          
          <nav className="header-main-nav">
            <Link to="/explore" className={`nav-link ${location.pathname === '/explore' ? 'active' : ''}`}>
              <i className="fi fi-rr-search"></i> Explorează
            </Link>
            
            <Link 
              to={user ? "/calendar" : "/login"} 
              className={`nav-link ${location.pathname === '/calendar' ? 'active' : ''}`}
            >
              <i className="fi fi-rr-calendar"></i> Calendarul meu
            </Link>

            <span 
              className={`nav-link nav-create-link ${location.pathname === '/create' ? 'active' : ''}`}
              onClick={handleCreateClick}
            >
              <i className="fi fi-rr-plus-small"></i>
              Creează
            </span>

          </nav>
        </div>

        <div className="header-actions">
          
          <div className="search-container">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="search-svg">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input 
              type="text" 
              placeholder="Caută..." 
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

              <button className="btn-logout-visible" onClick={onLogoutClick} title="Deconectare">
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-group">
              <Link to="/login" className="btn-auth-text">
                Intră în cont
              </Link>
              <Link to="/register" className="btn-auth-solid">
                Înregistrare
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;