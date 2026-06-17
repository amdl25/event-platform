import { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiClock, FiUsers } from 'react-icons/fi';
import API from '../api';
import AdminShell from '../components/AdminShell';

const colors = ['#2563eb', '#14b8a6', '#f59e0b', '#8b5cf6', '#ea5a36', '#10b981'];

const donutSegments = (items) => {
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (!total) return [];

  let start = 0;
  return items.map((item, index) => {
    const percent = Number(item.value || 0) / total;
    const end = start + percent * 360;
    const segment = {
      color: colors[index % colors.length],
      start,
      end,
      name: item.name,
      value: item.value,
      percent: item.percent
    };
    start = end;
    return segment;
  });
};

const buildTimelineData = (registrations, eventsCreated) => {
  const timeline = new Map();
  const orderedLabels = [];

  registrations.forEach((item, index) => {
    const label = item.label || item.key || `Ziua ${index + 1}`;
    const key = item.key || label;

    if (!timeline.has(key)) {
      orderedLabels.push(key);
    }

    timeline.set(key, {
      key,
      label,
      users: Number(item.value || 0),
      events: 0,
    });
  });

  eventsCreated.forEach((item, index) => {
    const label = item.label || item.key || `Ziua ${index + 1}`;
    const key = item.key || label;
    const current = timeline.get(key);

    if (!current) {
      orderedLabels.push(key);
      timeline.set(key, {
        key,
        label,
        users: 0,
        events: Number(item.value || 0),
      });
      return;
    }

    timeline.set(key, {
      ...current,
      events: Number(item.value || 0),
    });
  });

  return orderedLabels.map((key) => timeline.get(key)).filter(Boolean);
};

const formatChartValue = (value) => (Number(value || 0) > 0 ? Number(value || 0) : 0);

const ChartTooltip = ({ item }) => {
  if (!item) return null;

  return (
    <div className="admin-chart-tooltip">
      <strong>{item.label}</strong>
      <div className="admin-chart-tooltip-row">
        <span className="admin-chart-tooltip-dot" style={{ background: '#2563eb' }} />
        <span>Utilizatori</span>
        <strong>{formatChartValue(item.users)}</strong>
      </div>
      <div className="admin-chart-tooltip-row">
        <span className="admin-chart-tooltip-dot" style={{ background: '#8b5cf6' }} />
        <span>Evenimente</span>
        <strong>{formatChartValue(item.events)}</strong>
      </div>
    </div>
  );
};

const shouldShowChartLabel = (index, total) => (
  total <= 8 || index === 0 || index === total - 1 || index % 4 === 0
);

