import React, { useEffect, useState } from 'react';
import { FiTrendingUp, FiDollarSign, FiUsers, FiCalendar, FiAward } from 'react-icons/fi';
import API from '../api';
import OrganizerShell from '../components/OrganizerShell';
import '../styles/OrganizerAnalytics.css';

const fmt = (n) => Number(n || 0).toLocaleString('ro-RO');
const fmtRon = (n) => `${Number(n || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`;

const fmtDate = (dateStr) => {
  if (!dateStr) return '–';
  return new Date(dateStr).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtRelative = (dateStr) => {
  if (!dateStr) return '–';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Acum';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}z`;
};

const StatCard = ({ icon: Icon, label, value, sub, accent }) => (
  <div className={`oa-stat-card${accent ? ' accent' : ''}`}>
    <div className="oa-stat-icon"><Icon /></div>
    <div className="oa-stat-body">
      <p className="oa-stat-value">{value}</p>
      <p className="oa-stat-label">{label}</p>
      {sub && <p className="oa-stat-sub">{sub}</p>}
    </div>
  </div>
);

const OrganizerAnalyticsPage = ({ user, handleLogout }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, notifRes] = await Promise.all([
          API.get('/organizer/dashboard'),
          API.get('/organizer/notifications').catch(() => ({ data: { notifications: [] } }))
        ]);
        setData(dashRes.data);
        setNotifications(notifRes.data?.notifications || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Nu am putut încărca datele.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = data?.stats || {};
  const events = data?.events || [];
  const transactions = data?.transactions || [];

  return (
    <OrganizerShell
      user={user}
      handleLogout={handleLogout}
      title="Analytics"
      subtitle="Performanța evenimentelor tale"
      notifications={notifications}
    >
      {loading ? (
        <div className="oa-loading">Se încarcă...</div>
      ) : error ? (
        <div className="oa-error">{error}</div>
      ) : (
        <div className="oa-content">

          <div className="oa-stats-grid">
            <StatCard
              icon={FiDollarSign}
              label="Revenue total"
              value={fmtRon(stats.totalRevenue)}
              accent
            />
            <StatCard
              icon={FiUsers}
              label="Participanți totali"
              value={fmt(stats.totalParticipants)}
              sub={`${fmt(stats.soldTickets)} bilete vândute`}
            />
            <StatCard
              icon={FiCalendar}
              label="Evenimente active"
              value={fmt(stats.activeEvents)}
              sub={`din ${fmt(stats.totalEvents)} totale`}
            />
            <StatCard
              icon={FiAward}
              label="Puncte acordate"
              value={fmt(stats.pointsAwarded)}
              sub="prin check-in"
            />
          </div>

          <div className="oa-grid-2col">

            <div className="oa-panel">
              <h2 className="oa-panel-title">Performanță evenimente</h2>
              {events.length === 0 ? (
                <p className="oa-empty">Niciun eveniment creat încă.</p>
              ) : (
                <div className="oa-table-wrap">
                  <table className="oa-table">
                    <thead>
                      <tr>
                        <th>Eveniment</th>
                        <th>Data</th>
                        <th>Ocupare</th>
                        <th>Revenue</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((ev) => (
                        <tr key={ev.id}>
                          <td className="oa-td-title">{ev.title}</td>
                          <td className="oa-td-muted">{fmtDate(ev.startDate)}</td>
                          <td>
                            <div className="oa-occupancy-wrap">
                              <div className="oa-occupancy-bar">
                                <div
                                  className="oa-occupancy-fill"
                                  style={{ width: `${ev.progress}%` }}
                                />
                              </div>
                              <span className="oa-occupancy-label">
                                {ev.occupancy}/{ev.capacity}
                              </span>
                            </div>
                          </td>
                          <td className="oa-td-money">
                            {fmtRon(ev.occupancy * ev.price)}
                          </td>
                          <td>
                            <span className={`oa-status oa-status--${ev.status.className}`}>
                              {ev.status.label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="oa-panel">
              <h2 className="oa-panel-title">Tranzacții recente</h2>
              {transactions.length === 0 ? (
                <p className="oa-empty">Nicio tranzacție înregistrată.</p>
              ) : (
                <ul className="oa-transactions">
                  {transactions.map((tx) => (
                    <li key={tx.id} className="oa-tx">
                      <div className="oa-tx-left">
                        <p className="oa-tx-name">{tx.participant}</p>
                        <p className="oa-tx-event">{tx.eventTitle}</p>
                      </div>
                      <div className="oa-tx-right">
                        <p className={`oa-tx-amount${tx.amount < 0 ? ' negative' : ''}`}>
                          {tx.amount < 0 ? '–' : '+'}{fmtRon(Math.abs(tx.amount))}
                        </p>
                        <p className="oa-tx-time">{fmtRelative(tx.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        </div>
      )}
    </OrganizerShell>
  );
};

export default OrganizerAnalyticsPage;
