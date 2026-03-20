import { React, useState, useEffect } from 'react';
import '../styles/Profile.css';

const Profile = ({ user }) => {
    if (!user) return <div className="profile-container">Te rugăm să te autentifici.</div>;

    const [userInterests, setUserInterests] = useState([]);

    useEffect(() => {
    const getMyData = async () => {
        try {
        const res = await API.get(`/auth/user/${user.id}`);
        setUserInterests(res.data.Interests || []); 
        } catch (err) {
        console.error("Eroare la încărcare interese:", err);
        }
    };
    if(user?.id) getMyData();
    }, [user]);

    return (
        <div className="profile-page">
        <div className="profile-container">
            <aside className="profile-sidebar">
            <div className="profile-avatar">
                {user.firstName ? user.firstName[0].toUpperCase() : 'U'}
            </div>
            <h2 className="profile-name">{user.firstName} {user.lastName || ''}</h2>
            <p className="profile-role">{user.role === 'organizer' ? 'Organizator Evenimente' : 'Participant'}</p>
            
            <div className="profile-info-list">
                <div className="info-item">
                <span className="label">Email</span>
                <span className="value">{user.email}</span>
                </div>
            </div>

            <button className="btn-edit-profile">Editează Profil</button>
            </aside>

            <main className="profile-content">
            <section className="profile-section">
                <h3>{user.role === 'organizer' ? 'Evenimentele Mele Create' : 'Interesele Mele'}</h3>
                
                {user.role === 'user' ? (
                <div className="interests-grid">
                    {userInterests.length > 0 ? (
                        userInterests.map(cat => (
                        <div key={cat.id} className="interest-tag active-tag">
                            {cat.name}
                        </div>
                        ))
                    ) : (
                        <p className="empty-text">Nu ai ales niciun interes încă.</p>
                    )}
                    <button className="add-interest-btn" onClick={() => navigate('/onboarding')}>
                        <i className="fi fi-rr-edit"></i> Modifică
                    </button>
                </div>
                ) : (
                <div className="organizer-empty-state">
                    <p>Încă nu ai creat niciun eveniment.</p>
                    <button className="btn-create-event-profile">Creează Primul Eveniment</button>
                </div>
                )}
            </section>

            <section className="profile-section">
                <div className="section-header">
                    <h3>Biletele mele</h3>
                    <button className="btn-view-all">Vezi tot</button>
                </div>
                
                <div className="tickets-container">
                    <div className="empty-state-card">
                    <div className="icon-circle">🎫</div>
                    <p>Încă nu ai nicio rezervare activă.</p>
                    <button className="btn-explore" onClick={() => navigate('/')}>Explorează Evenimente</button>
                    </div>
                </div>
                </section>

                <section className="profile-section">
                    <div className="section-header">
                        <h3>Calendarul meu</h3>
                        <span className="calendar-hint">Următoarele evenimente salvate</span>
                    </div>
                    
                    <div className="calendar-agenda">
                        <div className="agenda-item empty">
                        <p>Niciun eveniment programat săptămâna aceasta.</p>
                        </div>
                    </div>
                </section>
            </main>
        </div>
        </div>
    );
};

export default Profile;