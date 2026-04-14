import React, { useState } from 'react';
import API from '../api';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import '../styles/AuthPages.css';

const Login = ({ onLogin }) => {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    console.log("1. Încep procedura de Login...");
    console.log("2. Date trimise:", formData);
    console.log("3. URL de bază folosit:", API.defaults.baseURL);

    try {
        const res = await API.post('/auth/login', formData);
        console.log("4. Serverul a răspuns!", res.data);
        onLogin(res.data);
      const params = new URLSearchParams(location.search);
      const redirect = params.get('redirect');
      const fallback = res.data?.role === 'organizer' ? '/organizer/events' : '/';
      navigate(redirect || fallback);
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
            required
            disabled={isSubmitting}
            onChange={e => setFormData({...formData, email: e.target.value})} 
          />
          <input 
            type="password" 
            placeholder="Parolă" 
            required
            disabled={isSubmitting}
            onChange={e => setFormData({...formData, password: e.target.value})} 
          />
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