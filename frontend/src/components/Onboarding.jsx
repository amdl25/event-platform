import React, { useState, useEffect } from 'react';
import API from '../api';
import '../styles/Onboarding.css';

const Onboarding = ({ user, onFinish }) => {
  const [categories, setCategories] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    API.get('/categories')
      .then(res => setCategories(res.data))
      .catch(err => console.error("Eroare categorii:", err));
  }, []);

  const toggleInterest = (id) => {
    setSelectedInterests(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleFinalize = async () => {
    setLoading(true);
    try {
      await API.post('/users/set-interests', {
        userId: user.id,
        interests: selectedInterests
      });
      onFinish();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await API.post('/users/set-interests', {
        userId: user.id,
        interests: []
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      onFinish();
    }
  };

    return (
        <div className="onboarding-full-page">
            <div className="onboarding-content">
                <header className="onboarding-header">
                    <span className="step-indicator">Pasul 2 din 2</span>
                    <h1>Ce te pasionează, {user.firstName}? </h1>
                    <p>Alege domeniile preferate pentru a-ți personaliza experiența EventHub.</p>
                </header>

                <div className="interests-full-grid">
                    {categories.map((cat) => (
                    <div
                        key={cat.id}
                        className={`interest-card ${selectedInterests.includes(cat.id) ? 'active' : ''}`}
                        onClick={() => toggleInterest(cat.id)}
                    >
                        <span className="interest-name">{cat.name}</span>
                        <div className="check-icon">
                        {selectedInterests.includes(cat.id) ? '✓' : '+'}
                        </div>
                    </div>
                    ))}
                </div>

                <div className="onboarding-actions-container">
                    <button 
                        className="btn-finish-full" 
                        onClick={handleFinalize}
                        disabled={selectedInterests.length === 0 || loading}
                    >
                    {loading ? 'Se salvează...' : 'Finalizează Profilul'}
                    </button>
                    
                    <button className="btn-skip-full" onClick={handleSkip} disabled={loading}>
                    Skip
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;