import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import EventDetailsPage from './pages/EventDetailsPage';
import Navbar from './components/Navbar';
import ScrollToTop from './components/ScrollToTop';
import Onboarding from './components/Onboarding';
import Profile from './pages/Profile';
import './App.css';

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('eventHubUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('eventHubUser', JSON.stringify(userData));
    
    if (userData.isNewUser && userData.role === 'user') {
      setShowOnboarding(true);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('eventHubUser');
  };

  if (showOnboarding && user) {
    return <Onboarding user={user} onFinish={() => setShowOnboarding(false)} />;
  }

  return (
    <div className="App">
      <ScrollToTop />
      <Navbar user={user} handleLogout={handleLogout} />
      
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/register" element={<Register onLogin={handleLogin} />} />
          <Route path="/event/:id" element={<EventDetailsPage />} />
          <Route path="/profile" element={<Profile user={user} />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;