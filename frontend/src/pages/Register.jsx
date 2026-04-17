import React, { useState } from 'react';
import API from '../api';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import '../styles/AuthPages.css';

const Register = ({ onLogin }) => {
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '', 
    lastName: '', 
    email: '', 
    password: '', 
    role: 'user',
    companyName: ''
  });
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.role === 'organizer' && !formData.companyName.trim()) {
      setError('Pentru organizator este obligatoriu numele firmei/brand-ului.');
      return;
    }

    try {
      const res = await API.post('/auth/register', formData);
      onLogin(res.data);
      
      const pendingInvitation = sessionStorage.getItem('pendingInvitation');
      if (pendingInvitation) {
        const { eventId, token: inviteToken } = JSON.parse(pendingInvitation);
        const redirectPath = inviteToken ? `/invite/${eventId}?token=${encodeURIComponent(inviteToken)}` : `/invite/${eventId}`;
        navigate(redirectPath);
      } else {
        const params = new URLSearchParams(location.search);
        const redirect = params.get('redirect');
        const fallback = res.data?.role === 'organizer' ? '/organizer/events' : '/';
        navigate(redirect || fallback);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Eroare la înregistrare');
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <header className="auth-header">
          <h2>Înregistrare</h2>
        </header>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <input type="text" placeholder="Prenume" required 
              onChange={e => setFormData({...formData, firstName: e.target.value})} />
            <input type="text" placeholder="Nume" required 
              onChange={e => setFormData({...formData, lastName: e.target.value})} />
          </div>
          
          <input type="email" placeholder="Email" required 
            onChange={e => setFormData({...formData, email: e.target.value})} />
          
          <input type="password" placeholder="Parolă" required 
            onChange={e => setFormData({...formData, password: e.target.value})} />

          <div className="role-toggle">
            <button type="button" 
              className={formData.role === 'user' ? 'active' : ''} 
              onClick={() => setFormData({...formData, role: 'user'})}>Participant</button>
            <button type="button" 
              className={formData.role === 'organizer' ? 'active' : ''} 
              onClick={() => setFormData({...formData, role: 'organizer'})}>Organizator</button>
          </div>

          {formData.role === 'organizer' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input 
                type="text" 
                placeholder="Nume firmă (ex: Jazz Society S.R.L.)" 
                required 
                onChange={e => setFormData({...formData, companyName: e.target.value})} 
                />
                <small style={{ color: '#6b7280', marginTop: '-8px' }}>
                  Datele fiscale (CUI, adresă, telefon oficial) le completezi după login, în pasul de verificare business.
                </small>
            </div>
            )}

          {error ? <div className="auth-error-msg">{error}</div> : null}

          <button type="submit" className="btn-auth-main">Creează Cont</button>
        </form>

        <p className="auth-footer-text">
          Ai deja cont? <Link to="/login">Intră aici</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;