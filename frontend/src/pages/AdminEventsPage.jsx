import { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiEye, FiSearch, FiSlash } from 'react-icons/fi';
import API from '../api';
import AdminShell from '../components/AdminShell';

const AdminEventsPage = ({ user, handleLogout }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await API.get('/admin/events');
        setEvents(response.data?.events || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Eroare la încărcarea evenimentelor.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'admin') {
      load();
    }
  }, [user]);

  const stats = useMemo(() => ({
    total: events.length,
    published: events.filter((item) => item.moderationStatus === 'published').length,
    blocked: events.filter((item) => item.moderationStatus === 'reported').length,
  }), [events]);

  const filtered = events.filter((item) => {
    const matchTab = activeTab === 'all' || item.moderationStatus === activeTab;
    const matchSearch = `${item.title} ${item.organization?.name || ''} ${item.creator?.name || ''}`.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const moderate = async (eventId, moderationStatus) => {
    try {
      setProcessingId(eventId);
      await API.patch(`/admin/events/${eventId}/moderation`, { moderationStatus });
      setEvents((prev) => prev.map((item) => (item.id === eventId ? { ...item, moderationStatus } : item)));
    } catch (err) {
      setError(err.response?.data?.message || 'Nu am putut actualiza moderarea.');
    } finally {
      setProcessingId('');
    }
  };

  if (loading) {
    return null;
  }

  return (
    <AdminShell user={user} handleLogout={handleLogout} title="Evenimente" subtitle="Toate evenimentele din platformă (moderare)">
      {error ? <div className="admin-card admin-badge-pill danger">{error}</div> : null}

      <section className="admin-grid-4">
        <div className="admin-card compact"><div className="admin-stat"><div><label>TOTAL</label><strong>{stats.total}</strong></div><div className="admin-stat-icon blue"><FiCalendar /></div></div></div>
        <div className="admin-card compact"><div className="admin-stat"><div><label>PUBLICE</label><strong className="admin-text green">{stats.published}</strong></div><div className="admin-stat-icon green"><FiEye /></div></div></div>
        <div className="admin-card compact"><div className="admin-stat"><div><label>BLOCATE</label><strong className="admin-text red">{stats.blocked}</strong></div><div className="admin-stat-icon red"><FiSlash /></div></div></div>
      </section>

      <div className="admin-toolbar">
        <div className="admin-tabs">
          <button type="button" className={`admin-tab${activeTab === 'all' ? ' active' : ''}`} onClick={() => setActiveTab('all')}>Toate</button>
          <button type="button" className={`admin-tab${activeTab === 'published' ? ' active' : ''}`} onClick={() => setActiveTab('published')}>Publicat</button>
          <button type="button" className={`admin-tab${activeTab === 'reported' ? ' active' : ''}`} onClick={() => setActiveTab('reported')}>Blocat</button>
        </div>
        <div className="admin-search" style={{ width: 'min(460px, 100%)' }}>
          <FiSearch className="admin-search-icon" />
          <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Caută eveniment sau organizator..." />
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Eveniment</th>
              <th>Organizator</th>
              <th>Data</th>
              <th>Ocupație</th>
              <th>Status</th>
              <th>Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((event) => (
              <tr key={event.id}>
                <td>
                  <div className="admin-row-stack">
                    <div className="admin-row-title">{event.title}</div>
                    <div className="admin-row-subtitle">{event.categories.join(', ') || 'Fără categorii'}</div>
                    <div className="admin-row-subtitle">{event.location || 'Fără locație'}</div>
                  </div>
                </td>
                <td>
                  <div className="admin-row-stack">
                    <span className="admin-row-title">{event.organization?.name || event.creator?.name || '-'}</span>
                    <span className="admin-row-subtitle">{event.creator?.email || 'Eveniment privat'}</span>
                  </div>
                </td>
                <td>{new Date(event.startDate).toLocaleDateString('ro-RO')}</td>
                <td>
                  <div className="admin-row-stack">
                    <div className="admin-row-inline" style={{ justifyContent: 'space-between' }}>
                      <span>{event.currentOccupancy}/{event.maxCapacity || 0}</span>
                      <strong>{event.occupancyRate}%</strong>
                    </div>
                    <div className="admin-progress"><span style={{ width: `${event.occupancyRate}%` }} /></div>
                  </div>
                </td>
                <td>
                  <span className={`admin-pill ${event.moderationStatus === 'reported' ? 'danger' : event.moderationStatus === 'hidden' ? 'warning' : 'success'}`}>
                    {event.moderationStatus === 'reported' ? 'Blocat' : event.moderationStatus === 'hidden' ? 'Draft' : 'Publicat'}
                  </span>
                </td>
                <td>
                  <div className="admin-actions">
                    {event.moderationStatus !== 'published' ? <button type="button" className="admin-action-button success" onClick={() => moderate(event.id, 'published')} disabled={processingId === event.id}><FiEye /> Publică</button> : null}
                    {event.moderationStatus !== 'reported' ? <button type="button" className="admin-action-button danger" onClick={() => moderate(event.id, 'reported')} disabled={processingId === event.id}><FiSlash /> Blochează</button> : null}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? <tr><td colSpan="6" className="admin-table-empty">Niciun eveniment pentru filtrul selectat.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
};

export default AdminEventsPage;
