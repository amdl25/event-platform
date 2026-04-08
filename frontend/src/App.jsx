import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
import TicketsDownloadPage from './pages/TicketsDownloadPage';
import RecommendationResultsPage from './pages/RecommendationResultsPage';
import InviteEventPage from './pages/InviteEventPage';
import OrganizerDashboard from './pages/OrganizerDashboard';
import OrganizerSettingsPage from './pages/OrganizerSettingsPage';
import AdminVerificationQueuePage from './pages/AdminVerificationQueuePage';
import { AUTH_TOKEN_STORAGE_KEY } from './api';
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
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('eventHubUser');
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!savedUser || !token) return null;
    return JSON.parse(savedUser);
  });
  
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleLogin = (userData) => {
    const { token, ...userPayload } = userData;

    setUser(userPayload);
    localStorage.setItem('eventHubUser', JSON.stringify(userPayload));
    if (token) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    }
    
    if (userPayload.isNewUser && userPayload.role === 'user') {
      setShowOnboarding(true);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('eventHubUser');
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    queryClient.clear();
    setShowOnboarding(false);
    navigate('/', { replace: true });
  };

  if (showOnboarding && user) {
    return <Onboarding user={user} onFinish={() => setShowOnboarding(false)} />;
  }

  const isOrganizerLayout = location.pathname.startsWith('/organizer');
  const isAdminLayout = location.pathname.startsWith('/admin');

  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        <ScrollToTop />
        {!isOrganizerLayout && !isAdminLayout ? <Navbar user={user} handleLogout={handleLogout} /> : null}
        
        <main className="app-main">
          <Routes>
            <Route
              path="/"
              element={
                user?.role === 'organizer'
                  ? <Navigate to="/organizer/dashboard" replace />
                  : user?.role === 'admin'
                    ? <Navigate to="/admin/verification-queue" replace />
                    : <Home />
              }
            />
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
            <Route path="/tickets-download" element={<TicketsDownloadPage />} />
            <Route path="/invite/:eventId" element={<InviteEventPage user={user} />} />
            <Route path="/organizer" element={<Navigate to="/organizer/dashboard" replace />} />
            <Route path="/organizer/dashboard" element={<OrganizerDashboard user={user} handleLogout={handleLogout} />} />
            <Route path="/organizer/settings" element={<OrganizerSettingsPage user={user} handleLogout={handleLogout} />} />
            <Route path="/admin" element={<Navigate to="/admin/verification-queue" replace />} />
            <Route path="/admin/verification-queue" element={<AdminVerificationQueuePage user={user} handleLogout={handleLogout} />} />
          </Routes>
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;