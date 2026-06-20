import { useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiClock, FiSearch, FiXCircle } from 'react-icons/fi';
import API from '../api';
import AdminShell from '../components/AdminShell';
import '../styles/AdminPanel.css';

const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_APPROVAL_TOKEN || '';

const statusLabelMap = {
  pending: 'În așteptare',
  verified: 'Aprobată',
  rejected: 'Respinsă'
};

const statusPillClassMap = {
  pending: 'warning',
  verified: 'success',
  rejected: 'danger'
};

const AdminVerificationQueuePage = ({ user, handleLogout }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, pendingCount: 0, verifiedCount: 0, rejectedCount: 0 });
  const [processingId, setProcessingId] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [rejectingId, setRejectingId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [revealedEmails, setRevealedEmails] = useState(new Set());
  const [revealedPhones, setRevealedPhones] = useState(new Set());

  useEffect(() => {
    if (!user?.id || user.role !== 'admin') return;

    const loadPending = async () => {
      try {
        setLoading(true);
        const response = await API.get('/auth/admin/pending-organizations', {
          headers: { 'x-admin-token': ADMIN_TOKEN, 'x-admin-id': user.id }
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
  }, [user]);

  const handleApprove = async (id) => {
    try {
      setProcessingId(id);
      await API.patch(`/auth/admin/verify-organization/${id}`, { status: 'verified' }, {
        headers: { 'x-admin-token': ADMIN_TOKEN, 'x-admin-id': user.id }
      });
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, verificationStatus: 'verified', requestedAt: new Date().toISOString() } : item)));
      setStats((prev) => ({ ...prev, pendingCount: Math.max(0, prev.pendingCount - 1), verifiedCount: prev.verifiedCount + 1 }));
    } catch {
      setError('Eroare la aprobare.');
    } finally {
      setProcessingId('');
    }
  };

  const handleReject = async (id) => {
    try {
      setProcessingId(id);
      await API.patch(`/auth/admin/verify-organization/${id}`, { status: 'rejected', notes: rejectReason }, {
        headers: { 'x-admin-token': ADMIN_TOKEN, 'x-admin-id': user.id }
      });
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, verificationStatus: 'rejected', requestedAt: new Date().toISOString() } : item)));
      setStats((prev) => ({ ...prev, pendingCount: Math.max(0, prev.pendingCount - 1), rejectedCount: prev.rejectedCount + 1 }));
      setRejectingId('');
      setRejectReason('');
    } catch {
      setError('Eroare la respingere.');
    } finally {
      setProcessingId('');
    }
  };

  const toggleEmail = (id) => {
    setRevealedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePhone = (id) => {
    setRevealedPhones((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredItems = useMemo(() => items.filter((item) => {
    const matchesSearch = `${item.companyName} ${item.owner?.fullName || ''} ${item.owner?.email || ''}`.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (activeTab === 'pending') return item.verificationStatus === 'pending';
    if (activeTab === 'verified') return item.verificationStatus === 'verified';
    if (activeTab === 'rejected') return item.verificationStatus === 'rejected';
    return true;
  }), [activeTab, items, search]);

  if (loading) return null;

  return (
    <AdminShell
      user={user}
      handleLogout={handleLogout}
      title="Cereri înregistrare"
      notificationsCount={stats.pendingCount}
    >
      {error ? <div className="admin-card admin-badge-pill danger">{error}</div> : null}

      <section className="admin-grid-4" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <div className="admin-card compact">
          <div className="admin-stat">
            <div><label>ÎN AȘTEPTARE</label><strong className="admin-text orange">{stats.pendingCount}</strong></div>
            <div className="admin-stat-icon orange"><FiClock /></div>
          </div>
        </div>
        <div className="admin-card compact">
          <div className="admin-stat">
            <div><label>APROBATE</label><strong className="admin-text green">{stats.verifiedCount}</strong></div>
            <div className="admin-stat-icon green"><FiCheckCircle /></div>
          </div>
        </div>
        <div className="admin-card compact">
          <div className="admin-stat">
            <div><label>RESPINSE</label><strong className="admin-text red">{stats.rejectedCount}</strong></div>
            <div className="admin-stat-icon red"><FiXCircle /></div>
          </div>
        </div>
      </section>

      <div className="admin-toolbar">
        <div className="admin-tabs">
          <button type="button" className={`admin-tab${activeTab === 'all' ? ' active' : ''}`} onClick={() => setActiveTab('all')}>Toate ({stats.total})</button>
          <button type="button" className={`admin-tab${activeTab === 'pending' ? ' active' : ''}`} onClick={() => setActiveTab('pending')}>În așteptare ({stats.pendingCount})</button>
          <button type="button" className={`admin-tab${activeTab === 'verified' ? ' active' : ''}`} onClick={() => setActiveTab('verified')}>Aprobate ({stats.verifiedCount})</button>
          <button type="button" className={`admin-tab${activeTab === 'rejected' ? ' active' : ''}`} onClick={() => setActiveTab('rejected')}>Respinse ({stats.rejectedCount})</button>
        </div>
        <div className="admin-search" style={{ width: 'min(420px, 100%)' }}>
          <FiSearch className="admin-search-icon" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Caută companie sau contact..." />
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Companie</th>
              <th>Proprietar</th>
              <th>Adresă & Telefon</th>
              <th>Data cererii</th>
              <th>Status</th>
              <th>Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((org) => {
              const emailParts = org.owner?.email?.split('@');
              const maskedEmail = emailParts ? `${emailParts[0][0]}***@${emailParts[1]}` : '-';
              const revealed = revealedEmails.has(org.id);
              const phoneRevealed = revealedPhones.has(org.id);
              const maskedPhone = org.officialPhone ? `${org.officialPhone.slice(0, 3)}****${org.officialPhone.slice(-2)}` : '-';

              return (
                <tr key={org.id}>
                  <td>
                    <div className="admin-row-inline">
                      <div className="admin-avatar-soft">{org.companyName.slice(0, 2).toUpperCase()}</div>
                      <div>
                        <p className="admin-row-title">{org.companyName}</p>
                        <p className="admin-row-subtitle">{org.cuiCif || 'Fără CUI'}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="admin-row-stack">
                      <span className="admin-row-title">{org.owner?.fullName || '-'}</span>
                      <button type="button" className="admin-email-reveal" onClick={() => toggleEmail(org.id)} title={revealed ? 'Ascunde email' : 'Afișează email'}>
                        {revealed ? org.owner?.email : maskedEmail}
                      </button>
                    </div>
                  </td>
                  <td>
                    <p className="admin-row-subtitle">{org.registeredAddress || '-'}</p>
                    <button type="button" className="admin-email-reveal" onClick={() => togglePhone(org.id)} title={phoneRevealed ? 'Ascunde telefon' : 'Afișează telefon'}>
                      {org.officialPhone ? (phoneRevealed ? org.officialPhone : maskedPhone) : '-'}
                    </button>
                  </td>
                  <td><span className="admin-row-subtitle">{new Date(org.requestedAt).toLocaleDateString('ro-RO')}</span></td>
                  <td><span className={`admin-pill ${statusPillClassMap[org.verificationStatus] || 'warning'}`}>{statusLabelMap[org.verificationStatus] || 'În așteptare'}</span></td>
                  <td>
                    {org.verificationStatus === 'pending' ? (
                      rejectingId === org.id ? (
                        <div className="admin-reject-inline">
                          <input
                            type="text"
                            className="admin-reject-input"
                            placeholder="Motiv respingere (opțional)"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            autoFocus
                          />
                          <div className="admin-actions">
                            <button type="button" className="admin-action-button danger" onClick={() => handleReject(org.id)} disabled={processingId === org.id}>Confirmă</button>
                            <button type="button" className="admin-action-button" onClick={() => { setRejectingId(''); setRejectReason(''); }}>Anulează</button>
                          </div>
                        </div>
                      ) : (
                        <div className="admin-actions admin-actions-icon-only">
                          <button type="button" className="admin-action-button admin-action-icon success" onClick={() => handleApprove(org.id)} disabled={processingId === org.id} aria-label="Aprobă" title="Aprobă"><FiCheckCircle /></button>
                          <button type="button" className="admin-action-button admin-action-icon danger" onClick={() => { setRejectingId(org.id); setRejectReason(''); }} aria-label="Respinge" title="Respinge"><FiXCircle /></button>
                        </div>
                      )
                    ) : (
                      <span className="admin-no-actions">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredItems.length === 0 ? <tr><td colSpan="6" className="admin-table-empty">Nu există cereri pentru filtrul selectat.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
};

export default AdminVerificationQueuePage;
