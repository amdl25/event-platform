import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from "react-qr-code";
import API from '../api';
import EventCard from '../components/EventCard'; 
import '../styles/Profile.css';

const Profile = ({ user }) => {
    const navigate = useNavigate();
    const [userInterests, setUserInterests] = useState([]);
    const [myEvents, setMyEvents] = useState([]); 
    const [activeTab, setActiveTab] = useState('tickets'); 
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!user?.id) return;
            try {
                const [userRes, eventsRes] = await Promise.all([
                    API.get(`/users/${user.id}`),
                    API.get('/events')
                ]);
                
                setUserInterests(userRes.data.Interests || userRes.data.interests || []);
                
                const hosted = eventsRes.data.filter(event => event.user_id === user.id);
                setMyEvents(hosted);
                
            } catch (err) {
                console.error("Eroare la încărcarea datelor de profil:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfileData();
    }, [user]);

    const handleViewTicket = (ticketData) => {
        setSelectedTicket(ticketData);
        setIsModalOpen(true);
    };

    const handleRemoveInterest = async (interestId) => {
        const backupInterests = [...userInterests];
        setUserInterests(userInterests.filter(i => i.id !== interestId));
        try {
            await API.delete(`/users/${user.id}/interests/${interestId}`);
        } catch (err) {
            console.error("Eroare la ștergerea interesului:", err);
            setUserInterests(backupInterests);
        }
    };

    if (!user || loading) {
        return <div className="profile-loader">Se încarcă profilul...</div>;
    }

    return (
        <div className="profile-page">
            <div className="container-max">
                
                <header className="profile-top-section">
                    <div className="user-identity">
                        <div className="avatar-circle">
                            {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || ''}
                        </div>
                        <div className="user-meta">
                            <h1>{user?.firstName} {user?.lastName}</h1>
                            <p>{user?.email} • {user?.role === 'organizer' ? 'Organizator' : 'Participant'}</p>
                        </div>
                    </div>
                    <div className="profile-actions">
                        <button className="btn-create-event-header" onClick={() => navigate('/create-event')}>
                            + Creează Eveniment
                        </button>
                        <button className="btn-settings-header" onClick={() => navigate('/settings')}>
                            Setări
                        </button>
                    </div>
                </header>

                <nav className="profile-nav-tabs">
                    <button 
                        className={activeTab === 'tickets' ? 'active' : ''} 
                        onClick={() => setActiveTab('tickets')}
                    >
                        Biletele mele
                    </button>
                    <button 
                        className={activeTab === 'hosted' ? 'active' : ''} 
                        onClick={() => setActiveTab('hosted')}
                    >
                        Evenimentele tale
                    </button>
                    <button 
                        className={activeTab === 'explore' ? 'active' : ''} 
                        onClick={() => setActiveTab('explore')}
                    >
                        Interese
                    </button>
                </nav>

                <main className="profile-main-content">
                    
                    {activeTab === 'tickets' && (
                        <div className="tab-content tab-fade-in">
                            <h2 className="section-title">Rezervări Active</h2>
                            <div className="tickets-list">
                                <div className="functional-ticket-card">
                                    <div className="ticket-main-info">
                                        <div className="date-badge">24<br/><span>MAR</span></div>
                                        <div className="details">
                                            <h3>Jazz in the Garden</h3>
                                            <p>📍 Grădina Botanică, Cluj-Napoca</p>
                                        </div>
                                    </div>
                                    <button className="btn-qr-trigger" onClick={() => handleViewTicket({ id: "TICKET-777-XYZ", name: "Jazz in the Garden" })}>
                                        <i className="fi fi-rr-qrcode"></i> Vezi Bilet
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'hosted' && (
                        <div className="tab-content tab-fade-in">
                            <h2 className="section-title">Evenimente Organizate</h2>
                            {myEvents.length > 0 ? (
                                <div className="category-grid"> 
                                    {myEvents.map(event => (
                                        <EventCard key={event.id} event={event} variant="compact" />
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state-card">
                                    <p className="empty-state-text">Nu ai organizat niciun eveniment încă.</p>
                                    <button className="btn-primary" onClick={() => navigate('/create-event')}>
                                        Creează primul eveniment
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'explore' && (
                        <div className="tab-content explore-tab tab-fade-in">
                            <div className="content-header">
                                <h2 className="section-title">Algoritmul tău</h2>
                                <p className="section-subtitle">Ajustează preferințele pentru recomandări personalizate.</p>
                            </div>
                            <div className="pill-grid">
                                {userInterests.length > 0 ? (
                                    userInterests.map(cat => (
                                        <div key={cat.id} className="pill-item animate-in">
                                            {cat.name}
                                            <button className="pill-remove" onClick={() => handleRemoveInterest(cat.id)}>×</button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="empty-interests-text">Nu ai selectat interese.</p>
                                )}
                                <button className="pill-add" onClick={() => navigate('/onboarding?mode=edit')}>+ Adaugă</button>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {isModalOpen && (
                <div className="qr-modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal" onClick={() => setIsModalOpen(false)}>&times;</button>
                        <div className="qr-header">
                            <h3>Bilet Digital</h3>
                            <p>{selectedTicket?.name}</p>
                        </div>
                        <div className="qr-container">
                            <QRCode value={selectedTicket?.id || ""} size={200} />
                        </div>
                        <div className="qr-footer">
                            <span className="ticket-id-display">{selectedTicket?.id}</span>
                            <p>Prezintă acest cod la intrare.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;