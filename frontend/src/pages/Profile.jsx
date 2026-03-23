import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from "react-qr-code";
import API from '../api';
import '../styles/Profile.css';

const Profile = ({ user }) => {
    const navigate = useNavigate();
    const [userInterests, setUserInterests] = useState([]);
    const [activeTab, setActiveTab] = useState('tickets'); 
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.id) return;
            try {
                const res = await API.get(`/users/${user.id}`);
                setUserInterests(res.data.Interests || res.data.interests || []);
            } catch (err) {
                console.error("Eroare la încărcarea profilului:", err);
            }
        };
        fetchProfile();
    }, [user]);

    const handleViewTicket = (ticketData) => {
        setSelectedTicket(ticketData);
        setIsModalOpen(true);
    };

    if (!user) {
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
                    <button className="edit-profile-link" onClick={() => navigate('/settings')}>
                        Setări cont
                    </button>
                </header>

                <nav className="profile-nav-tabs">
                    <button className={activeTab === 'tickets' ? 'active' : ''} onClick={() => setActiveTab('tickets')}>
                        Biletele mele
                    </button>
                    <button className={activeTab === 'calendar' ? 'active' : ''} onClick={() => setActiveTab('calendar')}>
                        Programul tău
                    </button>
                    <button className={activeTab === 'social' ? 'active' : ''} onClick={() => setActiveTab('social')}>
                        Social
                    </button>
                    <button className={activeTab === 'explore' ? 'active' : ''} onClick={() => setActiveTab('explore')}>
                        Configurare Flux
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
                                    <button 
                                        className="btn-qr-trigger" 
                                        onClick={() => handleViewTicket({ id: "EVENT-123-ABC", name: "Jazz in the Garden" })}
                                    >
                                        <i className="fi fi-rr-qrcode"></i> Vezi Bilet
                                    </button>
                                </div>

                                <div className="empty-state-card">
                                    <p>Nu ai alte bilete momentan.</p>
                                    <button className="btn-primary" onClick={() => navigate('/')}>Găsește evenimente</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'calendar' && (
                        <div className="tab-content tab-fade-in">
                            <h2 className="section-title">Agenda ta socială</h2>
                            <div className="calendar-placeholder">
                                <p>Evenimentele tale vor apărea aici într-un timeline cronologic.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'social' && (
                        <div className="tab-content social-tab tab-fade-in">
                            <div className="banner-card">
                                <div className="banner-info">
                                    <h2>Creează un eveniment privat</h2>
                                    <p>Invită-ți prietenii la o adunare rapidă și trimite-le link-ul de acces direct din agenda ta.</p>
                                    <button className="btn-accent" onClick={() => navigate('/create-social')}>
                                        + Host an Event
                                    </button>
                                </div>
                                <div className="banner-icon">
                                    <i className="fi fi-rr-users"></i>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'explore' && (
                        <div className="tab-content explore-tab tab-fade-in">
                            <div className="content-header">
                                <h2 className="section-title">Algoritmul tău</h2>
                                <p className="section-subtitle">Ajustează preferințele pentru recomandări personalizate pe baza pasiunilor tale.</p>
                            </div>
                            
                            <div className="pill-grid">
                                {userInterests.map(cat => (
                                    <div key={cat.id} className="pill-item">
                                        {cat.name}
                                        <button className="pill-remove">×</button>
                                    </div>
                                ))}
                                <button className="pill-add" onClick={() => navigate('/onboarding')}>
                                    + Adaugă pasiuni
                                </button>
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
                            <QRCode
                                value={selectedTicket?.id || ""} 
                                size={200}
                                bgColor={"#ffffff"}
                                fgColor={"#18181b"}
                                level={"L"}
                            />
                        </div>

                        <div className="qr-footer">
                            <span className="ticket-id-display">{selectedTicket?.id}</span>
                            <p>Prezintă acest cod la intrare pentru scanare.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;