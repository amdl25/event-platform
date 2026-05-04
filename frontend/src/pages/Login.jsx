import React, { useState } from 'react';
import API from '../api';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import '../styles/AuthPages.css';

const Login = ({ onLogin }) => {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });
  const navigate = useNavigate();
  const location = useLocation();

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  const emailValue = String(formData.email || '').trim();
  const passwordValue = String(formData.password || '');
  const emailError = touched.email && (!emailValue ? 'Email-ul este obligatoriu.' : (!isValidEmail(emailValue) ? 'Format email invalid.' : ''));
  const passwordError = touched.password && (!passwordValue ? 'Parola este obligatorie.' : (passwordValue.length < 6 ? 'Minim 6 caractere.' : ''));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const email = emailValue;
    const password = passwordValue;

    if (!email || !password) {
      setError('Completează email-ul și parola.');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Introdu o adresă de email validă.');
      return;
    }

    if (password.length < 6) {
      setError('Parola trebuie să aibă cel puțin 6 caractere.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    console.log("1. Încep procedura de Login...");
    console.log("2. Date trimise:", formData);
    console.log("3. URL de bază folosit:", API.defaults.baseURL);

    try {
        const res = await API.post('/auth/login', { email, password });
        console.log("4. Serverul a răspuns!", res.data);
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
        const msg = err.response?.data?.message || "Email sau parolă incorectă!";
        setError(msg);
    } finally {
      setIsSubmitting(false);
    }
};

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <header className="auth-header">
          <h2>Autentificare</h2>
        </header>

        <form onSubmit={handleSubmit} className="auth-form">
          <input 
            type="email" 
            placeholder="Email" 
            value={formData.email}
            required
            autoComplete="email"
            className={emailError ? 'auth-input-invalid' : ''}
            disabled={isSubmitting}
            onChange={e => {
              setFormData({...formData, email: e.target.value});
              if (error) setError('');
            }} 
            onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
          />
          {emailError ? <div className="auth-field-error">{emailError}</div> : null}
          <input 
            type="password" 
            placeholder="Parolă" 
            value={formData.password}
            required
            minLength={6}
            autoComplete="current-password"
            className={passwordError ? 'auth-input-invalid' : ''}
            disabled={isSubmitting}
            onChange={e => {
              setFormData({...formData, password: e.target.value});
              if (error) setError('');
            }} 
            onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
          />
          {passwordError ? <div className="auth-field-error">{passwordError}</div> : null}
          {error && <div className="auth-error-msg">{error}</div>}

          <button 
          type="submit" 
          className="btn-auth-main"
          disabled={isSubmitting}
          >
          Intră în cont
           </button>
        </form>

        <p className="auth-footer-text">
          Nu ai cont? <Link to="/register">Creează unul nou</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;