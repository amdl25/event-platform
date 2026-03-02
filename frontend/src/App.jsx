import React, { useState } from 'react';
import DiscoveryFeed from './pages/DiscoveryFeed';
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleLogin = (userData) => {
    setUser(userData);
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <div className="App">
      <Navbar 
        user={user} 
        handleLogout={handleLogout} 
        setShowAuthModal={() => setShowAuthModal(true)} 
      />

      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          onLogin={handleLogin}
        />
      )}
      
      <main className="app-main">
        <DiscoveryFeed user={user} />
      </main>

      <Footer />
    </div>
  );
}

export default App;