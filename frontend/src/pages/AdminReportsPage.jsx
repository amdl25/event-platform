import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiBarChart2, FiClock, FiDownload, FiFileText } from 'react-icons/fi';
import API from '../api';
import AdminShell from '../components/AdminShell';

const AdminReportsPage = ({ user, handleLogout }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await API.get('/admin/reports');
        setData(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Eroare la încărcarea rapoartelor.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'admin') {
      load();
    }
  }, [user]);

  if (loading) {
    return <AdminShell user={user} handleLogout={handleLogout} title="Rapoarte" subtitle="Statistici și export CSV"><div className="admin-card">Se încarcă...</div></AdminShell>;
  }

  const stats = data?.reportStats || {};

  const exportCsv = () => {
    const rows = [
      ['Type', 'Title', 'Actor', 'Points', 'Date'],
      ...(data?.reportedEvents || []).map((item) => ['reported_event', item.title, item.creator, item.reportCount, item.updatedAt]),
      ...(data?.auditLog || []).map((item) => ['audit', item.action, item.actor, '', item.createdAt]),
      ...(data?.loyaltyTransactions || []).map((item) => ['loyalty', item.event || item.organization || item.account, item.account, item.points, item.createdAt])
    ];

    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'admin-reports.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminShell user={user} handleLogout={handleLogout} title="Rapoarte" subtitle="Statistici, audit log și export CSV">
      {error ? <div className="admin-card admin-badge-pill danger">{error}</div> : null}

      <section className="admin-grid-4">
        <div className="admin-card compact"><div className="admin-stat"><div><label>RAPORTATE</label><strong>{stats.reportedEvents || 0}</strong></div><div className="admin-stat-icon orange"><FiAlertTriangle /></div></div></div>
        <div className="admin-card compact"><div className="admin-stat"><div><label>ASCUNSE</label><strong className="admin-text red">{stats.hiddenEvents || 0}</strong></div><div className="admin-stat-icon red"><FiFileText /></div></div></div>
        <div className="admin-card compact"><div className="admin-stat"><div><label>AUDIT</label><strong className="admin-text blue">{stats.auditEntries || 0}</strong></div><div className="admin-stat-icon blue"><FiClock /></div></div></div>
        <div className="admin-card compact"><div className="admin-stat"><div><label>TRANZACȚII</label><strong className="admin-text green">{stats.loyaltyTransactions || 0}</strong></div><div className="admin-stat-icon green"><FiBarChart2 /></div></div></div>
      </section>

      <div className="admin-grid-2">
        <div className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2>Evenimente raportate</h2>
              <p className="admin-card-subtitle">Aici vezi ce trebuie moderat</p>
            </div>
            <button type="button" className="admin-secondary-button" onClick={exportCsv}><FiDownload /> Export CSV</button>
          </div>
          <div className="admin-list">
            {(data?.reportedEvents || []).map((event) => (
              <div key={event.id} className="admin-list-item">
                <div>
                  <p className="admin-list-title">{event.title}</p>
                  <p className="admin-list-subtitle">{event.organization} · {event.creator}</p>
                  <p className="admin-list-subtitle">{event.note || 'Fără notiță de moderare'}</p>
                </div>
                <div style={{ minWidth: 120, textAlign: 'right' }}>
                  <span className={`admin-pill ${event.moderationStatus === 'hidden' ? 'danger' : 'warning'}`}>{event.reportCount} raportări</span>
                  <p className="admin-list-subtitle" style={{ marginTop: 8 }}>{new Date(event.updatedAt).toLocaleString('ro-RO')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2>Audit log</h2>
              <p className="admin-card-subtitle">Urmează acțiunile făcute de admin</p>
            </div>
          </div>
          <div className="admin-list">
            {(data?.auditLog || []).map((item) => (
              <div key={item.id} className="admin-list-item">
                <div>
                  <p className="admin-list-title">{item.actor}</p>
                  <p className="admin-list-subtitle">{item.action.replaceAll('_', ' ')} · {item.entityType}</p>
                </div>
                <span className="admin-pill neutral">{new Date(item.createdAt).toLocaleString('ro-RO')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="admin-card">
        <div className="admin-card-header">
          <div>
            <h2>Tranzacții loyalty</h2>
            <p className="admin-card-subtitle">Puncte câștigate și răscumpărate</p>
          </div>
        </div>
        <div className="admin-list">
          {(data?.loyaltyTransactions || []).map((item) => (
            <div key={item.id} className="admin-list-item">
              <div>
                <p className="admin-list-title">{item.account}</p>
                <p className="admin-list-subtitle">{item.organization || item.event || 'Loyalty'}</p>
              </div>
              <span className={`admin-pill ${item.type === 'earn' ? 'success' : 'warning'}`}>{item.points} pts</span>
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
};

export default AdminReportsPage;
