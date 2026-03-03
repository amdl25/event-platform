import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import EventDetailsPage from './pages/EventDetailsPage';
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
        <Routes>
          <Route path="/" element={<Home />} />
          
          <Route path="/event/:id" element={<EventDetailsPage />} />
        </Routes>
      </main>


    </div>
  );
}

export default App;