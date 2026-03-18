import React, { useState } from 'react';
import API from '../api';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/AuthPages.css';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("1. Încep procedura de Login...");
    console.log("2. Date trimise:", formData);
    console.log("3. URL de bază folosit:", API.defaults.baseURL);

    try {
        const res = await API.post('/auth/login', formData);
        console.log("4. Serverul a răspuns!", res.data);
        onLogin(res.data);
        navigate('/');
    } catch (err) {
        console.error("5. EROARE DETALIATĂ:", err);
        console.log("6. Status eroare:", err.response?.status);
        alert("Eroare la autentificare!");
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
            onChange={e => setFormData({...formData, email: e.target.value})} 
          />
          <input 
            type="password" 
            placeholder="Parolă" 
            required 
            onChange={e => setFormData({...formData, password: e.target.value})} 
          />
          <button type="submit" className="btn-auth-main">Intră în cont</button>
        </form>

        <p className="auth-footer-text">
          Nu ai cont? <Link to="/register">Creează unul nou</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;