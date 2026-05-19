import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowDownRight, FiArrowUpRight, FiCalendar, FiClock, FiDownload, FiEdit2, FiGift, FiMail, FiMapPin, FiPhone, FiStar, FiX } from 'react-icons/fi';
import API from '../api';
import TicketPdfRenderer from '../components/TicketPdfRenderer';
import { downloadTicketsPdf } from '../utils/downloadTicketsPdf';
import '../styles/Profile.css';

const toEditableProfile = (sourceUser = {}) => ({
    firstName: sourceUser?.firstName || sourceUser?.first_name || '',
    lastName: sourceUser?.lastName || sourceUser?.last_name || '',
    email: sourceUser?.email || '',
    city: sourceUser?.city || sourceUser?.location || 'București',
    phone: sourceUser?.phone || '+40 721 234 567',
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
        email: false,
        phone: false,
        city: false
    });

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
        const phone = String(values?.phone || '').trim();
        const city = String(values?.city || '').trim();

        return {
            firstName: !firstName ? 'Prenumele este obligatoriu.' : (firstName.length < 2 ? 'Minim 2 caractere.' : ''),
            lastName: !lastName ? 'Numele este obligatoriu.' : (lastName.length < 2 ? 'Minim 2 caractere.' : ''),
            email: !email
                ? 'Email-ul este obligatoriu.'
                : (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Format email invalid.' : ''),
            phone: phone && !/^[0-9+()\-\s]{7,20}$/.test(phone) ? 'Telefon invalid.' : '',
            city: city.length > 80 ? 'Orașul este prea lung.' : ''
        };
    };

    const verificationFieldErrors = getVerificationFieldErrors(verificationForm);
    const profileFieldErrors = getProfileFieldErrors(profileForm);

    useEffect(() => {
        setProfileData(toEditableProfile(user));
        setProfileForm(toEditableProfile(user));
    }, [user]);

    const totalPoints = Number(loyaltySummary.totalPoints || 0);
    const profileCity = profileData?.city || 'București';
    const profilePhone = profileData?.phone || '+40 721 234 567';
    const greetingName = profileData?.firstName || 'prietene';
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
            email: false,
            phone: false,
            city: false
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
            email: true,
            phone: true,
            city: true
        });

        const firstProfileError = Object.values(getProfileFieldErrors(profileForm)).find(Boolean);
        if (firstProfileError) {
            setProfileFormError(firstProfileError);
            return;
        }

        const nextFirstName = String(profileForm.firstName || '').trim();
        const nextLastName = String(profileForm.lastName || '').trim();
        const nextEmail = String(profileForm.email || '').trim();
        const nextPhone = String(profileForm.phone || '').trim();
        const nextCity = String(profileForm.city || '').trim();

        try {
            setIsSavingProfile(true);
            setProfileFormError('');

            const response = await API.patch('/users/me', {
                firstName: nextFirstName,
                lastName: nextLastName,
                email: nextEmail,
                phone: nextPhone,
                city: nextCity
            });

            const backendProfile = response?.data?.profile || {};
            const updatedProfileData = {
                ...profileData,
                firstName: backendProfile.firstName || nextFirstName,
                lastName: backendProfile.lastName || nextLastName,
                email: backendProfile.email || nextEmail,
                phone: backendProfile.phone || nextPhone || profileData.phone,
                city: backendProfile.city || nextCity || profileData.city,
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
                        phone: updatedProfileData.phone,
                        city: updatedProfileData.city,
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
                <section className="profile-intro-block">
                    <h1 className="profile-intro-title">Bună, <span>{greetingName}</span></h1>
                    <p className="profile-intro-subtitle">Profilul tău, biletele și recompensele.</p>
                </section>
                
                <header className="profile-top-section">
                    <div className="profile-summary-card">
                        <div className="profile-summary-main">
                            <div className="avatar-circle">
                                {profileData?.firstName?.[0] || 'U'}{profileData?.lastName?.[0] || ''}
                            </div>
                            <div className="user-meta">
                                <div className="profile-summary-headline">
                                    <h1>{profileData?.firstName} {profileData?.lastName}</h1>
                                    <button className="profile-edit-link" type="button" onClick={openEditModal}>
                                        <FiEdit2 /> Editează
                                    </button>
                                </div>
                                <div className="profile-contact-list">
                                    <div className="profile-contact-item"><FiMail /> <span>{profileData?.email}</span></div>
                                    <div className="profile-contact-item"><FiPhone /> <span>{profilePhone}</span></div>
                                    <div className="profile-contact-item"><FiMapPin /> <span>{profileCity}</span></div>
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
                                    <article className="rewards-tip-card">
                                        <p className="rewards-tip-title"><FiGift /> SFAT</p>
                                        <p className="rewards-tip-copy">Folosește punctele pentru reduceri la următorul eveniment de la aceeași companie.</p>
                                    </article>

                                    <article className="rewards-company-card demo-preview">
                                        <div className="rewards-company-top">
                                            <div className={`rewards-company-avatar accent-blue`}>
                                                TC
                                            </div>

                                            <div className="rewards-company-info">
                                                <strong>The Coffee Hub</strong>
                                                <span>Disponibile pentru reduceri</span>

                                                <div className="company-expiry-line">
                                                    <span className="company-expiry-dot">●</span>
                                                    <span className="company-expiry-text">353 pct expiră în 12 zile</span>
                                                </div>
                                            </div>

                                            <div className="rewards-company-points">
                                                <strong>353</strong>
                                            </div>
                                        </div>

                                        <div className="rewards-company-footer">
                                            <div className="rewards-company-actions">
                                                <button
                                                    type="button"
                                                    className="btn-link-compact"
                                                    onClick={() => navigate('/explore?orgId=demo')}
                                                >
                                                    Vezi evenimente <FiArrowUpRight className="btn-link-icon" />
                                                </button>
                                            </div>
                                        </div>
                                    </article>

                                    <div className="rewards-company-list">
                                        {rewardsCompanies.length === 0 ? (
                                            <div className="empty-state-card">
                                                <p className="empty-state-text">Nu există puncte acumulate încă.</p>
                                            </div>
                                        ) : rewardsCompanies.map((company) => {
                                            const targetPath = company.orgId ? `/explore?orgId=${company.orgId}` : '/explore';
                                            return (
                                                <article key={company.name} className="rewards-company-card">
                                                    <div className="rewards-company-top">
                                                        <div className={`rewards-company-avatar accent-${company.accent}`}>
                                                            {company.initials}
                                                        </div>

                                                        <div className="rewards-company-info">
                                                            <strong>{company.name}</strong>
                                                            <span>{company.subtitle}</span>

                                                            {company.expiringSoonPoints > 0 ? (
                                                                <div className="company-expiry-line">
                                                                    <span className="company-expiry-dot">●</span>
                                                                    <span className="company-expiry-text">{company.expiringSoonPoints} pct expiră {company.expiryLabel ? `în ${company.expiryLabel}` : 'curând'}</span>
                                                                </div>
                                                            ) : null}
                                                        </div>

                                                        <div className="rewards-company-points">
                                                            <strong>{company.points}</strong>
                                                        </div>
                                                    </div>

                                                    <div className="rewards-company-footer">
                                                        <div className="rewards-company-footer-left" />

                                                        <div className="rewards-company-actions">
                                                            <button
                                                                type="button"
                                                                className="btn-link-compact"
                                                                onClick={() => navigate(targetPath)}
                                                            >
                                                                Vezi evenimente <FiArrowUpRight className="btn-link-icon" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
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

            {isEditModalOpen ? (
                <div className="profile-edit-modal-overlay" onClick={closeEditModal}>
                    <div className="profile-edit-modal" onClick={(eventClick) => eventClick.stopPropagation()}>
                        <button type="button" className="profile-edit-modal-close" onClick={closeEditModal} aria-label="Închide modalul">
                            <FiX />
                        </button>

                        <div className="profile-edit-modal-head">
                            <p>Editare profil</p>
                            <h3>Actualizează detaliile tale</h3>
                        </div>

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

                            <label>
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

                            <label>
                                <span>Telefon</span>
                                <input
                                    type="text"
                                    value={profileForm.phone}
                                    className={profileTouched.phone && profileFieldErrors.phone ? 'profile-input-invalid' : ''}
                                    onChange={(eventChange) => {
                                        setProfileForm((prev) => ({ ...prev, phone: eventChange.target.value }));
                                        if (profileFormError) setProfileFormError('');
                                    }}
                                    onBlur={() => setProfileTouched((prev) => ({ ...prev, phone: true }))}
                                    disabled={isSavingProfile}
                                />
                                {profileTouched.phone && profileFieldErrors.phone ? <p className="profile-field-error">{profileFieldErrors.phone}</p> : null}
                            </label>

                            <label className="full-width">
                                <span>Oraș</span>
                                <input
                                    type="text"
                                    value={profileForm.city}
                                    className={profileTouched.city && profileFieldErrors.city ? 'profile-input-invalid' : ''}
                                    onChange={(eventChange) => {
                                        setProfileForm((prev) => ({ ...prev, city: eventChange.target.value }));
                                        if (profileFormError) setProfileFormError('');
                                    }}
                                    onBlur={() => setProfileTouched((prev) => ({ ...prev, city: true }))}
                                    disabled={isSavingProfile}
                                />
                                {profileTouched.city && profileFieldErrors.city ? <p className="profile-field-error">{profileFieldErrors.city}</p> : null}
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