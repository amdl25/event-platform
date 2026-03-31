import React, { useEffect, useState } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import { 
  FiBell, FiCalendar, FiCheckCircle, FiClock, FiFilter, 
  FiGrid, FiSearch, FiSettings, FiUsers, FiXCircle
} from 'react-icons/fi';
import API from '../api';
import '../styles/AdminVerificationQueuePage.css';

const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_APPROVAL_TOKEN || '';

const AdminVerificationQueuePage = ({ user, handleLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, pendingCount: 0, verifiedCount: 0, rejectedCount: 0 });
  const [processingId, setProcessingId] = useState('');
  const [removingIds, setRemovingIds] = useState([]);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!user?.id || user.role !== 'admin') {
      navigate('/');
      return;
    }

    const loadPending = async () => {
      try {
        setLoading(true);
        const response = await API.get('/auth/admin/pending-organizations', {
          headers: {
            'x-admin-token': ADMIN_TOKEN,
            'x-admin-id': user.id
          }
        });
        setItems(response.data?.pending || []);
        setStats(response.data?.stats || { total: 0, pendingCount: 0, verifiedCount: 0, rejectedCount: 0 });
      } catch (err) {
        setError(err.response?.data?.message || 'Eroare la încărcarea cererilor.');
      } finally {
        setLoading(false);
      }
    };
    loadPending();
  }, [navigate, user]);

  const handleApprove = async (id) => {
    try {
      setProcessingId(id);
      await API.patch(`/auth/admin/verify-organization/${id}`, { status: 'verified' }, {
        headers: {
          'x-admin-token': ADMIN_TOKEN,
          'x-admin-id': user.id
        }
      });
      setRemovingIds(prev => [...prev, id]);
      setTimeout(() => {
        setItems(prev => prev.filter(item => item.id !== id));
        setStats(prev => ({ ...prev, pendingCount: prev.pendingCount - 1, verifiedCount: prev.verifiedCount + 1 }));
      }, 300);
    } catch (err) { setError('Eroare la aprobare.'); } 
    finally { setProcessingId(''); }
  };

  const handleReject = async (id) => {
    const reason = prompt('Motiv respingere (optional):');
    if (reason === null) return;
    try {
      setProcessingId(id);
      await API.patch(`/auth/admin/verify-organization/${id}`, { status: 'rejected', notes: reason }, {
        headers: {
          'x-admin-token': ADMIN_TOKEN,
          'x-admin-id': user.id
        }
      });
      setRemovingIds(prev => [...prev, id]);
      setTimeout(() => {
        setItems(prev => prev.filter(item => item.id !== id));
        setStats(prev => ({ ...prev, pendingCount: prev.pendingCount - 1, rejectedCount: prev.rejectedCount + 1 }));
      }, 300);
    } catch (err) { setError('Eroare la respingere.'); } 
    finally { setProcessingId(''); }
  };

  if (loading) return <div className="admin-loading">Se încarcă...</div>;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <Link to="/admin/dashboard" className="admin-logo">
            <span className="logo-event">Event</span>
            <span className="logo-hub">Hub</span>
            <span className="admin-badge">ADMIN</span>
          </Link>
        </div>

        <nav className="admin-nav">
          <NavLink to="/admin/dashboard" className="admin-nav-item muted">
            <FiGrid /> Dashboard
          </NavLink>
          <NavLink to="/admin/verification-queue" className="admin-nav-item active">
            <FiCalendar /> Cereri Firme
          </NavLink>
          <button className="admin-nav-item muted" disabled><FiUsers /> Organizatori</button>
          <button className="admin-nav-item muted" disabled><FiUsers /> Participanți</button>
          <button className="admin-nav-item muted" disabled><FiSettings /> Setări</button>
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-search">
            <FiSearch />
            <input type="text" placeholder="Caută în baza de date..." />
          </div>
          <div className="admin-topbar-right">
            <div className="admin-notif"><FiBell /><span>3</span></div>
            <div className="admin-user">
              <div className="admin-avatar">AD</div>
              <span className="admin-name">Administrator</span>
            </div>
            <button className="admin-logout" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <div className="admin-content">
          {error ? <div className="admin-error-banner">{error}</div> : null}

          <section className="admin-stats">
            <div className="stat-card">
              <div className="stat-text">
                <label>TOTAL CERERI</label>
                <strong>{stats.total}</strong>
              </div>
              <FiGrid className="stat-icon" />
            </div>
            <div className="stat-card">
              <div className="stat-text">
                <label>ÎN AȘTEPTARE</label>
                <strong className="text-orange">{stats.pendingCount}</strong>
              </div>
              <FiClock className="stat-icon orange" />
            </div>
            <div className="stat-card">
              <div className="stat-text">
                <label>APROBATE</label>
                <strong className="text-green">{stats.verifiedCount}</strong>
              </div>
              <FiCheckCircle className="stat-icon green" />
            </div>
            <div className="stat-card">
              <div className="stat-text">
                <label>RESPINSE</label>
                <strong className="text-red">{stats.rejectedCount}</strong>
              </div>
              <FiXCircle className="stat-icon red" />
            </div>
          </section>

          <div className="admin-panel">
            <div className="panel-header">
              <h1>Cereri inregistrare</h1>
              <button className="admin-filter"><FiFilter /> Filtrează</button>
            </div>

            <div className="admin-tabs">
              <button className="active">Toate ({items.length})</button>
              <button>În așteptare</button>
              <button>Aprobate</button>
              <button>Respinse</button>
            </div>

            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Companie</th>
                    <th>Contact</th>
                    <th>Adresă & Telefon</th>
                    <th>Data</th>
                    <th>Status</th>
                    <th>Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(org => (
                    <tr key={org.id} className={removingIds.includes(org.id) ? 'fade-out' : ''}>
                      <td>
                        <div className="company-info">
                          <div className="company-icon"><FiCalendar /></div>
                          <div>
                            <p className="name">{org.companyName}</p>
                            <p className="sub">{org.cuiCif}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="contact-p">{org.owner?.fullName}</p>
                        <p className="sub">{org.owner?.email}</p>
                      </td>
                      <td>
                        <p className="sub">{org.registeredAddress}</p>
                        <p className="sub">{org.officialPhone}</p>
                      </td>
                      <td><p className="sub">{new Date(org.requestedAt).toLocaleDateString('ro-RO')}</p></td>
                      <td><span className="pill-pending">În așteptare</span></td>
                      <td>
                        <div className="actions">
                          <button className="act-btn approve" onClick={() => handleApprove(org.id)}><FiCheckCircle /></button>
                          <button className="act-btn reject" onClick={() => handleReject(org.id)}><FiXCircle /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminVerificationQueuePage;