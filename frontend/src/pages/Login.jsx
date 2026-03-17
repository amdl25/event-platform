import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/AuthPages.css';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/auth/login', formData);
      onLogin(res.data);
      navigate('/');
    } catch (err) {
      alert("Email sau parolă incorectă!");
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