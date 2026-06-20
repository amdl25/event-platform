import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowUpRight, FiCalendar, FiClock, FiDownload, FiEdit2, FiGift, FiMapPin, FiStar, FiX } from 'react-icons/fi';
import API from '../api';
import TicketPdfRenderer from '../components/TicketPdfRenderer';
import { downloadTicketsPdf } from '../utils/downloadTicketsPdf';
import '../styles/Profile.css';

const toEditableProfile = (sourceUser = {}) => ({
    firstName: sourceUser?.firstName || sourceUser?.first_name || '',
    lastName: sourceUser?.lastName || sourceUser?.last_name || '',
    email: sourceUser?.email || '',
    createdAt: sourceUser?.createdAt || null
});

const Profile = ({ user }) => {
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState(() => toEditableProfile(user));
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [profileForm, setProfileForm] = useState(() => toEditableProfile(user));
    const [profileFormError, setProfileFormError] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [activeTab, setActiveTab] = useState('tickets');
    const [tickets, setTickets] = useState([]);
    const [showAllTickets, setShowAllTickets] = useState(false);
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
    const [verificationTouched, setVerificationTouched] = useState({
        companyName: false,
        companyCui: false,
        registeredAddress: false,
        officialPhone: false
    });
    const [profileTouched, setProfileTouched] = useState({
        firstName: false,
        lastName: false,
        email: false
    });

    const [pdfDownloading, setPdfDownloading] = useState(false);
    const [pdfPayload, setPdfPayload] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loyaltySummary, setLoyaltySummary] = useState({ totalPoints: 0, companies: [] });
    const ticketPdfRef = useRef(null);
    const rewardsCompanies = useMemo(() => {
        const accents = ['blue', 'purple', 'green', 'red'];
        const companies = (loyaltySummary.companies || []).slice().sort((a, b) => Number(b.points || 0) - Number(a.points || 0));

        return companies.map((item, index) => {
            const initials = (item.name || 'EV')
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join('')
                .toUpperCase();

            const expiringSoonPoints = Number(item.expiringSoonPoints || 0);
            const nearestExpiryAt = item.nearestExpiryAt ? new Date(item.nearestExpiryAt) : null;
            const daysUntil = nearestExpiryAt ? Math.ceil((nearestExpiryAt - new Date()) / (1000 * 60 * 60 * 24)) : null;
            const expiryLabel = nearestExpiryAt ? (daysUntil <= 0 ? 'astăzi' : `${daysUntil} ${daysUntil === 1 ? 'zi' : 'zile'}`) : null;

            return {
                orgId: item.orgId || item.org_id || null,
                initials,
                name: item.name,
                subtitle: 'Disponibile pentru reduceri',
                points: Number(item.points || 0),
                accent: accents[index % accents.length],
                expiringSoonPoints,
                nearestExpiryAt,
                expiryLabel
            };
        });
    }, [loyaltySummary.companies]);


    const getVerificationFieldErrors = (values) => {
        const companyName = String(values?.companyName || '').trim();
        const companyCui = String(values?.companyCui || '').trim().toUpperCase();
        const registeredAddress = String(values?.registeredAddress || '').trim();
        const officialPhone = String(values?.officialPhone || '').trim();

        return {
            companyName: !companyName
                ? 'Numele firmei este obligatoriu.'
                : (companyName.length < 2 || companyName.length > 120 ? '2-120 caractere.' : ''),
            companyCui: !companyCui
                ? 'CUI/CIF este obligatoriu.'
                : (!/^(RO)?[0-9]{2,12}$/.test(companyCui) ? 'Format invalid (ex: RO12345678).' : ''),
            registeredAddress: !registeredAddress
                ? 'Adresa sediului este obligatorie.'
                : (registeredAddress.length < 6 ? 'Adresa este prea scurtă.' : ''),
            officialPhone: !officialPhone
                ? 'Telefonul oficial este obligatoriu.'
                : (!/^[0-9+()\-\s]{7,20}$/.test(officialPhone) ? 'Telefon invalid.' : '')
        };
    };

    const getProfileFieldErrors = (values) => {
        const firstName = String(values?.firstName || '').trim();
        const lastName = String(values?.lastName || '').trim();
        const email = String(values?.email || '').trim();
        return {
            firstName: !firstName ? 'Prenumele este obligatoriu.' : (firstName.length < 2 ? 'Minim 2 caractere.' : ''),
            lastName: !lastName ? 'Numele este obligatoriu.' : (lastName.length < 2 ? 'Minim 2 caractere.' : ''),
            email: !email
                ? 'Email-ul este obligatoriu.'
                : (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Format email invalid.' : ''),
        };
    };

    const verificationFieldErrors = getVerificationFieldErrors(verificationForm);
    const profileFieldErrors = getProfileFieldErrors(profileForm);

    useEffect(() => {
        setProfileData(toEditableProfile(user));
        setProfileForm(toEditableProfile(user));
    }, [user]);

    const POINTS_PER_RON = 10;
    const totalPoints = Number(loyaltySummary.totalPoints || 0);
    const greetingName = profileData?.firstName || 'prietene';
    const ticketsPurchased = tickets.length;
    const futureEvents = tickets.filter((ticket) => ticket.isFuture).length;

    const memberSince = profileData?.createdAt
        ? new Date(profileData.createdAt).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
        : null;

    const formatRon = (points) => {
        const val = points / POINTS_PER_RON;
        return val % 1 === 0 ? String(val) : val.toFixed(1);
    };

    const getDaysUntil = (dateValue) => {
        if (!dateValue) return null;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const eventDate = new Date(dateValue);
        eventDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return null;
        if (diffDays === 0) return { label: 'Azi', urgent: true };
        if (diffDays === 1) return { label: 'Mâine', urgent: true };
        if (diffDays <= 7) return { label: `În ${diffDays} zile`, urgent: true };
        if (diffDays <= 14) return { label: 'Săptămâna viitoare', urgent: false };
        return null;
    };

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
        setVerificationTouched({
            companyName: true,
            companyCui: true,
            registeredAddress: true,
            officialPhone: true
        });

        const firstVerificationError = Object.values(getVerificationFieldErrors(verificationForm)).find(Boolean);
        if (firstVerificationError) {
            setVerificationError(firstVerificationError);
            return;
        }

        const companyName = verificationForm.companyName.trim();
        const companyCui = verificationForm.companyCui.trim().toUpperCase();
        const registeredAddress = verificationForm.registeredAddress.trim();
        const officialPhone = verificationForm.officialPhone.trim();

        try {
            setIsSubmittingVerification(true);
            const payload = {
                account_id: user.id,
                company_name: companyName,
                company_cui: companyCui,
                registered_address: registeredAddress,
                official_phone: officialPhone
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
                eventId: ticket.event?.id || ticket.eventId || null,
                date: ticket.event?.startDate,
                location: ticket.event?.location || 'Locație nespecificată',
                points: Number(ticket.event?.pointsValue || 0),
                organizationName: ticket.organizationName || ticket.event?.organizationName || 'Organizator'
            }))
        };
    };

    const exportTicketsPdf = async (ticketItems, eventTitleOverride, fileHint) => {
        if (!ticketItems?.length || pdfDownloading) return;

        const payload = buildPdfPayload(ticketItems, eventTitleOverride);
        setPdfDownloading(true);

        try {
            await downloadTicketsPdf({
                eventTitle: payload.eventTitle,
                tickets: payload.tickets,
                fileName: `bilete-${toSafeFileSlug(fileHint || payload.eventTitle)}`,
                layoutMode: 'stack'
            });
        } catch (error) {
            console.error('Eroare la exportul PDF al biletelor:', error);
        } finally {
            setPdfDownloading(false);
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
        return imageUrl.startsWith('http') || imageUrl.startsWith('data:') ? imageUrl : '';
    };

    const openEditModal = () => {
        setProfileForm(toEditableProfile(profileData));
        setProfileFormError('');
        setProfileTouched({
            firstName: false,
            lastName: false,
            email: false
        });
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setProfileFormError('');
    };

    const handleSaveProfile = async (eventSave) => {
        eventSave.preventDefault();
        setProfileTouched({
            firstName: true,
            lastName: true,
            email: true
        });

        const firstProfileError = Object.values(getProfileFieldErrors(profileForm)).find(Boolean);
        if (firstProfileError) {
            setProfileFormError(firstProfileError);
            return;
        }

        const nextFirstName = String(profileForm.firstName || '').trim();
        const nextLastName = String(profileForm.lastName || '').trim();
        const nextEmail = String(profileForm.email || '').trim();

        try {
            setIsSavingProfile(true);
            setProfileFormError('');

            const response = await API.patch('/users/me', {
                firstName: nextFirstName,
                lastName: nextLastName,
                email: nextEmail,
            });

            const backendProfile = response?.data?.profile || {};
            const updatedProfileData = {
                ...profileData,
                firstName: backendProfile.firstName || nextFirstName,
                lastName: backendProfile.lastName || nextLastName,
                email: backendProfile.email || nextEmail,
            };

            setProfileData(updatedProfileData);

            const storedUserRaw = localStorage.getItem('eventHubUser');
            if (storedUserRaw) {
                try {
                    const storedUser = JSON.parse(storedUserRaw);
                    const nextStoredUser = {
                        ...storedUser,
                        firstName: updatedProfileData.firstName,
                        lastName: updatedProfileData.lastName,
                        email: updatedProfileData.email,
                    };
                    localStorage.setItem('eventHubUser', JSON.stringify(nextStoredUser));
                } catch {
                }
            }

            closeEditModal();
        } catch (saveError) {
            setProfileFormError(saveError?.response?.data?.message || 'Nu am putut salva modificările profilului.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    if (!user || loading) {
        return null;
    }

    return (
        <div className="profile-page">
            <div className="container-max">
                <header className="profile-hero">
                    <div className="profile-hero-top">
                        <div className="profile-hero-avatar">
                            {profileData?.firstName?.[0] || 'U'}{profileData?.lastName?.[0] || ''}
                        </div>
                        <div className="profile-hero-identity">
                            <h1 className="profile-hero-name">{profileData?.firstName} {profileData?.lastName}</h1>
                            <p className="profile-hero-email">{profileData?.email}</p>
                            {memberSince && <p className="profile-hero-since">Membru din {memberSince}</p>}
                        </div>
                        <button className="profile-hero-edit" type="button" onClick={openEditModal} title="Editează contul">
                            <FiEdit2 />
                        </button>
                    </div>
                    <div className="profile-hero-stats">
                        <div className="profile-hero-stat">
                            <strong>{futureEvents}</strong>
                            <span>Urmează</span>
                        </div>
                        <div className="profile-hero-stat-sep" />
                        <div className="profile-hero-stat">
                            <strong>{totalPoints}</strong>
                            <span>Puncte acumulate</span>
                            {totalPoints > 0 && (
                                <span className="profile-hero-stat-sub">≈ {formatRon(totalPoints)} RON reducere</span>
                            )}
                        </div>
                    </div>
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
                                    className={verificationTouched.companyName && verificationFieldErrors.companyName ? 'profile-input-invalid' : ''}
                                    onChange={(event) => {
                                        setVerificationForm({ ...verificationForm, companyName: event.target.value });
                                        if (verificationError) setVerificationError('');
                                    }}
                                    onBlur={() => setVerificationTouched((prev) => ({ ...prev, companyName: true }))}
                                    required
                                    disabled={isSubmittingVerification}
                                />
                                {verificationTouched.companyName && verificationFieldErrors.companyName ? <p className="profile-field-error">{verificationFieldErrors.companyName}</p> : null}

                                <input
                                    type="text"
                                    placeholder="CUI / CIF (ex: RO12345678)"
                                    value={verificationForm.companyCui}
                                    className={verificationTouched.companyCui && verificationFieldErrors.companyCui ? 'profile-input-invalid' : ''}
                                    onChange={(event) => {
                                        setVerificationForm({ ...verificationForm, companyCui: event.target.value });
                                        if (verificationError) setVerificationError('');
                                    }}
                                    onBlur={() => setVerificationTouched((prev) => ({ ...prev, companyCui: true }))}
                                    required
                                    disabled={isSubmittingVerification}
                                />
                                {verificationTouched.companyCui && verificationFieldErrors.companyCui ? <p className="profile-field-error">{verificationFieldErrors.companyCui}</p> : null}

                                <input
                                    type="text"
                                    placeholder="Adresă sediu social"
                                    value={verificationForm.registeredAddress}
                                    className={verificationTouched.registeredAddress && verificationFieldErrors.registeredAddress ? 'profile-input-invalid' : ''}
                                    onChange={(event) => {
                                        setVerificationForm({ ...verificationForm, registeredAddress: event.target.value });
                                        if (verificationError) setVerificationError('');
                                    }}
                                    onBlur={() => setVerificationTouched((prev) => ({ ...prev, registeredAddress: true }))}
                                    required
                                    disabled={isSubmittingVerification}
                                />
                                {verificationTouched.registeredAddress && verificationFieldErrors.registeredAddress ? <p className="profile-field-error">{verificationFieldErrors.registeredAddress}</p> : null}

                                <input
                                    type="tel"
                                    placeholder="Număr de telefon oficial"
                                    value={verificationForm.officialPhone}
                                    className={verificationTouched.officialPhone && verificationFieldErrors.officialPhone ? 'profile-input-invalid' : ''}
                                    onChange={(event) => {
                                        setVerificationForm({ ...verificationForm, officialPhone: event.target.value });
                                        if (verificationError) setVerificationError('');
                                    }}
                                    onBlur={() => setVerificationTouched((prev) => ({ ...prev, officialPhone: true }))}
                                    required
                                    disabled={isSubmittingVerification}
                                />
                                {verificationTouched.officialPhone && verificationFieldErrors.officialPhone ? <p className="profile-field-error">{verificationFieldErrors.officialPhone}</p> : null}

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

                <div className="profile-content-wrap">
                <nav className="profile-nav-tabs">
                    <button
                        className={activeTab === 'tickets' ? 'active' : ''}
                        onClick={() => setActiveTab('tickets')}
                    >
                        <FiCalendar /> Urmează
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
                            <div className="tickets-list">
                                {futureTicketGroups.length === 0 ? (
                                    <div className="tickets-empty">
                                        <div className="tickets-empty-icon"><FiCalendar /></div>
                                        <h3>Niciun eveniment în calendar</h3>
                                        <p>Explorează evenimentele disponibile și cumpără bilete pentru experiențe de neuitat.</p>
                                        <button type="button" className="tickets-explore-btn" onClick={() => navigate('/explore')}>
                                            Explorează evenimente <FiArrowUpRight />
                                        </button>
                                    </div>
                                ) : (showAllTickets ? futureTicketGroups : futureTicketGroups.slice(0, 3)).map((ticketGroup) => {
                                    const isMulti = ticketGroup.tickets.length > 1;
                                    const imageUrl = getTicketImageUrl(ticketGroup);
                                    const countdown = getDaysUntil(ticketGroup.event?.startDate);
                                    return (
                                        <article key={`group-${ticketGroup.eventId}`} className={`ticket-group-card ${isMulti ? 'multi' : 'single'}`}>
                                            <div className="ticket-card-image-wrap" aria-hidden={!imageUrl}>
                                                {imageUrl ? (
                                                    <img src={imageUrl} alt={ticketGroup.event?.title || 'Eveniment'} className="ticket-card-image" />
                                                ) : (
                                                    <div className="ticket-card-image-placeholder">
                                                        {(ticketGroup.event?.title || 'E').charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                {countdown && (
                                                    <div className={`ticket-image-countdown${countdown.urgent ? ' urgent' : ''}`}>
                                                        {countdown.label}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ticket-group-content">
                                                <h3>{ticketGroup.event?.title || 'Eveniment'}</h3>
                                                <p className="ticket-host">{ticketGroup.event?.organizationName || 'Organizator'}</p>
                                                <div className="ticket-meta-row">
                                                    <span><FiCalendar /> {formatDateLabel(ticketGroup.event?.startDate)}</span>
                                                    <span><FiClock /> {formatTimeLabel(ticketGroup.event?.startDate)}</span>
                                                    <span><FiMapPin /> {ticketGroup.event?.location || 'Locație nespecificată'}</span>
                                                </div>
                                                <div className="ticket-group-actions">
                                                    <button
                                                        className="btn-qr-trigger v2"
                                                        onClick={() => handleDownloadAllTickets(ticketGroup)}
                                                        disabled={pdfDownloading}
                                                    >
                                                        <FiDownload /> {pdfDownloading ? 'Se descarcă...' : (isMulti ? 'Descarcă bilete' : 'Descarcă bilet')}
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                            {futureTicketGroups.length > 3 && (
                                <button
                                    type="button"
                                    className="tickets-show-more-btn"
                                    onClick={() => setShowAllTickets((prev) => !prev)}
                                >
                                    {showAllTickets
                                        ? 'Arată mai puține'
                                        : `Vezi toate`}
                                </button>
                            )}
                        </div>
                    )}

                    {activeTab === 'rewards' && (
                        <div className="tab-content tab-fade-in rewards-tab-content">
                            {rewardsCompanies.length === 0 ? (
                                <div className="rewards-empty">
                                    <div className="rewards-empty-icon"><FiStar /></div>
                                    <h3>Câștigă puncte de fidelitate</h3>
                                    <p>Cumpără bilete la evenimentele organizatorilor tăi favoriți și primești puncte pe care le poți folosi ca reduceri în viitor.</p>
                                    <div className="rewards-empty-rate">10 puncte = 1 RON reducere</div>
                                    <button
                                        type="button"
                                        className="rewards-explore-btn"
                                        onClick={() => navigate('/explore')}
                                    >
                                        Explorează evenimente <FiArrowUpRight />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <p className="rewards-intro-note">Punctele sunt disponibile ca reducere la checkout, la biletele viitoare ale aceluiași organizator.</p>
                                    <div className="rewards-wallets-grid">
                                        {rewardsCompanies.map((company) => {
                                            const ronValue = formatRon(company.points);
                                            const targetPath = company.orgId
                                                ? `/explore?orgId=${company.orgId}&orgName=${encodeURIComponent(company.name)}`
                                                : '/explore';
                                            return (
                                                <article key={company.name} className="rewards-wallet-card">
                                                    <div className="rewards-wallet-top">
                                                        <div className={`rewards-wallet-avatar accent-${company.accent}`}>
                                                            {company.initials}
                                                        </div>
                                                        <div className="rewards-wallet-info">
                                                            <strong className="rewards-wallet-name">{company.name}</strong>
                                                            <span className="rewards-wallet-pts">{company.points} puncte</span>
                                                        </div>
                                                        <div className="rewards-wallet-value">
                                                            <strong>= {ronValue} RON</strong>
                                                            <span>reducere disponibilă</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="rewards-wallet-cta"
                                                        onClick={() => navigate(targetPath)}
                                                    >
                                                        Cumpără bilete cu reducere <FiArrowUpRight />
                                                    </button>
                                                </article>
                                            );
                                        })}
                                    </div>
                                    <p className="rewards-rate-note">10 puncte = 1 RON reducere · Reducerea se poate aplica la checkout.</p>
                                </>
                            )}
                        </div>
                    )}

                </main>
                </div>
            </div>

            {isEditModalOpen ? (
                <div className="profile-edit-modal-overlay" onClick={closeEditModal}>
                    <div className="profile-edit-modal" onClick={(eventClick) => eventClick.stopPropagation()}>
                        <button type="button" className="profile-edit-modal-close" onClick={closeEditModal} aria-label="Închide modalul">
                            <FiX />
                        </button>

                        <p className="profile-edit-modal-head">Editează contul</p>

                        <form className="profile-edit-form" onSubmit={handleSaveProfile}>
                            <label>
                                <span>Prenume</span>
                                <input
                                    type="text"
                                    value={profileForm.firstName}
                                    className={profileTouched.firstName && profileFieldErrors.firstName ? 'profile-input-invalid' : ''}
                                    onChange={(eventChange) => {
                                        setProfileForm((prev) => ({ ...prev, firstName: eventChange.target.value }));
                                        if (profileFormError) setProfileFormError('');
                                    }}
                                    onBlur={() => setProfileTouched((prev) => ({ ...prev, firstName: true }))}
                                    required
                                    disabled={isSavingProfile}
                                />
                                {profileTouched.firstName && profileFieldErrors.firstName ? <p className="profile-field-error">{profileFieldErrors.firstName}</p> : null}
                            </label>

                            <label>
                                <span>Nume</span>
                                <input
                                    type="text"
                                    value={profileForm.lastName}
                                    className={profileTouched.lastName && profileFieldErrors.lastName ? 'profile-input-invalid' : ''}
                                    onChange={(eventChange) => {
                                        setProfileForm((prev) => ({ ...prev, lastName: eventChange.target.value }));
                                        if (profileFormError) setProfileFormError('');
                                    }}
                                    onBlur={() => setProfileTouched((prev) => ({ ...prev, lastName: true }))}
                                    required
                                    disabled={isSavingProfile}
                                />
                                {profileTouched.lastName && profileFieldErrors.lastName ? <p className="profile-field-error">{profileFieldErrors.lastName}</p> : null}
                            </label>

                            <label className="full-width">
                                <span>Email</span>
                                <input
                                    type="email"
                                    value={profileForm.email}
                                    className={profileTouched.email && profileFieldErrors.email ? 'profile-input-invalid' : ''}
                                    onChange={(eventChange) => {
                                        setProfileForm((prev) => ({ ...prev, email: eventChange.target.value }));
                                        if (profileFormError) setProfileFormError('');
                                    }}
                                    onBlur={() => setProfileTouched((prev) => ({ ...prev, email: true }))}
                                    required
                                    disabled={isSavingProfile}
                                />
                                {profileTouched.email && profileFieldErrors.email ? <p className="profile-field-error">{profileFieldErrors.email}</p> : null}
                            </label>

                            {profileFormError ? <p className="profile-edit-form-error">{profileFormError}</p> : null}

                            <div className="profile-edit-actions">
                                <button type="button" className="secondary" onClick={closeEditModal} disabled={isSavingProfile}>Anulează</button>
                                <button type="submit" className="primary" disabled={isSavingProfile}>{isSavingProfile ? 'Se salvează...' : 'Salvează'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {pdfPayload ? <TicketPdfRenderer payload={pdfPayload} ref={ticketPdfRef} /> : null}
        </div>
    );
};

export default Profile;