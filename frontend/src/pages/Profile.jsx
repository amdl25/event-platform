import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FiArrowDownRight, FiArrowUpRight, FiCalendar, FiClock, FiDownload, FiEdit2, FiGift, FiMail, FiMapPin, FiPhone, FiStar } from 'react-icons/fi';
import API, { API_BASE } from '../api';
import TicketPdfRenderer from '../components/TicketPdfRenderer';
import '../styles/Profile.css';

const Profile = ({ user }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('tickets'); 
    const [tickets, setTickets] = useState([]);
    const [organizerStatus, setOrganizerStatus] = useState(user?.organizerVerificationStatus || null);
    const [verificationForm, setVerificationForm] = useState({
        companyName: user?.organizationName || '',
        companyCui: '',
        registeredAddress: '',
        officialPhone: ''
    });
    const [verificationMessage, setVerificationMessage] = useState('');
    const [verificationError, setVerificationError] = useState('');
    const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);

    const [pdfDownloading, setPdfDownloading] = useState(false);
    const [pdfPayload, setPdfPayload] = useState(null);
    const [loading, setLoading] = useState(true);
    const [ticketTimeline, setTicketTimeline] = useState('future');
    const [showAllFutureTickets, setShowAllFutureTickets] = useState(false);
    const [rewardsFilter, setRewardsFilter] = useState('all');
    const [showAllRewardsHistory, setShowAllRewardsHistory] = useState(false);
    const [loyaltySummary, setLoyaltySummary] = useState({ totalPoints: 0, companies: [], transactions: [] });
    const ticketPdfRef = useRef(null);
    const rewardsCompanies = useMemo(() => {
        const accents = ['blue', 'purple', 'green', 'red'];
        return [...(loyaltySummary.companies || [])]
            .sort((a, b) => b.points - a.points)
            .map((item, index) => {
                const initials = item.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase() || 'EV';

                return {
                    initials,
                    name: item.name,
                    subtitle: 'Disponibile pentru reduceri',
                    points: item.points,
                    accent: accents[index % accents.length]
                };
            });
    }, [loyaltySummary.companies]);

    const rewardsHistory = useMemo(() => {
        return (loyaltySummary.transactions || [])
            .map((transaction) => {
                const dateValue = transaction.createdAt;
                const date = dateValue
                    ? new Date(dateValue).toLocaleDateString('ro-RO', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                    })
                    : 'Data necunoscută';
                const points = Number(transaction.points || 0);
                const isEarn = transaction.type === 'earn';
                return {
                    type: isEarn ? 'earn' : 'redeem',
                    title: isEarn
                        ? `Puncte câștigate — ${transaction.eventTitle || 'Eveniment'}`
                        : `Puncte folosite — ${transaction.eventTitle || 'Eveniment'}`,
                    date,
                    points: `${isEarn ? '+' : '-'}${points}`
                };
            });
    }, [loyaltySummary.transactions]);

    const filteredRewardsHistory = useMemo(() => {
        if (rewardsFilter === 'earn') {
            return rewardsHistory.filter((entry) => entry.type === 'earn');
        }
        if (rewardsFilter === 'redeem') {
            return rewardsHistory.filter((entry) => entry.type === 'redeem');
        }
        return rewardsHistory;
    }, [rewardsFilter, rewardsHistory]);

    const visibleRewardsHistory = useMemo(() => {
        if (showAllRewardsHistory) return filteredRewardsHistory;
        return filteredRewardsHistory.slice(0, 3);
    }, [filteredRewardsHistory, showAllRewardsHistory]);

    const hiddenRewardsCount = Math.max(filteredRewardsHistory.length - visibleRewardsHistory.length, 0);

    const totalPoints = Number(loyaltySummary.totalPoints || 0);
    const memberSince = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
        : 'Ianuarie 2024';
    const profileCity = user?.city || user?.location || 'București';
    const profilePhone = user?.phone || '+40 721 234 567';
    const greetingName = user?.firstName || user?.first_name || user?.name || 'prietene';
    const ticketsPurchased = tickets.length;
    const futureEvents = tickets.filter((ticket) => ticket.isFuture).length;

    const groupedTickets = useMemo(() => {
        const buckets = new Map();

        tickets.forEach((ticket) => {
            const eventId = ticket.event?.id || `unknown-${ticket.id}`;
            if (!buckets.has(eventId)) {
                buckets.set(eventId, {
                    eventId,
                    event: ticket.event,
                    tickets: [],
                    isFuture: ticket.isFuture
                });
            }

            const bucket = buckets.get(eventId);
            bucket.tickets.push(ticket);
            bucket.isFuture = bucket.isFuture || ticket.isFuture;
        });

        return Array.from(buckets.values()).sort((a, b) => {
            const dateA = a.event?.startDate ? new Date(a.event.startDate).getTime() : 0;
            const dateB = b.event?.startDate ? new Date(b.event.startDate).getTime() : 0;
            return dateA - dateB;
        });
    }, [tickets]);

    const futureTicketGroups = useMemo(() => {
        return groupedTickets
            .filter((ticketGroup) => ticketGroup.isFuture)
            .sort((a, b) => {
                const dateA = a.event?.startDate ? new Date(a.event.startDate).getTime() : Number.MAX_SAFE_INTEGER;
                const dateB = b.event?.startDate ? new Date(b.event.startDate).getTime() : Number.MAX_SAFE_INTEGER;
                return dateA - dateB;
            });
    }, [groupedTickets]);

    const historyTicketGroups = useMemo(() => {
        return groupedTickets
            .filter((ticketGroup) => !ticketGroup.isFuture)
            .sort((a, b) => {
                const dateA = a.event?.startDate ? new Date(a.event.startDate).getTime() : 0;
                const dateB = b.event?.startDate ? new Date(b.event.startDate).getTime() : 0;
                return dateB - dateA;
            });
    }, [groupedTickets]);

    const visibleTicketGroups = useMemo(() => {
        if (ticketTimeline === 'history') return historyTicketGroups;
        if (showAllFutureTickets) return futureTicketGroups;
        return futureTicketGroups.slice(0, 3);
    }, [futureTicketGroups, historyTicketGroups, showAllFutureTickets, ticketTimeline]);

    const hasMoreFutureTickets = futureTicketGroups.length > 3;

    const formatDateLabel = (dateValue) => {
        if (!dateValue) return 'Data necunoscută';
        return new Date(dateValue).toLocaleDateString('ro-RO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatTimeLabel = (dateValue) => {
        if (!dateValue) return '--:--';
        return new Date(dateValue).toLocaleTimeString('ro-RO', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!user?.id) return;
            try {
                const [ticketsResponse, loyaltyResponse] = await Promise.all([
                    API.get('/events/tickets/mine'),
                    API.get('/users/me/loyalty')
                ]);
                setTickets(ticketsResponse.data || []);
                setLoyaltySummary(loyaltyResponse.data || { totalPoints: 0, companies: [], transactions: [] });

                if (user?.role === 'organizer') {
                    const statusRes = await API.get(`/auth/organizer/status/${user.id}`);
                    setOrganizerStatus(statusRes.data?.verificationStatus || 'unverified');
                    setVerificationForm((prev) => ({
                        ...prev,
                        companyName: statusRes.data?.organizationName || prev.companyName,
                        companyCui: statusRes.data?.cuiCif || '',
                        registeredAddress: statusRes.data?.registeredAddress || '',
                        officialPhone: statusRes.data?.officialPhone || ''
                    }));
                }
                
            } catch (err) {
                console.error("Eroare la încărcarea datelor de profil:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfileData();
    }, [user]);

    const handleSubmitVerification = async (e) => {
        e.preventDefault();
        setVerificationError('');
        setVerificationMessage('');

        if (!verificationForm.companyName.trim() || !verificationForm.companyCui.trim() || !verificationForm.registeredAddress.trim() || !verificationForm.officialPhone.trim()) {
            setVerificationError('Completează toate câmpurile profilului business.');
            return;
        }

        try {
            setIsSubmittingVerification(true);
            const payload = {
                account_id: user.id,
                company_name: verificationForm.companyName.trim(),
                company_cui: verificationForm.companyCui.trim(),
                registered_address: verificationForm.registeredAddress.trim(),
                official_phone: verificationForm.officialPhone.trim()
            };

            const response = await API.post('/auth/organizer/verification', payload, {
                headers: { 'Content-Type': 'application/json' }
            });

            setOrganizerStatus(response.data?.verificationStatus || 'pending');
            setVerificationMessage(response.data?.message || 'Documentele au fost trimise cu succes.');
        } catch (err) {
            setVerificationError(err.response?.data?.message || 'Nu am putut trimite documentele.');
        } finally {
            setIsSubmittingVerification(false);
        }
    };

    const toSafeFileSlug = (value) => {
        return String(value || 'eveniment')
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .slice(0, 42) || 'eveniment';
    };

    const buildPdfPayload = (ticketItems, eventTitleOverride) => {
        const first = ticketItems[0];
        const eventTitle = eventTitleOverride || first?.event?.title || 'Eveniment';

        return {
            eventTitle,
            generatedAt: new Date().toISOString(),
            tickets: ticketItems.map((ticket, index) => ({
                number: index + 1,
                code: ticket.ticketCode || `TK-${String(ticket.id).slice(0, 8).toUpperCase()}`,
                qrValue: ticket.ticketQr || ticket.ticketCode || ticket.id,
                date: ticket.event?.startDate,
                location: ticket.event?.location || 'Locație nespecificată',
                points: Number(ticket.event?.pointsValue || 0),
                organizationName: ticket.event?.organizationName || 'Organizator'
            }))
        };
    };

    const exportTicketsPdf = async (ticketItems, eventTitleOverride, fileHint) => {
        if (!ticketItems?.length || pdfDownloading) return;

        const payload = buildPdfPayload(ticketItems, eventTitleOverride);
        setPdfPayload(payload);
        setPdfDownloading(true);

        try {
            await new Promise((resolve) => setTimeout(resolve, 40));
            if (!ticketPdfRef.current) return;

            const canvas = await html2canvas(ticketPdfRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= 297;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= 297;
            }

            const fileBase = toSafeFileSlug(fileHint || payload.eventTitle);
            pdf.save(`bilete-${fileBase}.pdf`);
        } catch (error) {
            console.error('Eroare la exportul PDF al biletelor:', error);
        } finally {
            setPdfDownloading(false);
            setPdfPayload(null);
        }
    };

    const handleDownloadAllTickets = (ticketGroup) => {
        exportTicketsPdf(
            ticketGroup.tickets,
            ticketGroup.event?.title,
            `${ticketGroup.event?.title || 'eveniment'}-${ticketGroup.tickets.length}`
        );
    };

    const getTicketImageUrl = (ticketGroup) => {
        const imageUrl = ticketGroup?.event?.image_url || ticketGroup?.event?.imageUrl || '';
        if (!imageUrl) return '';
        return imageUrl.startsWith('http') || imageUrl.startsWith('data:') ? imageUrl : `${API_BASE}${imageUrl}`;
    };

    if (!user || loading) {
        return null;
    }

    return (
        <div className="profile-page">
            <div className="container-max">
                <section className="profile-intro-block">
                    <h1 className="profile-intro-title">Bună, <span>{greetingName}</span></h1>
                    <p className="profile-intro-subtitle">Profilul tău, biletele și recompensele.</p>
                </section>
                
                <header className="profile-top-section">
                    <div className="profile-summary-card">
                        <div className="profile-summary-main">
                            <div className="avatar-circle">
                                {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || ''}
                            </div>
                            <div className="user-meta">
                                <div className="profile-summary-headline">
                                    <h1>{user?.firstName} {user?.lastName}</h1>
                                    <button className="profile-edit-link" type="button" onClick={() => navigate('/settings')}>
                                        <FiEdit2 /> Editează
                                    </button>
                                </div>
                                <div className="profile-contact-list">
                                    <div className="profile-contact-item"><FiMail /> <span>{user?.email}</span></div>
                                    <div className="profile-contact-item"><FiPhone /> <span>{profilePhone}</span></div>
                                    <div className="profile-contact-item"><FiMapPin /> <span>{profileCity}</span></div>
                                    <div className="profile-contact-item"><FiCalendar /> <span>Membru din {memberSince}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <aside className="profile-points-card">
                        <div className="profile-points-header">
                            <FiStar />
                            <span>TOTAL PUNCTE</span>
                        </div>
                        <div className="profile-points-total">{totalPoints}</div>
                        <p className="profile-points-subtitle">puncte acumulate</p>
                        <div className="profile-points-divider" />
                        <div className="profile-points-stats">
                            <div className="profile-points-stat">
                                <span>Bilete cumpărate</span>
                                <strong>{ticketsPurchased}</strong>
                            </div>
                            <div className="profile-points-stat">
                                <span>Evenimente viitoare</span>
                                <strong>{futureEvents}</strong>
                            </div>
                        </div>
                    </aside>
                </header>

                {user?.role === 'organizer' && organizerStatus !== 'verified' ? (
                    <section className="organizer-verification-banner">
                        <h3>Cont organizator în așteptare</h3>
                        <p>
                            Status curent: <strong>{organizerStatus || 'unverified'}</strong>. 
                            Completează profilul business pentru verificare înainte să publici evenimente în feed-ul public.
                        </p>

                        {organizerStatus !== 'pending' ? (
                            <form className="organizer-verification-form" onSubmit={handleSubmitVerification}>
                                <input
                                    type="text"
                                    placeholder="Nume firmă (ex: Jazz Society S.R.L.)"
                                    value={verificationForm.companyName}
                                    onChange={(event) => setVerificationForm({ ...verificationForm, companyName: event.target.value })}
                                    required
                                    disabled={isSubmittingVerification}
                                />

                                <input
                                    type="text"
                                    placeholder="CUI / CIF (ex: RO12345678)"
                                    value={verificationForm.companyCui}
                                    onChange={(event) => setVerificationForm({ ...verificationForm, companyCui: event.target.value })}
                                    required
                                    disabled={isSubmittingVerification}
                                />

                                <input
                                    type="text"
                                    placeholder="Adresă sediu social"
                                    value={verificationForm.registeredAddress}
                                    onChange={(event) => setVerificationForm({ ...verificationForm, registeredAddress: event.target.value })}
                                    required
                                    disabled={isSubmittingVerification}
                                />

                                <input
                                    type="tel"
                                    placeholder="Număr de telefon oficial"
                                    value={verificationForm.officialPhone}
                                    onChange={(event) => setVerificationForm({ ...verificationForm, officialPhone: event.target.value })}
                                    required
                                    disabled={isSubmittingVerification}
                                />

                                {verificationError ? <p className="organizer-verification-error">{verificationError}</p> : null}
                                {verificationMessage ? <p className="organizer-verification-success">{verificationMessage}</p> : null}

                                <button type="submit" className="btn-primary" disabled={isSubmittingVerification}>
                                    {isSubmittingVerification ? 'Se trimite...' : 'Trimite profilul business pentru verificare'}
                                </button>
                            </form>
                        ) : (
                            <p className="organizer-verification-pending">Profilul business a fost trimis. Așteaptă aprobarea adminului.</p>
                        )}
                    </section>
                ) : null}

                <nav className="profile-nav-tabs">
                    <button 
                        className={activeTab === 'tickets' ? 'active' : ''} 
                        onClick={() => setActiveTab('tickets')}
                    >
                        <FiCalendar /> Biletele mele
                    </button>
                    <button 
                        className={activeTab === 'rewards' ? 'active' : ''} 
                        onClick={() => setActiveTab('rewards')}
                    >
                        <FiStar /> Puncte & Recompense
                    </button>
                </nav>

                <main className="profile-main-content">
                    
                    {activeTab === 'tickets' && (
                        <div className="tab-content tab-fade-in">
                            <div className="ticket-timeline-pills" role="tablist" aria-label="Filtru bilete">
                                <button
                                    type="button"
                                    className={`ticket-timeline-pill ${ticketTimeline === 'future' ? 'active' : ''}`}
                                    onClick={() => {
                                        setTicketTimeline('future');
                                        setShowAllFutureTickets(false);
                                    }}
                                >
                                    <FiCalendar /> Viitoare <span>{futureTicketGroups.length}</span>
                                </button>
                                <button
                                    type="button"
                                    className={`ticket-timeline-pill ${ticketTimeline === 'history' ? 'active' : ''}`}
                                    onClick={() => setTicketTimeline('history')}
                                >
                                    <FiClock /> Istoric <span>{historyTicketGroups.length}</span>
                                </button>
                            </div>

                            <div className="tickets-list">
                                {visibleTicketGroups.length === 0 ? (
                                    <div className="empty-state-card">
                                        <p className="empty-state-text">
                                            {ticketTimeline === 'future' ? 'Nu ai evenimente viitoare.' : 'Nu ai evenimente în istoric.'}
                                        </p>
                                    </div>
                                ) : (
                                    visibleTicketGroups.map((ticketGroup) => {
                                        const isMulti = ticketGroup.tickets.length > 1;
                                        const imageUrl = getTicketImageUrl(ticketGroup);

                                        const isHistoryView = ticketTimeline === 'history';

                                        return (
                                            <article key={`group-${ticketGroup.eventId}`} className={`ticket-group-card ${isMulti ? 'multi' : 'single'}${isHistoryView ? ' is-history' : ''}`}>
                                                <div className="ticket-card-image-wrap" aria-hidden={!imageUrl}>
                                                    {imageUrl ? (
                                                        <img src={imageUrl} alt={ticketGroup.event?.title || 'Eveniment'} className={`ticket-card-image${isHistoryView ? ' is-history' : ''}`} />
                                                    ) : (
                                                        <div className="ticket-card-image-placeholder">
                                                            {(ticketGroup.event?.title || 'E').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="ticket-group-content">
                                                    <div className="ticket-group-header">
                                                        <div className="ticket-group-title-wrap">
                                                            <h3>{ticketGroup.event?.title || 'Eveniment'}</h3>
                                                        </div>
                                                    </div>

                                                    <p className="ticket-host">{ticketGroup.event?.organizationName || 'Organizator'}</p>

                                                    <div className="ticket-meta-row">
                                                        <span><FiCalendar /> {formatDateLabel(ticketGroup.event?.startDate)}</span>
                                                        <span><FiClock /> {formatTimeLabel(ticketGroup.event?.startDate)}</span>
                                                        <span><FiMapPin /> {ticketGroup.event?.location || 'Locație nespecificată'}</span>
                                                    </div>

                                                    {!isHistoryView ? (
                                                        <div className="ticket-group-actions">
                                                            <button
                                                                className="btn-qr-trigger v2"
                                                                onClick={() => handleDownloadAllTickets(ticketGroup)}
                                                                disabled={pdfDownloading}
                                                            >
                                                                <FiDownload /> {pdfDownloading ? 'Se descarcă...' : (isMulti ? 'Descarcă bilete' : 'Descarcă bilet')}
                                                            </button>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </article>
                                        );
                                    })
                                )}
                            </div>

                            {ticketTimeline === 'future' && hasMoreFutureTickets ? (
                                <div className="tickets-more-wrap">
                                    <button
                                        type="button"
                                        className="tickets-more-button"
                                        onClick={() => setShowAllFutureTickets((prev) => !prev)}
                                    >
                                        {showAllFutureTickets ? 'Arată mai puține' : 'Vezi mai multe'}
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    )}

                    {activeTab === 'rewards' && (
                        <div className="tab-content tab-fade-in rewards-tab-content">
                            <div className="rewards-header-row">
                                <div>
                                    <h2 className="section-title rewards-title">Puncte & Recompense</h2>
                                    <p className="rewards-subtitle">Urmărește punctele acumulate și istoricul de recompense.</p>
                                </div>
                            </div>

                            <div className="rewards-grid">
                                <section className="rewards-column">
                                    <h3 className="rewards-column-title">PUNCTE PE COMPANIE</h3>
                                    <div className="rewards-company-list">
                                        {rewardsCompanies.length === 0 ? (
                                            <div className="empty-state-card">
                                                <p className="empty-state-text">Nu există puncte acumulate încă.</p>
                                            </div>
                                        ) : rewardsCompanies.map((company) => (
                                            <article key={company.name} className="rewards-company-card">
                                                <div className={`rewards-company-avatar accent-${company.accent}`}>
                                                    {company.initials}
                                                </div>
                                                <div className="rewards-company-info">
                                                    <strong>{company.name}</strong>
                                                    <span>{company.subtitle}</span>
                                                </div>
                                                <div className="rewards-company-points">
                                                    <strong>{company.points}</strong>
                                                    <FiArrowUpRight />
                                                </div>
                                            </article>
                                        ))}
                                    </div>

                                    <article className="rewards-tip-card">
                                        <p className="rewards-tip-title"><FiGift /> SFAT</p>
                                        <p className="rewards-tip-copy">Folosește punctele pentru reduceri la următorul eveniment de la aceeași companie.</p>
                                    </article>
                                </section>

                                <section className="rewards-column rewards-history-column">
                                    <div className="rewards-history-header">
                                        <h3 className="rewards-column-title">ISTORIC PUNCTE</h3>
                                        <div className="rewards-history-filters" role="tablist" aria-label="Filtru istoric puncte">
                                            <button
                                                type="button"
                                                className={`rewards-filter-pill ${rewardsFilter === 'all' ? 'active' : ''}`}
                                                onClick={() => {
                                                    setRewardsFilter('all');
                                                    setShowAllRewardsHistory(false);
                                                }}
                                            >
                                                Toate
                                            </button>
                                            <button
                                                type="button"
                                                className={`rewards-filter-pill ${rewardsFilter === 'earn' ? 'active' : ''}`}
                                                onClick={() => {
                                                    setRewardsFilter('earn');
                                                    setShowAllRewardsHistory(false);
                                                }}
                                            >
                                                Câștigate
                                            </button>
                                            <button
                                                type="button"
                                                className={`rewards-filter-pill ${rewardsFilter === 'redeem' ? 'active' : ''}`}
                                                onClick={() => {
                                                    setRewardsFilter('redeem');
                                                    setShowAllRewardsHistory(false);
                                                }}
                                            >
                                                Folosite
                                            </button>
                                        </div>
                                    </div>

                                    <div className="rewards-history-list">
                                        {visibleRewardsHistory.length === 0 ? (
                                            <div className="rewards-history-empty">Nu există tranzacții de puncte încă.</div>
                                        ) : visibleRewardsHistory.map((entry) => (
                                            <article key={`${entry.title}-${entry.date}`} className="rewards-history-item">
                                                <div className={`rewards-history-icon ${entry.type}`}>
                                                    {entry.type === 'earn' ? <FiStar /> : <FiGift />}
                                                </div>
                                                <div className="rewards-history-info">
                                                    <strong>{entry.title}</strong>
                                                    <span>{entry.date}</span>
                                                </div>
                                                <div className={`rewards-history-points ${entry.type}`}>
                                                    {entry.type === 'earn' ? <FiArrowUpRight /> : <FiArrowDownRight />}
                                                    <strong>{entry.points}</strong>
                                                </div>
                                            </article>
                                        ))}
                                    </div>

                                    {filteredRewardsHistory.length > 3 ? (
                                        <div className="rewards-history-more-wrap">
                                            <button
                                                type="button"
                                                className="rewards-history-more-btn"
                                                onClick={() => setShowAllRewardsHistory((prev) => !prev)}
                                            >
                                                {showAllRewardsHistory ? 'Arată mai puțin' : `Vezi mai mult (${hiddenRewardsCount} rămase)`}
                                            </button>
                                        </div>
                                    ) : null}
                                </section>
                            </div>
                        </div>
                    )}

                </main>
            </div>

            {pdfPayload ? <TicketPdfRenderer payload={pdfPayload} ref={ticketPdfRef} /> : null}
        </div>
    );
};

export default Profile;