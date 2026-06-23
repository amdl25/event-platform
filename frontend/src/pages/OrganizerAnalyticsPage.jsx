import React, { useEffect, useState } from 'react';
import {
	FiTrendingUp, FiTrendingDown, FiDollarSign, FiUsers, FiCalendar,
	FiLock, FiAward, FiStar, FiChevronUp, FiChevronDown
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import {
	BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import API from '../api';
import OrganizerShell from '../components/OrganizerShell';
import '../styles/OrganizerAnalytics.css';

const fmt = (n) => Number(n || 0).toLocaleString('ro-RO');
const fmtRon = (n) => `${Number(n || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`;
const fmtPct = (n) => `${Math.round(Number(n || 0))}%`;

const fmtDate = (dateStr) => {
	if (!dateStr) return '-';
	return new Date(dateStr).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const RO_MONTHS = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_RO_SHORT = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];
const DAYS_RO_FULL = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];

const buildMonthlyData = (rawRows, months = 6) => {
	const map = {};
	rawRows.forEach((row) => {
		map[row.month] = { revenue: Number(row.revenue || 0), tickets: Number(row.ticket_count || 0) };
	});
	const result = [];
	for (let i = months - 1; i >= 0; i--) {
		const d = new Date();
		d.setDate(1);
		d.setMonth(d.getMonth() - i);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		result.push({ month: RO_MONTHS[d.getMonth()], revenue: map[key]?.revenue ?? 0, tickets: map[key]?.tickets ?? 0 });
	}
	return result;
};

const buildDowData = (rawRows) => {
	const map = {};
	rawRows.forEach((row) => { map[Number(row.dow)] = Number(row.count || 0); });
	return DAYS_RO_SHORT.map((label, i) => ({ label, count: map[i] ?? 0, dow: i }));
};

const PRIMARY = '#E95B3C';

const StatCard = ({ icon: Icon, label, value, sub, accent, delta }) => (
	<div className={`oa-stat-card${accent ? ' accent' : ''}`}>
		<div className="oa-stat-icon"><Icon /></div>
		<div className="oa-stat-body">
			<div className="oa-stat-value-row">
				<p className="oa-stat-value">{value}</p>
				{delta != null && (
					<span className={`oa-stat-delta${delta >= 0 ? ' pos' : ' neg'}`}>
						{delta >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
						{delta >= 0 ? '+' : ''}{delta}%
					</span>
				)}
			</div>
			<p className="oa-stat-label">{label}</p>
			{sub && <p className="oa-stat-sub">{sub}</p>}
		</div>
	</div>
);

const InsightChip = ({ icon: Icon, label, value, color }) => (
	<div className="oa-insight">
		<span className="oa-insight-icon" style={{ background: `${color}18`, color }}><Icon /></span>
		<div>
			<p className="oa-insight-value">{value}</p>
			<p className="oa-insight-label">{label}</p>
		</div>
	</div>
);

const RevenueTooltip = ({ active, payload, label }) => {
	if (!active || !payload?.length) return null;
	return (
		<div className="oa-chart-tooltip">
			<p className="oa-chart-tooltip-label">{label}</p>
			<p className="oa-chart-tooltip-value">{fmtRon(payload[0]?.value)}</p>
			<p className="oa-chart-tooltip-sub">{payload[0]?.payload?.tickets} bilete</p>
		</div>
	);
};

const DowTooltip = ({ active, payload, label }) => {
	if (!active || !payload?.length) return null;
	return (
		<div className="oa-chart-tooltip">
			<p className="oa-chart-tooltip-label">{label}</p>
			<p className="oa-chart-tooltip-value">{payload[0]?.value} bilete</p>
			<p className="oa-chart-tooltip-sub">ultimele 90 de zile</p>
		</div>
	);
};

const BUSINESS_PURPLE = '#7c3aed';

const YearlyRevenueTooltip = ({ active, payload, label }) => {
	if (!active || !payload?.length) return null;
	return (
		<div className="oa-chart-tooltip">
			<p className="oa-chart-tooltip-label">{label}</p>
			<p className="oa-chart-tooltip-value">{fmtRon(payload[0]?.value)}</p>
			<p className="oa-chart-tooltip-sub">{payload[0]?.payload?.tickets} bilete</p>
		</div>
	);
};

const SortIcon = ({ col, sortCol, sortAsc }) => {
	if (sortCol !== col) return <span className="oa-sort-icon neutral"><FiChevronUp /><FiChevronDown /></span>;
	return sortAsc
		? <span className="oa-sort-icon active"><FiChevronUp /></span>
		: <span className="oa-sort-icon active"><FiChevronDown /></span>;
};

const BusinessAnalyticsSection = ({ advancedData, sortCol, sortAsc, onSort }) => {
	const yearlyData = buildMonthlyData(advancedData.yearlyRevenue || [], 12);
	const qoqDelta = advancedData.qoqDelta;
	const currentQRevenue = Number(advancedData.currentQRevenue || 0);
	const prevQRevenue = Number(advancedData.prevQRevenue || 0);

	const rawComparison = advancedData.eventComparison || [];
	const sortedComparison = [...rawComparison].sort((a, b) => {
		const fn = {
			revenue: (x, y) => Number(y.revenue) - Number(x.revenue),
			tickets_sold: (x, y) => Number(y.tickets_sold) - Number(x.tickets_sold),
			fill_rate: (x, y) => Number(y.fill_rate) - Number(x.fill_rate),
			start_date: (x, y) => new Date(y.start_date) - new Date(x.start_date),
		}[sortCol];
		return fn ? (sortAsc ? -fn(a, b) : fn(a, b)) : 0;
	});

	return (
		<>
			<div className="oa-business-header">
				<div className="oa-business-badge"><FiStar /> Business Intelligence</div>
				<p className="oa-business-subtitle">Statistici avansate disponibile exclusiv în planul Business</p>
			</div>

			<div className="oa-grid-2col">
				<div className="oa-panel oa-panel-chart">
					<h2 className="oa-panel-title">
						Venituri lunare
						<span className="oa-panel-subtitle"> ultimele 12 luni</span>
					</h2>
					{yearlyData.every((d) => d.revenue === 0) ? (
						<p className="oa-empty">Nu există venituri înregistrate în ultimele 12 luni.</p>
					) : (
						<ResponsiveContainer width="100%" height={200}>
							<BarChart data={yearlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barSize={22}>
								<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
								<XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#999' }} interval={1} />
								<YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#999' }} width={48} />
								<Tooltip content={<YearlyRevenueTooltip />} cursor={{ fill: '#f5f5f5' }} />
								<Bar dataKey="revenue" radius={[5, 5, 0, 0]}>
									{yearlyData.map((entry, index) => (
										<Cell key={index} fill={entry.revenue > 0 ? BUSINESS_PURPLE : '#e8e8e8'} />
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					)}
				</div>

				<div className="oa-panel oa-qoq-panel">
					<h2 className="oa-panel-title">
						Creștere trimestrială
						<span className="oa-panel-subtitle"> Q/Q</span>
					</h2>
					<div className="oa-qoq-body">
						<div className="oa-qoq-delta-wrap">
							{qoqDelta != null ? (
								<>
									<span className={`oa-qoq-delta${qoqDelta >= 0 ? ' pos' : ' neg'}`}>
										{qoqDelta >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
										{qoqDelta >= 0 ? '+' : ''}{qoqDelta}%
									</span>
									<p className="oa-qoq-label">față de trimestrul trecut</p>
								</>
							) : (
								<p className="oa-qoq-no-data">Insuficiente date pentru comparație</p>
							)}
						</div>
						<div className="oa-qoq-rows">
							<div className="oa-qoq-row">
								<span className="oa-qoq-row-dot current" />
								<span className="oa-qoq-row-label">Trimestrul curent</span>
								<span className="oa-qoq-row-val">{fmtRon(currentQRevenue)}</span>
							</div>
							<div className="oa-qoq-row">
								<span className="oa-qoq-row-dot prev" />
								<span className="oa-qoq-row-label">Trimestrul anterior</span>
								<span className="oa-qoq-row-val">{fmtRon(prevQRevenue)}</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="oa-panel">
				<h2 className="oa-panel-title">
					Comparație evenimente
					<span className="oa-panel-subtitle"> toate evenimentele tale</span>
				</h2>
				{sortedComparison.length === 0 ? (
					<p className="oa-empty">Niciun eveniment de afișat.</p>
				) : (
					<div className="oa-table-wrap">
						<table className="oa-table oa-comparison-table">
							<thead>
								<tr>
									<th>Eveniment</th>
									<th className="oa-th-sort" onClick={() => onSort('start_date')}>
										Dată <SortIcon col="start_date" sortCol={sortCol} sortAsc={sortAsc} />
									</th>
									<th className="oa-th-sort" onClick={() => onSort('revenue')}>
										Venituri <SortIcon col="revenue" sortCol={sortCol} sortAsc={sortAsc} />
									</th>
									<th className="oa-th-sort" onClick={() => onSort('tickets_sold')}>
										Bilete <SortIcon col="tickets_sold" sortCol={sortCol} sortAsc={sortAsc} />
									</th>
									<th className="oa-th-sort" onClick={() => onSort('fill_rate')}>
										Ocupare <SortIcon col="fill_rate" sortCol={sortCol} sortAsc={sortAsc} />
									</th>
								</tr>
							</thead>
							<tbody>
								{sortedComparison.map((ev) => {
									const fillRate = Number(ev.fill_rate || 0);
									return (
										<tr key={ev.id}>
											<td className="oa-td-title" title={ev.title}>{ev.title}</td>
											<td className="oa-td-muted">{fmtDate(ev.start_date)}</td>
											<td className="oa-td-money">{fmtRon(Number(ev.revenue || 0))}</td>
											<td>{fmt(ev.tickets_sold)}</td>
											<td>
												<span className={`oa-fill-chip${fillRate >= 80 ? ' good' : fillRate >= 40 ? ' mid' : ''}`}>
													{fmtPct(fillRate)}
												</span>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</>
	);
};

const OrganizerAnalyticsPage = ({ user, handleLogout }) => {
	const navigate = useNavigate();
	const plan = user?.organizationPlan || 'gratuit';
	const isFreePlan = plan === 'gratuit';
	const isBusinessPlan = plan === 'business';
	const [data, setData] = useState(null);
	const [analyticsData, setAnalyticsData] = useState(null);
	const [advancedData, setAdvancedData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [notifications, setNotifications] = useState([]);
	const [sortCol, setSortCol] = useState('revenue');
	const [sortAsc, setSortAsc] = useState(false);

	const handleSort = (col) => {
		if (sortCol === col) setSortAsc((v) => !v);
		else { setSortCol(col); setSortAsc(false); }
	};

	useEffect(() => {
		const load = async () => {
			try {
				const requests = [
					API.get('/organizer/dashboard'),
					API.get('/organizer/notifications').catch(() => ({ data: { notifications: [] } }))
				];
				if (!isFreePlan) requests.push(API.get('/organizer/analytics'));
				if (isBusinessPlan) requests.push(API.get('/organizer/analytics/advanced'));

				const results = await Promise.all(requests);
				setData(results[0].data);
				setNotifications(results[1].data?.notifications || []);
				if (!isFreePlan && results[2]) setAnalyticsData(results[2].data);
				if (isBusinessPlan && results[3]) setAdvancedData(results[3].data);
			} catch (err) {
				setError(err.response?.data?.message || 'Nu am putut încărca datele.');
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [isFreePlan, isBusinessPlan]);

	const stats = data?.stats || {};
	const monthlyData = buildMonthlyData(analyticsData?.monthlyRevenue || []);
	const dowData = buildDowData(analyticsData?.salesByDow || []);
	const topEvents = analyticsData?.topEvents || [];
	const avgFillRate = analyticsData?.avgFillRate ?? 0;

	const maxTopRevenue = topEvents.reduce((m, e) => Math.max(m, Number(e.revenue || 0)), 1);
	const maxDow = dowData.reduce((m, d) => Math.max(m, d.count), 1);
	const bestDow = dowData.reduce((a, b) => b.count > a.count ? b : a, dowData[0]);

	const thisMonthRevenue = monthlyData[5]?.revenue || 0;
	const lastMonthRevenue = monthlyData[4]?.revenue || 0;
	const momDelta = lastMonthRevenue > 0
		? Math.round((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100)
		: null;

	const ticketBreakdownRaw = analyticsData?.ticketBreakdown || [];
	const sortedTickets = [...ticketBreakdownRaw].sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0));
	const topTickets = sortedTickets.slice(0, 5);
	const otherTickets = sortedTickets.slice(5);
	const ticketDisplay = otherTickets.length > 0
		? [...topTickets, {
			name: `Alte tipuri (${otherTickets.length})`,
			sold: otherTickets.reduce((s, t) => s + Number(t.sold || 0), 0),
			total: otherTickets.reduce((s, t) => s + Number(t.total || 0), 0),
			revenue: otherTickets.reduce((s, t) => s + Number(t.revenue || 0), 0),
			isOther: true
		}]
		: topTickets;
	const maxTicketRevenue = Math.max(...ticketDisplay.map((t) => Number(t.revenue || 0)), 1);

	const insights = [];
	if (momDelta != null) {
		insights.push({
			icon: momDelta >= 0 ? FiTrendingUp : FiTrendingDown,
			label: 'venituri față de luna trecută',
			value: `${momDelta >= 0 ? '+' : ''}${momDelta}%`,
			color: momDelta >= 0 ? '#16a34a' : '#dc2626'
		});
	}
	if (bestDow && bestDow.count > 0) {
		insights.push({
			icon: FiCalendar,
			label: 'cea mai bună zi pentru vânzări — lansează campanii atunci',
			value: DAYS_RO_FULL[bestDow.dow],
			color: '#7c3aed'
		});
	}
	if (topEvents[0]) {
		insights.push({
			icon: FiAward,
			label: 'evenimentul cu cele mai mari venituri',
			value: topEvents[0].title,
			color: PRIMARY
		});
	}


	return (
		<OrganizerShell
			user={user}
			handleLogout={handleLogout}
			title="Statistici Evenimente"
			subtitle="Performanța evenimentelor tale"
			notifications={notifications}
		>
			{isFreePlan ? (
				<div className="oa-locked">
					<div className="oa-locked-icon"><FiLock /></div>
					<h3 className="oa-locked-title">Statistici Evenimente disponibile din planul Pro</h3>
					<p className="oa-locked-desc">
						Descoperă care evenimente aduc cei mai mulți bani, când cumpără lumea bilete
						și cât de bine îți umpli capacitatea.<br />
						Fă upgrade la Pro pentru a debloca această funcționalitate.
					</p>
					<button className="oa-locked-btn" onClick={() => navigate('/organizer/billing')}>
						Vezi planuri
					</button>
				</div>
			) : loading ? (
				<div className="oa-loading">Se încarcă...</div>
			) : error ? (
				<div className="oa-error">{error}</div>
			) : (
				<div className="oa-content">

					<div className="oa-stats-grid oa-stats-grid--5">
						<StatCard
							icon={FiDollarSign}
							label="Venituri totale"
							value={fmtRon(stats.totalRevenue)}
							sub={momDelta != null ? 'față de luna trecută' : `${fmt(stats.soldTickets)} bilete vândute`}
							delta={momDelta}
							accent
						/>
						<StatCard
							icon={FiUsers}
							label="Venituri per participant"
							value={fmtRon(stats.soldTickets > 0 ? stats.totalRevenue / stats.soldTickets : 0)}
							sub="valoare medie bilet"
						/>
						<StatCard
							icon={FiCalendar}
							label="Fill rate mediu"
							value={fmtPct(avgFillRate)}
							sub={`${fmt(stats.activeEvents)} evenimente active`}
						/>
					</div>

					{insights.length > 0 && (
						<div className="oa-insights-strip">
							{insights.map((ins, i) => (
								<InsightChip key={i} {...ins} />
							))}
						</div>
					)}

					<div className="oa-grid-2col">
						<div className="oa-panel oa-panel-chart">
							<h2 className="oa-panel-title">Venituri lunare <span className="oa-panel-subtitle">ultimele 6 luni</span></h2>
							{monthlyData.every((d) => d.revenue === 0) ? (
								<p className="oa-empty">Nu există venituri înregistrate în ultimele 6 luni.</p>
							) : (
								<ResponsiveContainer width="100%" height={200}>
									<BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barSize={32}>
										<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
										<XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#999' }} />
										<YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#999' }} width={48} />
										<Tooltip content={<RevenueTooltip />} cursor={{ fill: '#f5f5f5' }} />
										<Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
											{monthlyData.map((entry, index) => (
												<Cell key={index} fill={entry.revenue > 0 ? PRIMARY : '#e8e8e8'} />
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							)}
						</div>

						<div className="oa-panel oa-panel-chart">
							<h2 className="oa-panel-title">
								Vânzări pe zile
								<span className="oa-panel-subtitle"> ultimele 90 de zile</span>
							</h2>
							{dowData.every((d) => d.count === 0) ? (
								<p className="oa-empty">Nu există date de vânzări recente.</p>
							) : (
								<>
									<ResponsiveContainer width="100%" height={200}>
										<BarChart data={dowData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barSize={28}>
											<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
											<XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#999' }} />
											<YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#999' }} allowDecimals={false} />
											<Tooltip content={<DowTooltip />} cursor={{ fill: '#f5f5f5' }} />
											<Bar dataKey="count" radius={[5, 5, 0, 0]}>
												{dowData.map((entry, index) => (
													<Cell key={index} fill={entry.count === maxDow && maxDow > 0 ? '#7c3aed' : entry.count > 0 ? '#c4b5fd' : '#e8e8e8'} />
												))}
											</Bar>
										</BarChart>
									</ResponsiveContainer>
									{bestDow && bestDow.count > 0 && (
										<p className="oa-chart-hint">
											Lansează campanii de marketing <strong>{DAYS_RO_FULL[bestDow.dow]}</strong> pentru vânzări maxime.
										</p>
									)}
								</>
							)}
						</div>
					</div>

					<div className="oa-grid-2col">

						<div className="oa-panel">
							<h2 className="oa-panel-title">
								Top 5 evenimente
								<span className="oa-panel-subtitle"> după venituri</span>
							</h2>
							{topEvents.length === 0 ? (
								<p className="oa-empty">Niciun eveniment cu venituri încă.</p>
							) : (
								<ul className="oa-top-events">
									{topEvents.map((ev, idx) => {
										const revenue = Number(ev.revenue || 0);
										const barPct = maxTopRevenue > 0 ? Math.round((revenue / maxTopRevenue) * 100) : 0;
										const fillRate = Number(ev.fill_rate || 0);
										return (
											<li key={ev.id} className="oa-te-row">
												<div className="oa-te-rank">#{idx + 1}</div>
												<div className="oa-te-body">
													<div className="oa-te-header">
														<span className="oa-te-name" title={ev.title}>{ev.title}</span>
														<span className="oa-te-revenue">{fmtRon(revenue)}</span>
													</div>
													<div className="oa-te-bar-bg">
														<div className="oa-te-bar-fill" style={{ width: `${barPct}%` }} />
													</div>
													<div className="oa-te-meta">
														<span>{ev.ticket_count} bilete</span>
														<span>{fmtDate(ev.start_date)}</span>
														<span className={`oa-te-fill${fillRate >= 80 ? ' good' : fillRate >= 40 ? ' mid' : ''}`}>
															{fmtPct(fillRate)} ocupat
														</span>
													</div>
												</div>
											</li>
										);
									})}
								</ul>
							)}
						</div>

						<div className="oa-panel">
							<h2 className="oa-panel-title">
								Tipuri de bilete
								<span className="oa-panel-subtitle"> după venituri</span>
							</h2>
							{ticketDisplay.length === 0 ? (
								<p className="oa-empty">Niciun bilet vândut încă.</p>
							) : (
								<ul className="oa-ticket-breakdown">
									{ticketDisplay.map((t) => {
										const sold = Number(t.sold || 0);
										const total = Number(t.total || 0);
										const revenue = Number(t.revenue || 0);
										const barPct = maxTicketRevenue > 0 ? Math.round((revenue / maxTicketRevenue) * 100) : 0;
										const sellPct = total > 0 ? Math.round((sold / total) * 100) : 0;
										return (
											<li key={t.name} className={`oa-tb-row${t.isOther ? ' oa-tb-row--other' : ''}`}>
												<div className="oa-tb-header">
													<span className="oa-tb-name">{t.name}</span>
													<span className="oa-tb-meta">{sold}/{total} vândute ({sellPct}%)</span>
												</div>
												<div className="oa-tb-bar-bg">
													<div className="oa-tb-bar-fill" style={{ width: `${barPct}%`, opacity: t.isOther ? 0.45 : 1 }} />
												</div>
												<span className="oa-tb-revenue">{fmtRon(revenue)}</span>
											</li>
										);
									})}
								</ul>
							)}
						</div>

					</div>

					{isBusinessPlan && advancedData && <BusinessAnalyticsSection
						advancedData={advancedData}
						sortCol={sortCol}
						sortAsc={sortAsc}
						onSort={handleSort}
					/>}

				</div>
			)}
		</OrganizerShell>
	);
};

export default OrganizerAnalyticsPage;
