import { useEffect, useMemo, useState } from 'react';
import { FiAward, FiClock, FiSearch, FiTrendingUp, FiUser } from 'react-icons/fi';
import API from '../api';
import OrganizerShell from '../components/OrganizerShell';

const OrganizerParticipantsPage = ({ user, handleLogout }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [participants, setParticipants] = useState([]);
  const [search, setSearch] = useState('');
  const [summaryStats, setSummaryStats] = useState({ totalParticipants: 0, pointsAwarded: 0, topEventTitle: '-' });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await API.get('/organizer/participants');
        setParticipants(response.data?.participants || []);
        setSummaryStats({
          totalParticipants: Number(response.data?.stats?.totalParticipants || 0),
          pointsAwarded: Number(response.data?.stats?.pointsAwarded || 0),
          topEventTitle: response.data?.stats?.topEventTitle || '-'
        });
      } catch (err) {
        setError(err.response?.data?.message || 'Eroare la încărcarea participanților.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'organizer') {
      load();
    }
  }, [user]);

  const stats = useMemo(() => ({
    total: Number(summaryStats.totalParticipants || 0),
    points: Number(summaryStats.pointsAwarded || 0),
    topEventTitle: summaryStats.topEventTitle || '-'
  }), [summaryStats]);

  const filteredParticipants = participants.filter((item) => {
    const haystack = `${item.name} ${item.email} ${item.eventTitle}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const actions = (
    <span className="organizer-badge-pill warning">
      <FiClock /> {stats.total} participanți
    </span>
  );

  if (loading) {
    return null;
  }

  return (
    <OrganizerShell user={user} handleLogout={handleLogout} title="Participanți" subtitle="Urmărește oamenii, loialitatea și performanța evenimentelor" actions={actions}>
      {error ? <div className="organizer-alert error">{error}</div> : null}

      <section className="organizer-stat-grid organizer-section-spacing" style={{ marginTop: 0 }}>
        <div className="organizer-stat-card">
          <div className="organizer-stat-info">
            <label>TOTAL PARTICIPANȚI</label>
            <h3>{stats.total}</h3>
          </div>
          <div className="organizer-stat-icon icon-blue"><FiUser /></div>
        </div>
        <div className="organizer-stat-card">
          <div className="organizer-stat-info">
            <label>PUNCTE ACORDATE</label>
            <h3 className="text-green">{stats.points}</h3>
          </div>
          <div className="organizer-stat-icon icon-green"><FiAward /></div>
        </div>
        <div className="organizer-stat-card">
          <div className="organizer-stat-info">
            <label>TOP EVENIMENT</label>
            <h3 className="text-orange" title={stats.topEventTitle}>{stats.topEventTitle}</h3>
          </div>
          <div className="organizer-stat-icon icon-orange"><FiTrendingUp /></div>
        </div>
      </section>

      <div className="organizer-toolbar organizer-section-spacing">
        <div className="organizer-search organizer-search-wide">
          <FiSearch className="organizer-search-icon" />
          <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Caută participant, email sau eveniment..." />
        </div>
      </div>

      <div className="organizer-table-wrap">
        <table className="organizer-table">
          <thead>
            <tr>
              <th>Participant</th>
              <th>Eveniment</th>
              <th>Puncte Primite</th>
            </tr>
          </thead>
          <tbody>
            {filteredParticipants.map((participant) => (
              <tr key={participant.id}>
                <td>
                  <div className="organizer-row-inline">
                    <div className="organizer-avatar-soft">{participant.name.slice(0, 2).toUpperCase()}</div>
                    <div>
                      <p className="organizer-row-title">{participant.name}</p>
                      <p className="organizer-row-subtitle">{participant.email}</p>
                    </div>
                  </div>
                </td>
                <td>{participant.eventTitle}</td>
                <td><strong>{participant.points}</strong></td>
              </tr>
            ))}
            {filteredParticipants.length === 0 ? <tr><td colSpan="3" className="organizer-table-empty">Nu există participanți pentru filtrul selectat.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </OrganizerShell>
  );
};

export default OrganizerParticipantsPage;
