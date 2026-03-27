import { Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import EventDetailsPage from './pages/EventDetailsPage';
import Navbar from './components/Navbar';
import ScrollToTop from './components/ScrollToTop';
import Onboarding from './components/Onboarding';
import Profile from './pages/Profile';
import CategoryPage from './pages/CategoryPage';
import SearchResults from './pages/SearchResults';
import ExplorePage from './pages/ExplorePage';
import CreatePersonalEvent from './pages/CreatePersonalEvent';
import CalendarPage from './pages/CalendarPage';
import TicketPurchasePage from './pages/TicketPurchasePage';
import RecommendationResultsPage from './pages/RecommendationResultsPage';
import InviteEventPage from './pages/InviteEventPage';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
    },
  },
});

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
    <QueryClientProvider client={queryClient}>
      <div className="App">
        <ScrollToTop />
        <Navbar user={user} handleLogout={handleLogout} />
        
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/category/:categoryName" element={<CategoryPage />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<Register onLogin={handleLogin} />} />
            <Route path="/event/:id" element={<EventDetailsPage user={user} />} />
            <Route path="/profile" element={<Profile user={user} />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/recommendations" element={<RecommendationResultsPage />} />
            <Route path="/create-event" element={<CreatePersonalEvent user={user} />} />
            <Route path="/calendar" element={<CalendarPage user={user} userEvents={user?.events || []} />} />
            <Route path="/purchase/:id" element={<TicketPurchasePage user={user} />} />
            <Route path="/invite/:eventId" element={<InviteEventPage user={user} />} />
          </Routes>
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;