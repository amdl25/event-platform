import { useEffect, useMemo, useState } from 'react';
import { FiDollarSign, FiRefreshCw, FiUserCheck, FiUsers } from 'react-icons/fi';
import API from '../api';
import OrganizerShell from '../components/OrganizerShell';

const formatEventDateTime = (dateValue) => {
  if (!dateValue) return 'Data nespecificată';
  const date = new Date(dateValue);
  const datePart = date.toLocaleDateString('sv-SE');
  const timePart = date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
};

const OrganizerOverviewPage = ({ user, handleLogout }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await API.get('/organizer/dashboard');
        setSummary(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Eroare la încărcarea dashboard-ului organizatorului.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'organizer') {
      load();
    }
  }, [user]);

  const stats = summary?.stats || {};
  const events = summary?.events || [];
  const transactions = summary?.transactions || [];

  const formatMoney = (value) => `${Number(value || 0).toFixed(0)} RON`;

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return [...events]
      .filter((event) => event.startDate && new Date(event.startDate) >= now)
      .sort((left, right) => new Date(left.startDate) - new Date(right.startDate))
      .slice(0, 5);
  }, [events]);

  const recentTransactions = useMemo(() => transactions.slice(0, 6), [transactions]);

  if (loading) {
    return <OrganizerShell user={user} handleLogout={handleLogout} title="Dashboard" subtitle="Se încarcă..."><div className="organizer-card">Se încarcă dashboard-ul...</div></OrganizerShell>;
  }

  return (
    <OrganizerShell user={user} handleLogout={handleLogout} title="Dashboard" subtitle="Bine ai venit. Aici vezi veniturile, biletele și tranzacțiile din platformă.">
      {error ? <div className="organizer-alert error">{error}</div> : null}

      <section className="organizer-stat-grid organizer-section-spacing" style={{ marginTop: 0 }}>
        <div className="organizer-stat-card">
          <div className="organizer-stat-info">
            <label>VENITURI TOTALE</label>
            <h3>{formatMoney(stats.totalRevenue)}</h3>
          </div>
          <div className="organizer-stat-icon icon-orange"><FiDollarSign /></div>
        </div>
        <div className="organizer-stat-card">
          <div className="organizer-stat-info">
            <label>BILETE VÂNDUTE</label>
            <h3 className="text-green">{stats.soldTickets || 0}</h3>
          </div>
          <div className="organizer-stat-icon icon-green"><FiUserCheck /></div>
        </div>
        <div className="organizer-stat-card">
          <div className="organizer-stat-info">
            <label>RESTITUIRI / PENDING</label>
            <h3 className="text-blue">{stats.pendingReturns || 0}</h3>
          </div>
          <div className="organizer-stat-icon icon-blue"><FiRefreshCw /></div>
        </div>
        <div className="organizer-stat-card">
          <div className="organizer-stat-info">
            <label>PARTICIPANȚI</label>
            <h3 className="text-orange">{stats.totalParticipants || 0}</h3>
          </div>
          <div className="organizer-stat-icon icon-orange"><FiUsers /></div>
        </div>
      </section>

      <section className="organizer-live-grid organizer-live-grid-dashboard organizer-section-spacing">
        <div className="organizer-card organizer-transactions-mini">
          <div className="panel-header">
            <div>
              <h2>Tranzacții recente</h2>
            </div>
          </div>

          <div className="organizer-mini-table-wrap">
            <table className="organizer-mini-table">
              <thead>
                <tr>
                  <th>Nume utilizator</th>
                  <th>Sumă</th>
                  <th>Eveniment</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="organizer-mini-table-empty">Nu există tranzacții.</td>
                  </tr>
                ) : null}
                {recentTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.participant}</td>
                    <td className={transaction.amount < 0 ? 'danger' : 'success'}>{transaction.amount < 0 ? '-' : ''}{formatMoney(Math.abs(transaction.amount))}</td>
                    <td>{transaction.eventTitle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="organizer-card organizer-events-live organizer-events-live-wide">
          <div className="panel-header">
            <div>
              <h2>Evenimente viitoare</h2>
            </div>
          </div>

          <div className="organizer-events-live-list">
            {upcomingEvents.length === 0 ? <div className="organizer-empty">Nu există evenimente viitoare.</div> : null}
            {upcomingEvents.map((event, index) => {
              const occupancy = Number(event.occupancy || 0);
              const capacity = Number(event.capacity || 0);
              const progress = capacity > 0 ? Math.round((occupancy / capacity) * 100) : 0;
              return (
                <article key={event.id} className="organizer-events-live-item">
                  <div className="organizer-events-live-head">
                    <div className="organizer-events-live-main">
                      <div className={`organizer-upcoming-accent color-${index % 5}`} />
                      <div>
                        <h4>{event.title}</h4>
                        <p>{formatEventDateTime(event.startDate)}</p>
                      </div>
                    </div>
                    <div className="organizer-events-live-side">
                      <strong>{occupancy}/{capacity || '∞'}</strong>
                      <span className="status-tag published">Publicat</span>
                    </div>
                  </div>
                  <div className="progress-bg"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </OrganizerShell>
  );
};

export default OrganizerOverviewPage;
