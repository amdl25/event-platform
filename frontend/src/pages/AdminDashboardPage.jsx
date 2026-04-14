import { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiClock, FiUsers } from 'react-icons/fi';
import API from '../api';
import AdminShell from '../components/AdminShell';

const colors = ['#3b82f6', '#2fb46f', '#f59e0b', '#8b5cf6', '#ea5a36', '#14b8a6'];

const getSeriesPoints = (items) => {
  if (!items.length) return [];
  const width = 760;
  const height = 210;
  const padding = 18;
  const maxValue = Math.max(1, ...items.map((item) => Number(item.value || 0)));

  return items.map((item, index) => ({
    x: padding + (index * (width - padding * 2)) / Math.max(1, items.length - 1),
    y: height - padding - ((Number(item.value || 0) / maxValue) * (height - padding * 2))
  }));
};

const buildSvgPathFromPoints = (points) => points.reduce((path, point, index) => `${path}${index === 0 ? 'M' : 'L'}${point.x} ${point.y} `, '').trim();


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

  const handleChartHover = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const svgWidth = rect.width;
    const dataLength = chartData.length;
    const pointIndex = Math.round((x / svgWidth) * (dataLength - 1));
    
    if (pointIndex >= 0 && pointIndex < dataLength) {
      setHoveredIndex(pointIndex);
    }
  };

  const handleChartLeave = () => {
    setHoveredIndex(null);
  };

  const chartData = useMemo(() => summary?.charts?.registrations || [], [summary]);
  const eventChartData = useMemo(() => summary?.charts?.eventsCreated || [], [summary]);
  const registrationPoints = useMemo(() => getSeriesPoints(chartData), [chartData]);
  const eventPoints = useMemo(() => getSeriesPoints(eventChartData), [eventChartData]);
  const linePath = useMemo(() => buildSvgPathFromPoints(registrationPoints), [registrationPoints]);
  const secondaryLinePath = useMemo(() => buildSvgPathFromPoints(eventPoints), [eventPoints]);
  const categories = useMemo(() => summary?.charts?.categories || [], [summary]);
  const topEvents = useMemo(() => summary?.topEvents || [], [summary]);
  const donutSegmentsList = useMemo(() => donutSegments(categories.slice(0, 5)), [categories]);
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

  const actions = (
    <span className="admin-badge-pill warning">
      <FiClock /> {summary?.stats?.pendingRequests || 0} cereri în așteptare
    </span>
  );

  if (loading) {
    return (
      <AdminShell user={user} handleLogout={handleLogout} title="Dashboard" subtitle="Privire de ansamblu asupra platformei" actions={actions}>
        <div className="admin-card">Se încarcă dashboard-ul...</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      user={user}
      handleLogout={handleLogout}
      title="Dashboard"
      subtitle="Privire de ansamblu asupra platformei"
      actions={actions}
      notificationsCount={summary?.stats?.notificationsCount || 0}
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
            </div>
          </div>
          <div className="admin-line-chart-wrap">
            <div className="admin-line-chart-yaxis" aria-hidden="true">
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
              <span>0</span>
            </div>
            <svg 
              className="admin-chart-svg admin-line-chart-svg" 
              viewBox="0 0 760 210" 
              preserveAspectRatio="none"
              onMouseMove={handleChartHover}
              onMouseLeave={handleChartLeave}
            >
            <g>
              {[24, 62, 100, 138, 176].map((y) => <line key={y} x1="0" x2="760" y1={y} y2={y} className="admin-chart-grid" />)}
              <line x1="18" x2="742" y1="192" y2="192" className="admin-chart-axis" />
              <line x1="18" x2="18" y1="18" y2="192" className="admin-chart-axis" />
            </g>
            <path d={linePath} className="admin-chart-line" />
            <path d={secondaryLinePath} className="admin-chart-line secondary" />
            {registrationPoints.map((point, index) => (
              <circle 
                key={chartData[index]?.key || index} 
                cx={point.x} 
                cy={point.y} 
                r={hoveredIndex === index ? "6" : "4.4"} 
                className={`admin-chart-point ${hoveredIndex === index ? 'hovered' : ''}`} 
              />
            ))}
            {eventPoints.map((point, index) => (
              <circle 
                key={`event-${eventChartData[index]?.key || index}`} 
                cx={point.x} 
                cy={point.y} 
                r={hoveredIndex === index ? "5.5" : "4.2"} 
                className={`admin-chart-point secondary ${hoveredIndex === index ? 'hovered' : ''}`} 
              />
            ))}
            {hoveredIndex !== null && registrationPoints[hoveredIndex] && (
              <>
                <line 
                  x1={registrationPoints[hoveredIndex].x} 
                  x2={registrationPoints[hoveredIndex].x} 
                  y1="18" 
                  y2="192" 
                  className="admin-chart-hover-line" 
                  strokeDasharray="4 4"
                />
                <g>
                  <rect
                    x={registrationPoints[hoveredIndex].x - 55}
                    y={registrationPoints[hoveredIndex].y - 75}
                    width="110"
                    height="72"
                    fill="#ffffff"
                    stroke="#e9e2dc"
                    strokeWidth="1"
                    rx="6"
                  />
                  <text
                    x={registrationPoints[hoveredIndex].x}
                    y={registrationPoints[hoveredIndex].y - 55}
                    className="admin-chart-tooltip-date"
                    textAnchor="middle"
                  >
                    {chartData[hoveredIndex]?.label}
                  </text>
                  <text
                    x={registrationPoints[hoveredIndex].x}
                    y={registrationPoints[hoveredIndex].y - 40}
                    className="admin-chart-tooltip-label"
                    textAnchor="middle"
                  >
                    <tspan fill="#d946ef">Utilizatori : </tspan>
                    <tspan fill="#d946ef" fontWeight="bold">{chartData[hoveredIndex]?.value || 0}</tspan>
                  </text>
                  <text
                    x={registrationPoints[hoveredIndex].x}
                    y={registrationPoints[hoveredIndex].y - 25}
                    className="admin-chart-tooltip-label"
                    textAnchor="middle"
                  >
                    <tspan fill="#8b5cf6">Evenimente : </tspan>
                    <tspan fill="#8b5cf6" fontWeight="bold">{eventChartData[hoveredIndex]?.value || 0}</tspan>
                  </text>
                </g>
              </>
            )}
              {chartData.filter((_, index) => index % 4 === 0).map((item) => {
                const point = registrationPoints[chartData.findIndex((entry) => entry.key === item.key)];
                return point ? (
                  <text key={item.key} x={point.x} y="206" className="admin-chart-xlabel" textAnchor="middle">{item.label}</text>
                ) : null;
              })}
            </svg>
          </div>
          <div className="admin-line-legend" aria-label="Legenda graficului">
            <div className="admin-line-legend-item">
              <span className="admin-line-legend-dot primary" />
              <span>Utilizatori</span>
              {hoveredIndex !== null && (
                <strong style={{ marginLeft: 'auto' }}>
                  {chartData[hoveredIndex]?.value || 0}
                </strong>
              )}
            </div>
            <div className="admin-line-legend-item">
              <span className="admin-line-legend-dot secondary" />
              <span>Evenimente</span>
              {hoveredIndex !== null && (
                <strong style={{ marginLeft: 'auto' }}>
                  {eventChartData[hoveredIndex]?.value || 0}
                </strong>
              )}
            </div>
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
                  <span className={`admin-pill ${event.status === 'hidden' ? 'danger' : event.status === 'reported' ? 'warning' : 'success'}`}>
                    {event.occupancy}/{event.capacity || 0}
                  </span>
                  <p className="admin-list-subtitle" style={{ marginTop: '8px' }}>{event.reports} raportări</p>
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
