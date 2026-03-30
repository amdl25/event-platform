import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FiCalendar, FiGrid, FiSettings, FiUsers, FiCheckCircle, FiAlertCircle, FiClock } from 'react-icons/fi';
import API from '../api';
import '../styles/OrganizerDashboard.css';
import '../styles/OrganizerSettings.css';

const OrganizerSettingsPage = ({ user, handleLogout }) => {
  const statusLabels = {
    unverified: 'Neverificat',
    pending: 'În așteptare',
    verified: 'Verificat',
    rejected: 'Respins'
  };

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organizerStatus, setOrganizerStatus] = useState(user?.organizerVerificationStatus || 'unverified');
  const [verificationForm, setVerificationForm] = useState({
    companyName: user?.organizationName || '',
    companyCui: '',
    registeredAddress: '',
    officialPhone: ''
  });
  const [submitError, setSubmitError] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      navigate('/login');
      return;
    }

    if (user.role !== 'organizer') {
      navigate('/');
      return;
    }

    const loadStatus = async () => {
      try {
        const statusRes = await API.get(`/auth/organizer/status/${user.id}`);
        setOrganizerStatus(statusRes.data?.verificationStatus || 'unverified');
        setVerificationForm((prev) => ({
          ...prev,
          companyName: statusRes.data?.organizationName || prev.companyName,
          companyCui: statusRes.data?.cuiCif || '',
          registeredAddress: statusRes.data?.registeredAddress || '',
          officialPhone: statusRes.data?.officialPhone || ''
        }));
      } catch (error) {
        console.error('Nu am putut încărca statusul:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
  }, [navigate, user]);

  const handleSubmitVerification = async (event) => {
    event.preventDefault();
    setSubmitError('');
    setSubmitMessage('');

    if (!verificationForm.companyCui.trim() || !verificationForm.registeredAddress.trim() || !verificationForm.officialPhone.trim()) {
      setSubmitError('Te rugăm să completezi toate câmpurile obligatorii.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        account_id: user.id,
        company_name: verificationForm.companyName.trim() || user?.organizationName,
        company_cui: verificationForm.companyCui.trim(),
        registered_address: verificationForm.registeredAddress.trim(),
        official_phone: verificationForm.officialPhone.trim()
      };

      const response = await API.post('/auth/organizer/verification', payload);
      setOrganizerStatus(response.data?.verificationStatus || 'pending');
      setSubmitMessage('Cererea a fost trimisă spre analiză!');

      setTimeout(() => {
        navigate('/organizer/dashboard');
      }, 1500);
    } catch (error) {
      setSubmitError(error.response?.data?.message || 'Eroare la trimiterea cererii.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="organizer-loading">Se încarcă...</div>;
  }

  return (
    <div className="organizer-shell">
      <aside className="organizer-sidebar">
        <div className="organizer-sidebar-header">
          <Link to="/organizer/dashboard" className="organizer-logo">
            <span className="organizer-logo-event">Event</span>
            <span className="organizer-logo-hub">Hub</span>
            <span className="organizer-logo-badge">ORGANIZER</span>
          </Link>
        </div>

        <nav className="organizer-nav">
          <NavLink to="/organizer/dashboard" className="organizer-nav-item">
            <FiGrid /> Dashboard
          </NavLink>
          <button className="organizer-nav-item muted" disabled><FiCalendar /> Evenimentele mele</button>
          <button className="organizer-nav-item muted" disabled><FiUsers /> Participanți</button>
          <NavLink to="/organizer/settings" className="organizer-nav-item active">
            <FiSettings /> Setări
          </NavLink>
        </nav>
      </aside>

      <main className="organizer-main">
        <header className="organizer-topbar">
          <div className="organizer-search">
             <FiClock style={{marginRight: '8px', opacity: 0.5}} />
             <span>Status: {statusLabels[organizerStatus]}</span>
          </div>
          <div className="organizer-topbar-right">
            <button 
                className="organizer-new-event-btn" 
                onClick={() => navigate('/create-event')}
                disabled={organizerStatus !== 'verified'}
            >
              + Eveniment nou
            </button>
            <div className="organizer-user-profile">
              <div className="user-avatar">OR</div>
              <span className="user-name">{verificationForm.companyName || 'Organizator'}</span>
            </div>
            <button className="organizer-logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <div className="organizer-content-scroll">
          <div className="settings-container">
            <div className="settings-header">
              <h1>Verificare Identitate Business</h1>
              <p className="settings-subtitle">
                Completează datele oficiale ale firmei tale pentru a putea publica evenimente pe platformă.
              </p>
            </div>

            <div className={`status-box`}>
              Status curent: <strong>{statusLabels[organizerStatus]}</strong>
            </div>

            <form className="verification-form" onSubmit={handleSubmitVerification}>
              <div className="form-group">
                <label>Nume Firmă / Brand</label>
                <input
                  type="text"
                  value={verificationForm.companyName}
                  onChange={(e) => setVerificationForm({ ...verificationForm, companyName: e.target.value })}
                  disabled={organizerStatus === 'pending' || organizerStatus === 'verified'}
                />
              </div>

              <div className="form-group">
                <label>CUI / CIF</label>
                <input
                  type="text"
                  placeholder="ex: RO12345678"
                  value={verificationForm.companyCui}
                  onChange={(e) => setVerificationForm({ ...verificationForm, companyCui: e.target.value })}
                  disabled={organizerStatus === 'pending' || organizerStatus === 'verified'}
                  required
                />
              </div>

              <div className="form-group">
                <label>Adresă Sediu Social</label>
                <input
                  type="text"
                  placeholder="Oraș, Strada, Număr"
                  value={verificationForm.registeredAddress}
                  onChange={(e) => setVerificationForm({ ...verificationForm, registeredAddress: e.target.value })}
                  disabled={organizerStatus === 'pending' || organizerStatus === 'verified'}
                  required
                />
              </div>

              <div className="form-group">
                <label>Telefon Oficial</label>
                <input
                  type="tel"
                  placeholder="07xx xxx xxx"
                  value={verificationForm.officialPhone}
                  onChange={(e) => setVerificationForm({ ...verificationForm, officialPhone: e.target.value })}
                  disabled={organizerStatus === 'pending' || organizerStatus === 'verified'}
                  required
                />
              </div>

              {submitError && (
                <div className="error-msg">
                  <FiAlertCircle style={{marginRight: '8px'}} /> {submitError}
                </div>
              )}

              {submitMessage && (
                <div className="success-msg">
                  <FiCheckCircle style={{marginRight: '8px'}} /> {submitMessage}
                </div>
              )}

              {organizerStatus !== 'verified' && organizerStatus !== 'pending' && (
                <button type="submit" className="submit-button" disabled={isSubmitting}>
                  {isSubmitting ? 'Se trimite...' : 'Trimite spre verificare'}
                </button>
              )}
              
              {organizerStatus === 'pending' && (
                <p style={{marginTop: '20px', color: '#64748b', fontSize: '13px', textAlign: 'center'}}>
                  Datele tale sunt în curs de verificare de către un administrator.
                </p>
              )}
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrganizerSettingsPage;