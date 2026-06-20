import { useEffect, useMemo, useState } from 'react';
import { FiAward, FiCalendar, FiSearch, FiUser } from 'react-icons/fi';
import API from '../api';
import AdminShell from '../components/AdminShell';

const AdminParticipantsPage = ({ user, handleLogout }) => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [revealedEmails, setRevealedEmails] = useState(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await API.get('/admin/participants');
        setParticipants(response.data?.participants || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Eroare la încărcarea participanților.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'admin') {
      load();
    }
  }, [user]);

  const stats = useMemo(() => ({
    total: participants.length,
    active: participants.filter((item) => item.status === 'active').length,
    points: participants.reduce((sum, item) => sum + Number(item.points || 0), 0),
    events: participants.reduce((sum, item) => sum + Number(item.totalEvents || 0), 0)
  }), [participants]);

  const subtitle = `${stats.total} utilizatori înregistrați`;

  const filtered = participants.filter((item) => {
    const haystack = `${item.name} ${item.email}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  if (loading) {
    return null;
  }

  return (
    <AdminShell user={user} handleLogout={handleLogout} title="Participanți" subtitle={subtitle}>
      {error ? <div className="admin-card admin-badge-pill danger">{error}</div> : null}

      <section className="admin-grid-4">
        <div className="admin-card compact">
          <div className="admin-stat"><div><label>UTILIZATORI</label><strong>{stats.total}</strong></div><div className="admin-stat-icon blue"><FiUser /></div></div>
        </div>
        <div className="admin-card compact">
          <div className="admin-stat"><div><label>ACTIVI</label><strong className="admin-text green">{stats.active}</strong></div><div className="admin-stat-icon green"><FiUser /></div></div>
        </div>
        <div className="admin-card compact">
          <div className="admin-stat"><div><label>PUNCTE TOTAL</label><strong className="admin-text orange">{stats.points}</strong></div><div className="admin-stat-icon orange"><FiAward /></div></div>
        </div>
        <div className="admin-card compact">
          <div className="admin-stat"><div><label>PARTICIPĂRI</label><strong className="admin-text purple">{stats.events}</strong></div><div className="admin-stat-icon purple"><FiCalendar /></div></div>
        </div>
      </section>

      <div className="admin-toolbar">
        <div className="admin-search" style={{ width: 'min(420px, 100%)' }}>
          <FiSearch className="admin-search-icon" />
          <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Caută participanți..." />
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nume</th>
              <th>Email</th>
              <th>Puncte</th>
              <th>Evenimente</th>
              <th>Înscris</th>
              <th>Ultimă activitate</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((participant) => {
              const [localPart, domain] = participant.email.split('@');
              const maskedEmail = `${localPart[0]}***@${domain}`;
              const revealed = revealedEmails.has(participant.id);
              const toggleEmail = () => setRevealedEmails((prev) => {
                const next = new Set(prev);
                if (next.has(participant.id)) next.delete(participant.id);
                else next.add(participant.id);
                return next;
              });
              return (
                <tr key={participant.id}>
                  <td>
                    <div className="admin-row-inline">
                      <div className="admin-avatar-soft">{participant.name.slice(0, 2).toUpperCase()}</div>
                      <p className="admin-row-title">{participant.name}</p>
                    </div>
                  </td>
                  <td>
                    <button type="button" className="admin-email-reveal" onClick={toggleEmail} title={revealed ? 'Ascunde email' : 'Afișează email complet'}>
                      {revealed ? participant.email : maskedEmail}
                    </button>
                  </td>
                  <td><span className="admin-pill warning"><FiAward /> {participant.points}</span></td>
                  <td>{participant.totalEvents}</td>
                  <td>{new Date(participant.joinedAt).toLocaleDateString('ro-RO')}</td>
                  <td>{new Date(participant.lastActivity).toLocaleDateString('ro-RO')}</td>
                </tr>
              );
            })}
            {filtered.length === 0 ? <tr><td colSpan="6" className="admin-table-empty">Niciun participant găsit.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
};

export default AdminParticipantsPage;
