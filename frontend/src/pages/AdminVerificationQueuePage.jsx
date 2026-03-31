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
        setItems(response.data?.requests || []);
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
      setItems(prev => prev.map(item => (
        item.id === id ? { ...item, verificationStatus: 'verified', requestedAt: new Date().toISOString() } : item
      )));
      setStats(prev => ({ ...prev, pendingCount: Math.max(0, prev.pendingCount - 1), verifiedCount: prev.verifiedCount + 1 }));
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
      setItems(prev => prev.map(item => (
        item.id === id ? { ...item, verificationStatus: 'rejected', requestedAt: new Date().toISOString() } : item
      )));
      setStats(prev => ({ ...prev, pendingCount: Math.max(0, prev.pendingCount - 1), rejectedCount: prev.rejectedCount + 1 }));
    } catch (err) { setError('Eroare la respingere.'); } 
    finally { setProcessingId(''); }
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return item.verificationStatus === 'pending';
    if (activeTab === 'verified') return item.verificationStatus === 'verified';
    if (activeTab === 'rejected') return item.verificationStatus === 'rejected';
    return true;
  });

  const statusLabelMap = {
    pending: 'În așteptare',
    verified: 'Aprobată',
    rejected: 'Respinsă'
  };

  const statusPillClassMap = {
    pending: 'pill-pending',
    verified: 'pill-verified',
    rejected: 'pill-rejected'
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
              <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>
                Toate ({stats.total})
              </button>
              <button className={activeTab === 'pending' ? 'active' : ''} onClick={() => setActiveTab('pending')}>
                În așteptare ({stats.pendingCount})
              </button>
              <button className={activeTab === 'verified' ? 'active' : ''} onClick={() => setActiveTab('verified')}>
                Aprobate ({stats.verifiedCount})
              </button>
              <button className={activeTab === 'rejected' ? 'active' : ''} onClick={() => setActiveTab('rejected')}>
                Respinse ({stats.rejectedCount})
              </button>
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
                  {filteredItems.map(org => (
                    <tr key={org.id}>
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
                      <td><span className={statusPillClassMap[org.verificationStatus] || 'pill-pending'}>{statusLabelMap[org.verificationStatus] || 'În așteptare'}</span></td>
                      <td>
                        <div className="actions">
                          <button
                            className="act-btn approve"
                            onClick={() => handleApprove(org.id)}
                            disabled={org.verificationStatus !== 'pending' || processingId === org.id}
                            title={org.verificationStatus !== 'pending' ? 'Doar cererile în așteptare pot fi aprobate' : 'Aprobă'}
                          >
                            <FiCheckCircle />
                          </button>
                          <button
                            className="act-btn reject"
                            onClick={() => handleReject(org.id)}
                            disabled={org.verificationStatus !== 'pending' || processingId === org.id}
                            title={org.verificationStatus !== 'pending' ? 'Doar cererile în așteptare pot fi respinse' : 'Respinge'}
                          >
                            <FiXCircle />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="admin-empty-row">Nu există cereri pentru filtrul selectat.</td>
                    </tr>
                  ) : null}
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