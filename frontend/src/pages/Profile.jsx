import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from "react-qr-code";
import API from '../api';
import EventCard from '../components/EventCard'; 
import '../styles/Profile.css';

const Profile = ({ user }) => {
    const navigate = useNavigate();
    const [myEvents, setMyEvents] = useState([]); 
    const [activeTab, setActiveTab] = useState('tickets'); 
    const [organizerStatus, setOrganizerStatus] = useState(user?.organizerVerificationStatus || null);
    const [verificationForm, setVerificationForm] = useState({
        companyName: user?.organizationName || '',
        companyCui: '',
        registeredAddress: '',
        officialPhone: ''
    });
    const [verificationMessage, setVerificationMessage] = useState('');
    const [verificationError, setVerificationError] = useState('');
    const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!user?.id) return;
            try {
                const eventsRes = await API.get('/events');
                
                const hosted = eventsRes.data.filter(event => event.user_id === user.id);
                setMyEvents(hosted);

                if (user?.role === 'organizer') {
                    const statusRes = await API.get(`/auth/organizer/status/${user.id}`);
                    setOrganizerStatus(statusRes.data?.verificationStatus || 'unverified');
                    setVerificationForm((prev) => ({
                        ...prev,
                        companyName: statusRes.data?.organizationName || prev.companyName,
                        companyCui: statusRes.data?.cuiCif || '',
                        registeredAddress: statusRes.data?.registeredAddress || '',
                        officialPhone: statusRes.data?.officialPhone || ''
                    }));
                }
                
            } catch (err) {
                console.error("Eroare la încărcarea datelor de profil:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfileData();
    }, [user]);

    const handleSubmitVerification = async (e) => {
        e.preventDefault();
        setVerificationError('');
        setVerificationMessage('');

        if (!verificationForm.companyName.trim() || !verificationForm.companyCui.trim() || !verificationForm.registeredAddress.trim() || !verificationForm.officialPhone.trim()) {
            setVerificationError('Completează toate câmpurile profilului business.');
            return;
        }

        try {
            setIsSubmittingVerification(true);
            const payload = {
                account_id: user.id,
                company_name: verificationForm.companyName.trim(),
                company_cui: verificationForm.companyCui.trim(),
                registered_address: verificationForm.registeredAddress.trim(),
                official_phone: verificationForm.officialPhone.trim()
            };

            const response = await API.post('/auth/organizer/verification', payload, {
                headers: { 'Content-Type': 'application/json' }
            });

            setOrganizerStatus(response.data?.verificationStatus || 'pending');
            setVerificationMessage(response.data?.message || 'Documentele au fost trimise cu succes.');
        } catch (err) {
            setVerificationError(err.response?.data?.message || 'Nu am putut trimite documentele.');
        } finally {
            setIsSubmittingVerification(false);
        }
    };

    const handleViewTicket = (ticketData) => {
        setSelectedTicket(ticketData);
        setIsModalOpen(true);
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
                        <button
                            className="btn-create-event-header"
                            onClick={() => navigate('/create-event')}
                            disabled={user?.role === 'organizer' && organizerStatus !== 'verified'}
                            title={user?.role === 'organizer' && organizerStatus !== 'verified' ? 'Cont în așteptare. Trimite documentele pentru validare.' : ''}
                        >
                            + Creează Eveniment
                        </button>
                        <button className="btn-settings-header" onClick={() => navigate('/settings')}>
                            Setări
                        </button>
                    </div>
                </header>

                {user?.role === 'organizer' && organizerStatus !== 'verified' ? (
                    <section className="organizer-verification-banner">
                        <h3>Cont organizator în așteptare</h3>
                        <p>
                            Status curent: <strong>{organizerStatus || 'unverified'}</strong>. 
                            Completează profilul business pentru verificare înainte să publici evenimente în feed-ul public.
                        </p>

                        {organizerStatus !== 'pending' ? (
                            <form className="organizer-verification-form" onSubmit={handleSubmitVerification}>
                                <input
                                    type="text"
                                    placeholder="Nume firmă (ex: Jazz Society S.R.L.)"
                                    value={verificationForm.companyName}
                                    onChange={(event) => setVerificationForm({ ...verificationForm, companyName: event.target.value })}
                                    required
                                    disabled={isSubmittingVerification}
                                />

                                <input
                                    type="text"
                                    placeholder="CUI / CIF (ex: RO12345678)"
                                    value={verificationForm.companyCui}
                                    onChange={(event) => setVerificationForm({ ...verificationForm, companyCui: event.target.value })}
                                    required
                                    disabled={isSubmittingVerification}
                                />

                                <input
                                    type="text"
                                    placeholder="Adresă sediu social"
                                    value={verificationForm.registeredAddress}
                                    onChange={(event) => setVerificationForm({ ...verificationForm, registeredAddress: event.target.value })}
                                    required
                                    disabled={isSubmittingVerification}
                                />

                                <input
                                    type="tel"
                                    placeholder="Număr de telefon oficial"
                                    value={verificationForm.officialPhone}
                                    onChange={(event) => setVerificationForm({ ...verificationForm, officialPhone: event.target.value })}
                                    required
                                    disabled={isSubmittingVerification}
                                />

                                {verificationError ? <p className="organizer-verification-error">{verificationError}</p> : null}
                                {verificationMessage ? <p className="organizer-verification-success">{verificationMessage}</p> : null}

                                <button type="submit" className="btn-primary" disabled={isSubmittingVerification}>
                                    {isSubmittingVerification ? 'Se trimite...' : 'Trimite profilul business pentru verificare'}
                                </button>
                            </form>
                        ) : (
                            <p className="organizer-verification-pending">Profilul business a fost trimis. Așteaptă aprobarea adminului.</p>
                        )}
                    </section>
                ) : null}

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