const AdminDashboardPage = ({ user, handleLogout }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await API.get('/admin/dashboard');
        setSummary(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Eroare la încărcarea dashboard-ului.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'admin') {
      load();
    }
  }, [user]);

  const chartData = useMemo(() => summary?.charts?.registrations || [], [summary]);
  const eventChartData = useMemo(() => summary?.charts?.eventsCreated || [], [summary]);
  const categories = useMemo(() => summary?.charts?.categories || [], [summary]);
  const topEvents = useMemo(() => summary?.topEvents || [], [summary]);
  const donutSegmentsList = useMemo(() => donutSegments(categories.slice(0, 5)), [categories]);
  const timelineData = useMemo(() => buildTimelineData(chartData, eventChartData), [chartData, eventChartData]);
  const chartMaxValue = useMemo(() => Math.max(1, ...timelineData.flatMap((item) => [Number(item.users || 0), Number(item.events || 0)])), [timelineData]);
  const donutStops = useMemo(() => {
    if (!donutSegmentsList.length) {
      return 'radial-gradient(circle at center, #f3f4f6 0 62%, transparent 62% 100%)';
    }

    const stops = [];
    donutSegmentsList.forEach((segment) => {
      stops.push(`${segment.color} ${segment.start}deg ${segment.end}deg`);
    });

    return `conic-gradient(${stops.join(', ')})`;
  }, [donutSegmentsList]);

  const actions = null;

  if (loading) {
    return null;
  }

  const chartWidth = 760;
  const chartHeight = 320;
  const chartPadding = { top: 24, right: 20, bottom: 62, left: 20 };
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const groupCount = Math.max(timelineData.length, 1);
  const groupWidth = plotWidth / groupCount;
  const barWidth = Math.min(24, Math.max(10, groupWidth * 0.28));
  const barGap = Math.max(8, groupWidth * 0.1);

  const chartGridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    y: chartPadding.top + plotHeight - (plotHeight * ratio),
    label: Math.round(chartMaxValue * ratio)
  }));

  return (
    <AdminShell
      user={user}
      handleLogout={handleLogout}
      title="Dashboard"
      subtitle="Privire de ansamblu asupra platformei"
      actions={actions}
      notificationsCount={summary?.stats?.notificationsCount || 0}
      notifications={summary?.notifications || []}
    >
      {error ? <div className="admin-card admin-badge-pill danger">{error}</div> : null}

      <section className="admin-grid-4 admin-section-spacing" style={{ marginTop: 0 }}>
        <div className="admin-card">
          <div className="admin-stat">
            <div>
              <label>UTILIZATORI NOI</label>
              <strong>{summary?.stats?.newUsersThisMonth || 0}</strong>
            </div>
            <div className="admin-stat-icon blue"><FiUsers /></div>
          </div>
        </div>
        <div className="admin-card">
          <div className="admin-stat">
            <div>
              <label>ORGANIZATORI ACTIVI</label>
              <strong>{summary?.stats?.activeOrganizers || 0}</strong>
            </div>
            <div className="admin-stat-icon green"><FiUsers /></div>
          </div>
        </div>
        <div className="admin-card">
          <div className="admin-stat">
            <div>
              <label>EVENIMENTE ACTIVE</label>
              <strong>{summary?.stats?.activeEvents || 0}</strong>
            </div>
            <div className="admin-stat-icon purple"><FiCalendar /></div>
          </div>
        </div>
        <div className="admin-card">
          <div className="admin-stat">
            <div>
              <label>CERERI ÎN AȘTEPTARE</label>
              <strong className="admin-text orange">{summary?.stats?.pendingRequests || 0}</strong>
            </div>
            <div className="admin-stat-icon orange"><FiClock /></div>
          </div>
        </div>
      </section>

      <section className="admin-grid-2">
        <div className="admin-card admin-chart-shell">
          <div className="admin-card-header">
            <div>
              <h2>Înregistrări noi (ultimele 30 zile)</h2>
              <p className="admin-card-subtitle">Bar chart comparativ pentru utilizatori și evenimente create</p>
            </div>
          </div>
          <div className="admin-bar-chart-wrap">
            {timelineData.length > 0 ? (
              <>
                <div className="admin-chart-legend" aria-label="Legenda graficului">
                  <span><i className="admin-chart-legend-dot users" /> Utilizatori</span>
                  <span><i className="admin-chart-legend-dot events" /> Evenimente</span>
                </div>
                <div className="admin-bar-chart-frame" onMouseLeave={() => setHoveredIndex(null)}>
                  <svg className="admin-bar-chart-svg" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Înregistrări noi pe ultimele 30 zile">
                    <defs>
                      <linearGradient id="admin-users-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.72} />
                      </linearGradient>
                      <linearGradient id="admin-events-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#c084fc" stopOpacity={0.72} />
                      </linearGradient>
                    </defs>

                    {chartGridLines.map((line) => (
                      <g key={line.y}>
                        <line x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={line.y} y2={line.y} className="admin-chart-grid" />
                        <text x={chartPadding.left - 8} y={line.y + 4} textAnchor="end" className="admin-chart-y-label">{line.label}</text>
                      </g>
                    ))}

                    <line x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={chartHeight - chartPadding.bottom} y2={chartHeight - chartPadding.bottom} className="admin-chart-axis" />

                    {timelineData.map((item, index) => {
                      const groupX = chartPadding.left + (index * groupWidth) + (groupWidth / 2);
                      const usersHeight = (Number(item.users || 0) / chartMaxValue) * plotHeight;
                      const eventsHeight = (Number(item.events || 0) / chartMaxValue) * plotHeight;
                      const usersX = groupX - barWidth - (barGap / 2);
                      const eventsX = groupX + (barGap / 2);
                      const usersY = chartPadding.top + plotHeight - usersHeight;
                      const eventsY = chartPadding.top + plotHeight - eventsHeight;
                      const isHovered = hoveredIndex === index;

                      return (
                        <g
                          key={item.key}
                          onMouseEnter={() => setHoveredIndex(index)}
                          onFocus={() => setHoveredIndex(index)}
                          tabIndex={0}
                          role="img"
                          aria-label={`${item.label}: utilizatori ${item.users || 0}, evenimente ${item.events || 0}`}
                        >
                          <rect
                            x={usersX}
                            y={usersY}
                            width={barWidth}
                            height={Math.max(usersHeight, 0)}
                            rx="8"
                            fill="url(#admin-users-fill)"
                            className={`admin-chart-bar users${isHovered ? ' hovered' : ''}`}
                          />
                          <rect
                            x={eventsX}
                            y={eventsY}
                            width={barWidth}
                            height={Math.max(eventsHeight, 0)}
                            rx="8"
                            fill="url(#admin-events-fill)"
                            className={`admin-chart-bar events${isHovered ? ' hovered' : ''}`}
                          />
                          {shouldShowChartLabel(index, timelineData.length) ? (
                            <text
                              x={groupX}
                              y={chartHeight - 16}
                              textAnchor="middle"
                              className="admin-chart-x-label"
                              transform={`rotate(-35 ${groupX} ${chartHeight - 16})`}
                            >
                              {item.label}
                            </text>
                          ) : null}
                        </g>
                      );
                    })}
                  </svg>

                  {hoveredIndex !== null ? (
                    <div className="admin-chart-float" style={{ left: `${Math.min(82, ((hoveredIndex + 1) / groupCount) * 100)}%` }}>
                      <ChartTooltip item={timelineData[hoveredIndex]} />
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="admin-chart-empty">Nu există suficiente date pentru graficul din ultimele 30 de zile.</div>
            )}
          </div>
        </div>

        <div className="admin-card admin-chart-shell">
          <div className="admin-card-header">
            <div>
              <h2>Evenimente pe categorii</h2>
            </div>
          </div>
          <div className="admin-donut">
            <div className="admin-donut-svg" style={{ background: donutStops }}>
              <div className="admin-donut-hole" />
            </div>
            <div className="admin-legend">
              {categories.slice(0, 5).map((item, index) => (
                <div key={item.id} className="admin-legend-item">
                  <div className="admin-legend-left">
                    <span className="admin-legend-dot" style={{ background: colors[index % colors.length] }} />
                    <span>{item.name}</span>
                  </div>
                  <strong>{item.percent || 0}%</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="admin-grid-2 admin-grid-2-top-events">
        <div className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2>Top evenimente</h2>
              <p className="admin-card-subtitle">Cele mai populare după participanți</p>
            </div>
          </div>
          <div className="admin-list">
            {topEvents.map((event) => (
              <div key={event.id} className="admin-list-item">
                <div>
                  <p className="admin-list-title">{event.rank}. {event.title}</p>
                  <p className="admin-list-subtitle">{event.host}{event.categories.length ? ` · ${event.categories.join(', ')}` : ''}</p>
                  <div className="admin-progress" style={{ marginTop: '10px' }}>
                    <span style={{ width: `${event.capacity > 0 ? Math.min(100, (event.occupancy / event.capacity) * 100) : 0}%` }} />
                  </div>
                </div>
                <div style={{ minWidth: 96, textAlign: 'right' }}>
                  <span className={`admin-pill ${event.status === 'hidden' || event.status === 'reported' ? 'danger' : 'success'}`}>
                    {event.occupancy}/{event.capacity || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AdminShell>
  );
};

export default AdminDashboardPage;
