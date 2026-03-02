import React, { useState } from 'react';
import '../styles/AuthModal.css';

const AuthModal = ({ onClose, onLogin }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'user'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.email || !formData.password) {
        throw new Error('Email și parolă sunt obligatorii');
      }

      await new Promise((r) => setTimeout(r, 800));

      const userData = {
        id: Math.random(),
        email: formData.email,
        firstName: formData.firstName || 'User',
        role: formData.role,
        isAuthenticated: true
      };

      onLogin(userData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>

        <div className="auth-container">
          <h2>{isSignup ? 'Creează Cont' : 'Intră în Cont'}</h2>
          <p className="auth-subtitle">
            {isSignup ? 'Alătură-te comunității EventHub' : 'Bun venit înapoi'}
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            {isSignup && (
              <>
                <div className="form-row">
                  <input
                    type="text"
                    name="firstName"
                    placeholder="Prenume"
                    value={formData.firstName}
                    onChange={handleChange}
                    required={isSignup}
                  />
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Nume"
                    value={formData.lastName}
                    onChange={handleChange}
                    required={isSignup}
                  />
                </div>
              </>
            )}

            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <input
              type="password"
              name="password"
              placeholder="Parolă"
              value={formData.password}
              onChange={handleChange}
              required
            />

            {isSignup && (
              <div className="role-selector">
                <label className={formData.role === 'user' ? 'active' : ''}>
                  <input
                    type="radio"
                    name="role"
                    value="user"
                    checked={formData.role === 'user'}
                    onChange={handleChange}
                  />
                  👤 Participant
                </label>
                <label className={formData.role === 'organizer' ? 'active' : ''}>
                  <input
                    type="radio"
                    name="role"
                    value="organizer"
                    checked={formData.role === 'organizer'}
                    onChange={handleChange}
                  />
                  🏢 Organizator
                </label>
              </div>
            )}

            {error && <p className="error-msg">{error}</p>}

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Se procesează...' : (isSignup ? 'Creează cont' : 'Intră')}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              {isSignup ? 'Deja ai cont? ' : 'Nu ai cont? '}
              <button
                type="button"
                className="toggle-btn"
                onClick={() => {
                  setIsSignup(!isSignup);
                  setError('');
                }}
              >
                {isSignup ? 'Intră în cont' : 'Creează cont'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
