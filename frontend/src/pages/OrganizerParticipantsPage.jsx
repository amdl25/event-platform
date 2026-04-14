import { useEffect, useMemo, useState } from 'react';
import { FiAward, FiCheckCircle, FiClock, FiSearch, FiUser } from 'react-icons/fi';
import API from '../api';
import OrganizerShell from '../components/OrganizerShell';

const OrganizerParticipantsPage = ({ user, handleLogout }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [participants, setParticipants] = useState([]);
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await API.get('/organizer/participants');
        setParticipants(response.data?.participants || []);
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
    total: participants.length,
    checkedIn: participants.filter((item) => item.checkIn).length,
    points: participants.reduce((sum, item) => sum + Number(item.points || 0), 0)
  }), [participants]);

  const filteredParticipants = participants.filter((item) => {
    const haystack = `${item.name} ${item.email} ${item.eventTitle}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const toggleCheckIn = async (participationId) => {
    try {
      setProcessingId(participationId);
      const response = await API.patch(`/organizer/participants/${participationId}/check-in`);
      setParticipants((prev) => prev.map((item) => (
        item.id === participationId
          ? { ...item, checkIn: response.data?.status === 'checked-in', status: response.data?.status, points: Number(response.data?.points || 0) }
          : item
      )));
    } catch (err) {
      setError(err.response?.data?.message || 'Nu am putut actualiza check-in-ul.');
    } finally {
      setProcessingId('');
    }
  };

  const actions = (
    <span className="organizer-badge-pill warning">
      <FiClock /> {stats.total} participanți
    </span>
  );

  if (loading) {
    return <OrganizerShell user={user} handleLogout={handleLogout} title="Participanți" subtitle="Se încarcă participanții..." actions={actions}><div className="organizer-card">Se încarcă...</div></OrganizerShell>;
  }

  return (
    <OrganizerShell user={user} handleLogout={handleLogout} title="Participanți" subtitle="Gestionează check-in-ul și punctele participanților" actions={actions}>
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
            <label>CHECK-IN REALIZAT</label>
            <h3 className="text-green">{stats.checkedIn}</h3>
          </div>
          <div className="organizer-stat-icon icon-green"><FiCheckCircle /></div>
        </div>
        <div className="organizer-stat-card">
          <div className="organizer-stat-info">
            <label>PUNCTE ACORDATE</label>
            <h3 className="text-orange">{stats.points}</h3>
          </div>
          <div className="organizer-stat-icon icon-orange"><FiAward /></div>
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
              <th>Înscris la</th>
              <th>Check-in</th>
              <th>Puncte</th>
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
                <td><span className="organizer-row-subtitle">{new Date(participant.registeredAt).toLocaleDateString('ro-RO')}</span></td>
                <td>
                  <button
                    type="button"
                    className={`organizer-checkin-button ${participant.checkIn ? 'success' : 'danger'}`}
                    disabled={processingId === participant.id}
                    onClick={() => toggleCheckIn(participant.id)}
                  >
                    {participant.checkIn ? 'Da' : 'Nu'}
                  </button>
                </td>
                <td><strong>{participant.points}</strong></td>
              </tr>
            ))}
            {filteredParticipants.length === 0 ? <tr><td colSpan="5" className="organizer-table-empty">Nu există participanți pentru filtrul selectat.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </OrganizerShell>
  );
};

export default OrganizerParticipantsPage;
