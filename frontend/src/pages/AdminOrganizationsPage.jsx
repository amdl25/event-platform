import { useEffect, useMemo, useState } from 'react';
import { FiMail, FiMapPin, FiPhone, FiShield } from 'react-icons/fi';
import API from '../api';
import AdminShell from '../components/AdminShell';

const AdminOrganizationsPage = ({ user, handleLogout }) => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [processingId, setProcessingId] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await API.get('/admin/organizations');
        setOrganizations(response.data?.organizations || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Eroare la încărcarea organizatorilor.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'admin') {
      load();
    }
  }, [user]);

  const stats = useMemo(() => ({
    total: organizations.length,
    active: organizations.filter((item) => item.adminStatus === 'active').length,
    suspended: organizations.filter((item) => item.adminStatus === 'suspended').length,
    pending: organizations.filter((item) => item.verificationStatus === 'pending').length
  }), [organizations]);

  const subtitle = `${stats.total} organizatori înregistrați`;

  const filteredOrganizations = organizations.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return item.adminStatus === 'active';
    if (activeTab === 'suspended') return item.adminStatus === 'suspended';
    if (activeTab === 'pending') return item.verificationStatus === 'pending';
    return true;
  });

  const toggleStatus = async (organizationId, adminStatus) => {
    try {
      setProcessingId(organizationId);
      await API.patch(`/admin/organizations/${organizationId}/status`, { adminStatus });
      setOrganizations((prev) => prev.map((item) => (item.id === organizationId ? { ...item, adminStatus } : item)));
    } catch (err) {
      setError(err.response?.data?.message || 'Nu am putut actualiza statusul.');
    } finally {
      setProcessingId('');
    }
  };

  if (loading) {
    return <AdminShell user={user} handleLogout={handleLogout} title="Organizatori" subtitle="Se încarcă organizatorii..." ><div className="admin-card">Se încarcă...</div></AdminShell>;
  }

  return (
    <AdminShell user={user} handleLogout={handleLogout} title="Organizatori" subtitle={subtitle}>
      {error ? <div className="admin-card admin-badge-pill danger">{error}</div> : null}

      <section className="admin-grid-4">
        <div className="admin-card compact">
          <div className="admin-stat">
            <div><label>TOTAL ORGANIZAȚII</label><strong>{stats.total}</strong></div>
            <div className="admin-stat-icon blue"><FiShield /></div>
          </div>
        </div>
        <div className="admin-card compact">
          <div className="admin-stat">
            <div><label>ACTIVE</label><strong className="admin-text green">{stats.active}</strong></div>
            <div className="admin-stat-icon green"><FiShield /></div>
          </div>
        </div>
        <div className="admin-card compact">
          <div className="admin-stat">
            <div><label>SUSPENDATE</label><strong className="admin-text red">{stats.suspended}</strong></div>
            <div className="admin-stat-icon red"><FiShield /></div>
          </div>
        </div>
        <div className="admin-card compact">
          <div className="admin-stat">
            <div><label>ÎN AȘTEPTARE</label><strong className="admin-text orange">{stats.pending}</strong></div>
            <div className="admin-stat-icon orange"><FiShield /></div>
          </div>
        </div>
      </section>

      <div className="admin-toolbar">
        <div className="admin-tabs">
          <button type="button" className={`admin-tab${activeTab === 'all' ? ' active' : ''}`} onClick={() => setActiveTab('all')}>Toate</button>
          <button type="button" className={`admin-tab${activeTab === 'active' ? ' active' : ''}`} onClick={() => setActiveTab('active')}>Active</button>
          <button type="button" className={`admin-tab${activeTab === 'pending' ? ' active' : ''}`} onClick={() => setActiveTab('pending')}>În așteptare</button>
          <button type="button" className={`admin-tab${activeTab === 'suspended' ? ' active' : ''}`} onClick={() => setActiveTab('suspended')}>Suspendate</button>
        </div>
      </div>

      <section className="admin-grid-4" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        {filteredOrganizations.map((organization) => (
          <article key={organization.id} className="admin-card">
            <div className="admin-card-header">
              <div className="admin-row-inline">
                <div className="admin-avatar-soft">{organization.name.slice(0, 2).toUpperCase()}</div>
                <div>
                  <h3>{organization.name}</h3>
                  <p className="admin-card-subtitle">{organization.owner?.name || 'Fără owner'}</p>
                </div>
              </div>
              <span className={`admin-pill ${organization.adminStatus === 'active' ? 'success' : 'danger'}`}>
                {organization.adminStatus === 'active' ? 'Activ' : 'Suspendat'}
              </span>
            </div>

            <div className="admin-row-stack">
              <div className="admin-row-inline"><FiMail /> <span className="admin-row-subtitle">{organization.owner?.email || '-'}</span></div>
              <div className="admin-row-inline"><FiMapPin /> <span className="admin-row-subtitle">{organization.registeredAddress || 'Adresă lipsă'}</span></div>
              <div className="admin-row-inline"><FiPhone /> <span className="admin-row-subtitle">{organization.officialPhone || 'Telefon lipsă'}</span></div>
            </div>

            <div className="admin-section-spacing">
              <div className="admin-row-inline" style={{ justifyContent: 'space-between' }}>
                <span className="admin-row-subtitle">Evenimente</span>
                <strong>{organization.totalEvents}</strong>
              </div>
              <div className="admin-row-inline" style={{ justifyContent: 'space-between' }}>
                <span className="admin-row-subtitle">Participanți</span>
                <strong>{organization.totalParticipants}</strong>
              </div>
              <div className="admin-row-inline" style={{ justifyContent: 'space-between' }}>
                <span className="admin-row-subtitle">Rată ocupare</span>
                <strong>{organization.attendanceRate}%</strong>
              </div>
            </div>

            <div className="admin-actions admin-section-spacing">
              {organization.adminStatus === 'active' ? (
                <button
                  type="button"
                  className="admin-action-button danger"
                  disabled={processingId === organization.id}
                  onClick={() => toggleStatus(organization.id, 'suspended')}
                >
                  Suspendă
                </button>
              ) : (
                <button
                  type="button"
                  className="admin-action-button success"
                  disabled={processingId === organization.id}
                  onClick={() => toggleStatus(organization.id, 'active')}
                >
                  Activează
                </button>
              )}
              <span className="admin-pill neutral">{organization.verificationStatus}</span>
            </div>
          </article>
        ))}
      </section>

      {filteredOrganizations.length === 0 ? <div className="admin-card admin-table-empty">Nu există organizații pentru filtrul selectat.</div> : null}
    </AdminShell>
  );
};

export default AdminOrganizationsPage;
