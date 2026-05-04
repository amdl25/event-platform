import React, { useState } from 'react';
import API from '../api';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import '../styles/AuthPages.css';

const Register = ({ onLogin }) => {
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    password: false,
    companyName: false
  });
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

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  const firstNameValue = String(formData.firstName || '').trim();
  const lastNameValue = String(formData.lastName || '').trim();
  const emailValue = String(formData.email || '').trim();
  const passwordValue = String(formData.password || '');
  const companyNameValue = String(formData.companyName || '').trim();

  const firstNameError = touched.firstName && (!firstNameValue ? 'Prenumele este obligatoriu.' : (firstNameValue.length < 2 ? 'Minim 2 caractere.' : ''));
  const lastNameError = touched.lastName && (!lastNameValue ? 'Numele este obligatoriu.' : (lastNameValue.length < 2 ? 'Minim 2 caractere.' : ''));
  const emailError = touched.email && (!emailValue ? 'Email-ul este obligatoriu.' : (!isValidEmail(emailValue) ? 'Format email invalid.' : ''));
  const passwordError = touched.password && (!passwordValue ? 'Parola este obligatorie.' : (passwordValue.length < 6 ? 'Minim 6 caractere.' : ''));
  const companyNameError = formData.role === 'organizer' && touched.companyName && (!companyNameValue ? 'Numele firmei este obligatoriu.' : (companyNameValue.length < 2 ? 'Minim 2 caractere.' : ''));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ firstName: true, lastName: true, email: true, password: true, companyName: true });
    const nextFirstName = firstNameValue;
    const nextLastName = lastNameValue;
    const nextEmail = emailValue;
    const nextPassword = passwordValue;
    const nextCompanyName = companyNameValue;

    if (!nextFirstName || !nextLastName || !nextEmail || !nextPassword) {
      setError('Completează toate câmpurile obligatorii.');
      return;
    }

    if (nextFirstName.length < 2 || nextLastName.length < 2) {
      setError('Numele și prenumele trebuie să aibă cel puțin 2 caractere.');
      return;
    }

    if (!isValidEmail(nextEmail)) {
      setError('Introdu o adresă de email validă.');
      return;
    }

    if (nextPassword.length < 6) {
      setError('Parola trebuie să aibă cel puțin 6 caractere.');
      return;
    }

    if (formData.role === 'organizer' && !nextCompanyName) {
      setError('Pentru organizator este obligatoriu numele firmei/brand-ului.');
      return;
    }

    setError('');

    try {
      const res = await API.post('/auth/register', {
        ...formData,
        firstName: nextFirstName,
        lastName: nextLastName,
        email: nextEmail,
        password: nextPassword,
        companyName: nextCompanyName
      });
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
            <input type="text" placeholder="Prenume" required minLength={2} maxLength={80}
              value={formData.firstName}
              className={firstNameError ? 'auth-input-invalid' : ''}
              onChange={e => {
                setFormData({...formData, firstName: e.target.value});
                if (error) setError('');
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, firstName: true }))} />
            <input type="text" placeholder="Nume" required minLength={2} maxLength={80}
              value={formData.lastName}
              className={lastNameError ? 'auth-input-invalid' : ''}
              onChange={e => {
                setFormData({...formData, lastName: e.target.value});
                if (error) setError('');
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, lastName: true }))} />
          </div>
          {(firstNameError || lastNameError) ? <div className="auth-field-error">{firstNameError || lastNameError}</div> : null}
          
          <input type="email" placeholder="Email" required autoComplete="email" 
            value={formData.email}
            className={emailError ? 'auth-input-invalid' : ''}
            onChange={e => {
              setFormData({...formData, email: e.target.value});
              if (error) setError('');
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, email: true }))} />
          {emailError ? <div className="auth-field-error">{emailError}</div> : null}
          
          <input type="password" placeholder="Parolă" required minLength={6} autoComplete="new-password" 
            value={formData.password}
            className={passwordError ? 'auth-input-invalid' : ''}
            onChange={e => {
              setFormData({...formData, password: e.target.value});
              if (error) setError('');
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, password: true }))} />
          {passwordError ? <div className="auth-field-error">{passwordError}</div> : null}

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
                minLength={2}
                maxLength={120}
                value={formData.companyName}
                className={companyNameError ? 'auth-input-invalid' : ''}
                onChange={e => {
                  setFormData({...formData, companyName: e.target.value});
                  if (error) setError('');
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, companyName: true }))}
                />
                {companyNameError ? <div className="auth-field-error">{companyNameError}</div> : null}
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