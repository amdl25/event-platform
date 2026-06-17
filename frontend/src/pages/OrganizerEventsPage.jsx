import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiClock, FiDollarSign, FiEdit2, FiEye, FiImage, FiMapPin, FiPlus, FiShoppingBag, FiTrash2, FiTrendingUp } from 'react-icons/fi';
import API from '../api';
import OrganizerShell from '../components/OrganizerShell';
import EventPreviewModal from '../components/EventPreviewModal';
import '../styles/OrganizerDashboard.css';

const toLocalDateInput = (date) => {
	const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
	return local.toISOString().slice(0, 10);
};

const toLocalTimeInput = (date) => {
	const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
	return local.toISOString().slice(11, 16);
};

const timeOptions = Array.from({ length: 48 }, (_, index) => {
	const hours = String(Math.floor(index / 2)).padStart(2, '0');
	const minutes = index % 2 === 0 ? '00' : '30';
	return `${hours}:${minutes}`;
});

const toMinutes = (timeValue) => {
	const [hours, minutes] = timeValue.split(':').map(Number);
	return (hours * 60) + minutes;
};

const formatDuration = (durationMinutes) => {
	const hours = Math.floor(durationMinutes / 60);
	const minutes = durationMinutes % 60;

	if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
	if (hours > 0) return `${hours}h`;
	return `${minutes}m`;
};

const formatTimeLabel = (timeValue) => {
	if (!timeValue) return '--:-- --';
	const [rawHours, rawMinutes] = timeValue.split(':');
	const hours = Number(rawHours);
	const period = hours >= 12 ? 'PM' : 'AM';
	const displayHour = hours % 12 === 0 ? 12 : hours % 12;
	return `${String(displayHour).padStart(2, '0')}:${rawMinutes} ${period}`;
};

const createTicketTypeDraft = (overrides = {}) => ({
	id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
	name: 'General Access',
	description: '',
	price: 0,
	quantity: 50,
	points_reward: 0,
	display_order: 0,
	is_active: true,
	...overrides
});

const statusLabel = (event) => {
	const now = new Date();
	const end = event.end_date ? new Date(event.end_date) : null;

	if (end && end < now) return { text: 'Încheiat', className: 'ended' };
	if (event.moderation_status === 'reported') {
		return { text: 'Blocat de Admin', className: 'admin-blocked' };
	}
	if (event.moderation_status === 'hidden') {
		return { text: 'Draft', className: 'draft' };
	}
	return { text: 'Publicat', className: 'published' };
};

const normalizeText = (value) => (
	value
		?.toLowerCase()
		?.trim()
		?.normalize('NFD')
		?.replace(/[\u0300-\u036f]/g, '')
);

const hasDiacritics = (value) => /[ăâîșțĂÂÎȘȚ]/.test(value || '');

const pickPreferredLabels = (values) => {
	const valueMap = new Map();

	values.filter(Boolean).forEach((value) => {
		const key = normalizeText(value);
		const current = valueMap.get(key);

		if (!current || (hasDiacritics(value) && !hasDiacritics(current))) {
			valueMap.set(key, value);
		}
	});

	return [...valueMap.values()];
};

const normalizeAddressLabel = (rawLocation) => {
	const value = rawLocation?.trim();
	if (!value) return '';

	const parts = value
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);

	if (parts.length <= 1) return value;

	const city = parts[parts.length - 1];
	const beforeCity = parts.slice(0, -1).join(', ');
	return beforeCity ? `${beforeCity}, ${city}` : city;
};

const formatNominatimSuggestion = (item) => {
	const address = item?.address || {};
	const city = address.city || address.town || address.village || address.municipality || address.county || '';
	const street = address.road || address.pedestrian || address.footway || address.path || address.amenity || '';
	const houseNumber = address.house_number || '';
	const placeName = item?.name && normalizeText(item.name) !== normalizeText(street) ? item.name : '';

	const mainParts = [];
	if (placeName) mainParts.push(placeName);
	if (street) mainParts.push(houseNumber ? `${street} ${houseNumber}` : street);

	if (mainParts.length > 0) {
		return city ? `${mainParts.join(', ')}, ${city}` : mainParts.join(', ');
	}

	const fallback = String(item?.display_name || '').split(',').map((part) => part.trim()).filter(Boolean);
	if (fallback.length === 0) return '';

	const compact = fallback.slice(0, 3).join(', ');
	if (city && !normalizeText(compact).includes(normalizeText(city))) {
		return `${compact}, ${city}`;
	}
	return compact;
};

const hasCitySuffix = (locationValue) => {
	const parts = String(locationValue || '')
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);

	if (parts.length < 2) return false;

	const city = parts[parts.length - 1];
	return city.length >= 2;
};

const formatErrorMessage = (error, fallback) => {
	const value = error?.response?.data?.message ?? error?.message ?? error;

	if (typeof value === 'string') return value;
	if (value instanceof Error && typeof value.message === 'string') return value.message;

	try {
		return JSON.stringify(value);
	} catch {
		return fallback;
	}
};

const OrganizerEventsPage = ({ user, handleLogout }) => {
	const navigate = useNavigate();
	const location = useLocation();
	const [events, setEvents] = useState([]);
	const [loading, setLoading] = useState(true);
	const [organizerStatus, setOrganizerStatus] = useState(user?.organizerVerificationStatus || 'unverified');
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [categories, setCategories] = useState([]);
	const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
	const [eventFormError, setEventFormError] = useState('');
	const [eventImagePreview, setEventImagePreview] = useState('');
	const [eventImageName, setEventImageName] = useState('');
	const [eventImageFile, setEventImageFile] = useState(null);
	const [imageInputMode, setImageInputMode] = useState('upload');
	const [eventImageUrl, setEventImageUrl] = useState('');
	const [editingEventId, setEditingEventId] = useState('');
	const [activeTab, setActiveTab] = useState('all');
	const [ticketTypes, setTicketTypes] = useState(() => [createTicketTypeDraft()]);
	const [locationSuggestions, setLocationSuggestions] = useState([]);
	const [remoteLocationSuggestions, setRemoteLocationSuggestions] = useState([]);
	const [isLoadingLocationSuggestions, setIsLoadingLocationSuggestions] = useState(false);
	const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
	const [overviewStats, setOverviewStats] = useState({
		totalRevenue: 0,
		soldTickets: 0,
		activeEvents: 0
	});
	const [previewEvent, setPreviewEvent] = useState(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [notifications, setNotifications] = useState([]);
	const [activeTimeMenu, setActiveTimeMenu] = useState(null);
	const startMenuRef = useRef(null);
	const endMenuRef = useRef(null);
	const [eventForm, setEventForm] = useState(() => ({
		title: '',
		description: '',
		location: '',
		startDate: '',
		startTime: '',
		endDate: '',
		endTime: '',
		maxCapacity: 50,
		price: 0,
		pointsValue: 0,
		categoryId: ''
	}));

	useEffect(() => {
		if (!user?.id) { navigate('/'); return; }
		if (user.role !== 'organizer') { navigate('/'); return; }

		const loadData = async () => {
			try {
				const [eventsRes, statusRes, categoriesRes, dashboardRes] = await Promise.all([
					API.get('/events', { params: { includeArchived: true } }),
					API.get(`/auth/organizer/status/${user.id}`),
					API.get('/categories'),
					API.get('/organizer/dashboard')
				]);

				const organizerEvents = (eventsRes.data || []).filter((event) => {
					if (user.organizationId) return event.org_id === user.organizationId;
					return event.creator_id === user.id;
				});

				setEvents(organizerEvents);
				setLocationSuggestions(
					pickPreferredLabels(
						(eventsRes.data || []).map((event) => event.location?.trim()).filter(Boolean)
					)
				);
				setOrganizerStatus(statusRes.data?.verificationStatus || user?.organizerVerificationStatus || 'unverified');
				setOverviewStats({
					totalRevenue: Number(dashboardRes.data?.stats?.totalRevenue || 0),
					soldTickets: Number(dashboardRes.data?.stats?.soldTickets || 0),
					activeEvents: Number(dashboardRes.data?.stats?.activeEvents || 0)
				});
				const categoryList = categoriesRes.data || [];
				setCategories(categoryList);
				if (categoryList.length > 0) {
					setEventForm((prev) => ({
						...prev,
						categoryId: prev.categoryId || categoryList[0].id
					}));
				}
			} catch (error) {
				console.error('Eroare dashboard:', error);
			} finally {
				setLoading(false);
			}

			try {
				const notifRes = await API.get('/organizer/notifications');
				setNotifications(notifRes.data?.notifications || []);
			} catch {
			}
		};
		loadData();
	}, [navigate, user]);

	const loadEventForEditing = async (editEventId) => {
		if (!editEventId) return;

		try {
			const response = await API.get(`/events/${editEventId}`);
			const eventToEdit = response.data;
			if (!eventToEdit) return;

			const startDate = eventToEdit.start_date ? toLocalDateInput(new Date(eventToEdit.start_date)) : '';
			const startTime = eventToEdit.start_date ? toLocalTimeInput(new Date(eventToEdit.start_date)) : '';
			const endDate = eventToEdit.end_date ? toLocalDateInput(new Date(eventToEdit.end_date)) : '';
			const endTime = eventToEdit.end_date ? toLocalTimeInput(new Date(eventToEdit.end_date)) : '';

			setEditingEventId(eventToEdit.id);
			setEventForm({
				title: eventToEdit.title || '',
				description: eventToEdit.description || '',
				location: eventToEdit.location || '',
				startDate,
				startTime,
				endDate,
				endTime,
				maxCapacity: Number(eventToEdit.max_capacity || 50),
				price: Number(eventToEdit.price || 0),
				pointsValue: Number(eventToEdit.points_value || 0),
				categoryId: eventToEdit.categories?.[0]?.id || categories[0]?.id || ''
			});
			setTicketTypes(
				eventToEdit.ticketTypes?.length > 0
					? eventToEdit.ticketTypes.map((ticketType, index) => createTicketTypeDraft({
							id: ticketType.id,
							name: ticketType.name || '',
							description: ticketType.description || '',
							price: Number(ticketType.price || 0),
							quantity: Number(ticketType.quantity || 0),
							points_reward: Number(ticketType.points_reward || 0),
							display_order: Number.isFinite(Number(ticketType.display_order)) ? Number(ticketType.display_order) : index,
							is_active: ticketType.is_active !== false
						}))
					: [createTicketTypeDraft({
							name: eventToEdit.title ? `${eventToEdit.title} - General Access` : 'General Access',
							price: Number(eventToEdit.price || 0),
							quantity: Number(eventToEdit.max_capacity || 50),
							points_reward: Number(eventToEdit.points_value || 0)
						})]
			);
			setEventImagePreview(eventToEdit.image_url || '');
			setEventImageName('');
			setEventImageFile(null);
			setEventImageUrl(eventToEdit.image_url || '');
			setImageInputMode(eventToEdit.image_url ? 'url' : 'upload');
			setEventFormError('');
			setShowCreateModal(true);
		} catch (error) {
			console.error('Eroare la încărcarea evenimentului pentru editare:', error);
		}
	};

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const editEventId = params.get('editEvent');
		if (!editEventId) return;
		loadEventForEditing(editEventId);
	}, [categories, location.search]);

	const handleCreateFormChange = (field, value) => {
		setEventForm((prev) => ({ ...prev, [field]: value }));
		if (field === 'location') setLocationDropdownOpen(true);
	};

	const handleTicketTypeChange = (ticketTypeId, field, value) => {
		setTicketTypes((prev) => prev.map((ticketType) => (
			ticketType.id === ticketTypeId ? { ...ticketType, [field]: value } : ticketType
		)));
	};

	const handleAddTicketType = () => {
		setTicketTypes((prev) => [...prev, createTicketTypeDraft({
			name: `Ticket ${prev.length + 1}`,
			display_order: prev.length
		})]);
	};

	const handleRemoveTicketType = (ticketTypeId) => {
		setTicketTypes((prev) => {
			if (prev.length <= 1) return prev;
			return prev.filter((ticketType) => ticketType.id !== ticketTypeId);
		});
	};

	const filteredLocationSuggestions = useMemo(() => {
		const query = normalizeText(eventForm.location);
		if (!query) return locationSuggestions.slice(0, 8);
		return locationSuggestions
			.filter((location) => normalizeText(location).includes(query))
			.slice(0, 8);
	}, [eventForm.location, locationSuggestions]);

	const mergedLocationSuggestions = useMemo(() => {
		const combined = [...remoteLocationSuggestions, ...filteredLocationSuggestions]
			.map((value) => normalizeAddressLabel(value))
			.filter(Boolean);

		return pickPreferredLabels(combined).slice(0, 8);
	}, [filteredLocationSuggestions, remoteLocationSuggestions]);

	const ticketTypeSummary = useMemo(() => {
		const normalizedTicketTypes = ticketTypes
			.map((ticketType) => ({
				name: String(ticketType.name || '').trim(),
				price: Number(ticketType.price || 0),
				quantity: Number(ticketType.quantity || 0),
				points_reward: Number(ticketType.points_reward || 0)
			}))
			.filter((ticketType) => ticketType.name.length > 0);

		const totalCapacity = normalizedTicketTypes.reduce((sum, ticketType) => sum + ticketType.quantity, 0);
		const lowestPrice = normalizedTicketTypes.length > 0
			? normalizedTicketTypes.reduce((min, ticketType) => Math.min(min, ticketType.price), normalizedTicketTypes[0].price)
			: 0;

		return {
			totalCapacity,
			lowestPrice: Number.isFinite(lowestPrice) ? lowestPrice : 0,
			basePoints: Number(normalizedTicketTypes[0]?.points_reward || 0)
		};
	}, [ticketTypes]);

	const endTimeOptions = useMemo(() => {
		if (!eventForm.startTime) return [];

		const startMinutes = toMinutes(eventForm.startTime);
		return Array.from({ length: 24 }, (_, index) => {
			const durationMinutes = (index + 1) * 30;
			const totalMinutes = (startMinutes + durationMinutes) % (24 * 60);
			const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
			const minutes = String(totalMinutes % 60).padStart(2, '0');
			return {
				value: `${hours}:${minutes}`,
				durationLabel: formatDuration(durationMinutes)
			};
		});
	}, [eventForm.startTime]);

	useEffect(() => {
		if (!eventForm.startTime) return;

		if (!eventForm.endTime || !endTimeOptions.some((option) => option.value === eventForm.endTime)) {
			const fallbackEndTime = endTimeOptions[0]?.value || '';
			if (fallbackEndTime) {
				setEventForm((prev) => ({ ...prev, endTime: fallbackEndTime }));
			}
		}
	}, [endTimeOptions, eventForm.endTime, eventForm.startTime]);

	useEffect(() => {
		const handleClickOutside = (event) => {
			const clickedOutsideStart = startMenuRef.current && !startMenuRef.current.contains(event.target);
			const clickedOutsideEnd = endMenuRef.current && !endMenuRef.current.contains(event.target);

			if (activeTimeMenu === 'start' && clickedOutsideStart) setActiveTimeMenu(null);
			if (activeTimeMenu === 'end' && clickedOutsideEnd) setActiveTimeMenu(null);
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [activeTimeMenu]);

	useEffect(() => {
		if (!showCreateModal) {
			setActiveTimeMenu(null);
		}
	}, [showCreateModal]);

	useEffect(() => {
		if (!showCreateModal) return;

		const query = eventForm.location.trim();
		if (query.length < 3) {
			setRemoteLocationSuggestions([]);
			setIsLoadingLocationSuggestions(false);
			return;
		}

		const controller = new AbortController();
		const timeoutId = window.setTimeout(async () => {
			try {
				setIsLoadingLocationSuggestions(true);
				const searchParams = new URLSearchParams({
					q: query,
					format: 'jsonv2',
					addressdetails: '1',
					'accept-language': 'ro',
					countrycodes: 'ro',
					limit: '8',
					dedupe: '1'
				});

				const response = await fetch(`https://nominatim.openstreetmap.org/search?${searchParams.toString()}`, {
					signal: controller.signal,
					headers: {
						Accept: 'application/json'
					}
				});

				if (!response.ok) {
					throw new Error('Nu am putut încărca sugestiile de locație.');
				}

				const data = await response.json();
				const externalSuggestions = pickPreferredLabels(
					(Array.isArray(data) ? data : [])
						.map((item) => formatNominatimSuggestion(item))
						.filter(Boolean)
				);

				setRemoteLocationSuggestions(externalSuggestions);
			} catch (error) {
				if (error.name !== 'AbortError') {
					setRemoteLocationSuggestions([]);
				}
			} finally {
				setIsLoadingLocationSuggestions(false);
			}
		}, 320);

		return () => {
			window.clearTimeout(timeoutId);
			controller.abort();
		};
	}, [eventForm.location, showCreateModal]);

	const handleLocationSelect = (locationValue) => {
		setEventForm((prev) => ({ ...prev, location: normalizeAddressLabel(locationValue) }));
		setRemoteLocationSuggestions([]);
		setLocationDropdownOpen(false);
	};

	const handleOpenCreateModal = () => {
		if (organizerStatus !== 'verified') {
			return;
		}
		setEventFormError('');
		setEditingEventId('');
		setTicketTypes([createTicketTypeDraft()]);
		setEventForm((prev) => ({
			...prev,
			title: '',
			description: '',
			location: '',
			startDate: '',
			startTime: '',
			endDate: '',
			endTime: '',
			maxCapacity: 50,
			price: 0,
			pointsValue: 0,
			categoryId: categories[0]?.id || ''
		}));
		setEventImagePreview('');
		setEventImageName('');
		setEventImageFile(null);
		setEventImageUrl('');
		setImageInputMode('upload');
		setShowCreateModal(true);
	};

	const handleCloseCreateModal = () => {
		setShowCreateModal(false);
		setEditingEventId('');
		setLocationDropdownOpen(false);

		if (new URLSearchParams(location.search).has('editEvent')) {
			navigate('/organizer/events', { replace: true });
		}
	};

	const handleMarkNotificationsRead = async () => {
		const hasUnread = notifications.some((n) => !n.read);
		if (!hasUnread) return;
		try {
			await API.patch('/organizer/notifications/read-all');
			setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
		} catch {
		}
	};

	const handleViewEvent = (eventId) => {
		const found = events.find((e) => e.id === eventId);
		if (found) setPreviewEvent(found);
	};

	const handleEditEvent = (eventId) => {
		loadEventForEditing(eventId);
	};

	const handleDeleteEvent = async (event) => {
		const confirmed = window.confirm(`Sigur vrei să ștergi evenimentul "${event.title}"?`);
		if (!confirmed) return;

		try {
			await API.delete(`/events/${event.id}`);
			setEvents((prev) => prev.filter((item) => item.id !== event.id));
		} catch (error) {
			setEventFormError(formatErrorMessage(error, 'Nu am putut șterge evenimentul.'));
		}
	};

	const handleImageSelect = (event) => {
		const file = event.target.files?.[0];
		if (!file) return;

		setImageInputMode('upload');
		setEventImageFile(file);
		setEventImageUrl('');
		setEventImageName(file.name);

		const reader = new FileReader();
		reader.onload = () => {
			setEventImagePreview(typeof reader.result === 'string' ? reader.result : '');
		};
		reader.readAsDataURL(file);
	};

	const handleImageUrlChange = (value) => {
		const trimmedValue = value.trim();
		setImageInputMode('url');
		setEventImageUrl(value);
		setEventImageFile(null);
		setEventImageName('');
		setEventImagePreview(trimmedValue);
	};

	const handleCreateEvent = async (event, targetStatus = 'published') => {
		event.preventDefault();
		setEventFormError('');
		const normalizedLocation = normalizeAddressLabel(eventForm.location);

		if (!eventForm.title.trim() || !normalizedLocation) {
			setEventFormError('Titlul și locația sunt obligatorii.');
			return;
		}

		if (!hasCitySuffix(normalizedLocation)) {
			setEventFormError('Locația trebuie completată în formatul „Stradă, Oraș” (orașul după virgulă).');
			return;
		}

		const startDateTime = new Date(`${eventForm.startDate}T${eventForm.startTime}`);
		const endDateTime = new Date(`${eventForm.endDate}T${eventForm.endTime}`);

		if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
			setEventFormError('Completează corect data și ora evenimentului.');
			return;
		}

		if (endDateTime <= startDateTime) {
			setEventFormError('Data/ora de final trebuie să fie după start.');
			return;
		}

		const normalizedTicketTypes = ticketTypes
			.map((ticketType, index) => ({
				name: String(ticketType.name || '').trim(),
				description: String(ticketType.description || '').trim(),
				price: Number(ticketType.price || 0),
				quantity: Number(ticketType.quantity || 0),
				points_reward: Number(ticketType.points_reward || 0),
				display_order: Number.isFinite(Number(ticketType.display_order)) ? Number(ticketType.display_order) : index,
				is_active: ticketType.is_active !== false
			}))
			.filter((ticketType) => ticketType.name.length > 0);

		if (normalizedTicketTypes.length === 0) {
			setEventFormError('Adaugă cel puțin un tip de bilet.');
			return;
		}

		if (normalizedTicketTypes.some((ticketType) => ticketType.quantity <= 0)) {
			setEventFormError('Cantitatea pentru fiecare tip de bilet trebuie să fie mai mare decât 0.');
			return;
		}

		if (imageInputMode === 'url' && eventImageUrl.trim()) {
			try {
				const parsedUrl = new URL(eventImageUrl.trim());
				if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
					throw new Error('invalid');
				}
			} catch {
				setEventFormError('Link-ul imaginii trebuie să fie un URL valid (http/https).');
				return;
			}
		}

		const totalCapacity = normalizedTicketTypes.reduce((sum, ticketType) => sum + Number(ticketType.quantity || 0), 0);
		const lowestPrice = normalizedTicketTypes.reduce((min, ticketType) => Math.min(min, Number(ticketType.price || 0)), Number.POSITIVE_INFINITY);
		const basePrice = Number.isFinite(lowestPrice) ? lowestPrice : 0;
		const basePoints = Number(normalizedTicketTypes[0]?.points_reward || 0);

		try {
			setIsSubmittingEvent(true);
			const payload = {
				title: eventForm.title.trim(),
				description: eventForm.description.trim() || null,
				location: normalizedLocation,
				start_date: startDateTime.toISOString(),
				end_date: endDateTime.toISOString(),
				max_capacity: totalCapacity,
				price: basePrice,
				points_value: basePoints,
				moderation_status: targetStatus,
				org_id: user?.organizationId,
				category_id: eventForm.categoryId || null,
				ticket_types: JSON.stringify(normalizedTicketTypes),
				image_url: imageInputMode === 'url' ? (eventImageUrl.trim() || null) : null
			};

			let response;
			if (imageInputMode === 'upload' && eventImageFile) {
				const formData = new FormData();
				Object.entries(payload).forEach(([key, value]) => {
					if (value !== undefined && value !== null) {
						formData.append(key, String(value));
					}
				});
				formData.append('image', eventImageFile);
				response = editingEventId
					? await API.patch(`/events/${editingEventId}`, formData)
					: await API.post('/events', formData);
			} else {
				response = editingEventId
					? await API.patch(`/events/${editingEventId}`, payload)
					: await API.post('/events', payload);
			}

			const createdEvent = response.data;
			if (createdEvent?.id) {
				setEvents((prev) => {
					if (editingEventId) {
						return prev.map((item) => (item.id === createdEvent.id ? createdEvent : item));
					}
					return [createdEvent, ...prev];
				});
			}

			setShowCreateModal(false);
			setEditingEventId('');
			setEventForm((prev) => ({
				...prev,
				title: '',
				description: '',
				location: '',
				startDate: '',
				startTime: '',
				endDate: '',
				endTime: '',
				price: 0,
				pointsValue: 0,
				maxCapacity: 50
			}));
			setTicketTypes([createTicketTypeDraft()]);
			setEventImagePreview('');
			setEventImageName('');
			setEventImageFile(null);
			setEventImageUrl('');
			setImageInputMode('upload');
		} catch (error) {
			setEventFormError(formatErrorMessage(error, 'Nu am putut crea evenimentul.'));
		} finally {
			setIsSubmittingEvent(false);
		}
	};

	const totalEvents = useMemo(() => events.length, [events]);
	const formatMoney = (value) => `${Number(value || 0).toFixed(0)} RON`;

	const filteredEvents = useMemo(() => {
		let result = events;
		if (activeTab === 'published') result = events.filter((event) => statusLabel(event).text === 'Publicat');
		else if (activeTab === 'draft') result = events.filter((event) => statusLabel(event).text === 'Draft');
		else if (activeTab === 'ended') result = events.filter((event) => statusLabel(event).text === 'Încheiat');
		else if (activeTab === 'blocked') result = events.filter((event) => statusLabel(event).className === 'admin-blocked');

		const query = normalizeText(searchQuery);
		if (!query) return result;

		return result.filter((event) => (
			normalizeText(event.title)?.includes(query)
			|| normalizeText(event.location)?.includes(query)
			|| normalizeText(event.description)?.includes(query)
		));
	}, [activeTab, events, searchQuery]);

	const emptyStateMessage = useMemo(() => {
		if (activeTab === 'published') return 'Nu ai evenimente publicate în acest moment.';
		if (activeTab === 'draft') return 'Nu ai drafturi salvate momentan.';
		if (activeTab === 'ended') return 'Nu ai evenimente încheiate.';
		if (activeTab === 'blocked') return 'Niciun eveniment blocat de administrator.';
		return 'Nu ai evenimente încă. Creează primul eveniment nou.';
	}, [activeTab]);

	const actions = (
		<button
			className="organizer-primary-button organizer-primary-button-large"
			onClick={handleOpenCreateModal}
			disabled={organizerStatus !== 'verified'}
			type="button"
		>
			<FiPlus />
			<span>Eveniment nou</span>
		</button>
	);

	if (loading) {
		return null;
	}

	return (
		<>
			<OrganizerShell user={user} handleLogout={handleLogout} title="Evenimentele mele" subtitle={`${totalEvents} evenimente total`} actions={actions} searchValue={searchQuery} onSearchChange={setSearchQuery} notifications={notifications} onBellClick={handleMarkNotificationsRead}>
			<section className="organizer-stat-grid organizer-status-row" style={{ marginTop: 0 }}>
				<div className="organizer-stat-card compact">
					<div className="organizer-stat-info">
						<label>VENITURI</label>
						<h3>{formatMoney(overviewStats.totalRevenue)}</h3>
					</div>
					<div className="organizer-stat-icon icon-orange"><FiDollarSign /></div>
				</div>
				<div className="organizer-stat-card compact">
					<div className="organizer-stat-info">
						<label>BILETE VÂNDUTE</label>
						<h3 className="text-blue">{overviewStats.soldTickets}</h3>
					</div>
					<div className="organizer-stat-icon icon-blue"><FiShoppingBag /></div>
				</div>
				<div className="organizer-stat-card compact">
					<div className="organizer-stat-info">
						<label>EVENIMENTE ACTIVE</label>
						<h3 className="text-green">{overviewStats.activeEvents}</h3>
					</div>
					<div className="organizer-stat-icon icon-green"><FiTrendingUp /></div>
				</div>
			</section>

			<div className="organizer-events-toolbar">
				<div className="organizer-tabs">
					<button type="button" className={`organizer-tab${activeTab === 'all' ? ' active' : ''}`} onClick={() => setActiveTab('all')}>Toate</button>
					<button type="button" className={`organizer-tab${activeTab === 'published' ? ' active' : ''}`} onClick={() => setActiveTab('published')}>Publicate</button>
					<button type="button" className={`organizer-tab${activeTab === 'draft' ? ' active' : ''}`} onClick={() => setActiveTab('draft')}>Draft</button>
					<button type="button" className={`organizer-tab${activeTab === 'ended' ? ' active' : ''}`} onClick={() => setActiveTab('ended')}>Încheiate</button>
					<button type="button" className={`organizer-tab${activeTab === 'blocked' ? ' active' : ''}`} onClick={() => setActiveTab('blocked')}>Blocate</button>
				</div>
			</div>

			<section className="organizer-events-panel">
				<div className="events-table-wrapper">
					{filteredEvents.length === 0 ? (
						<div className="organizer-empty">{emptyStateMessage}</div>
					) : (
						filteredEvents.map((event) => {
							const progress = Number(event.max_capacity || 0) > 0
								? Math.min(100, Math.round((Number(event.current_occupancy || 0) / Number(event.max_capacity || 1)) * 100))
								: 0;
							const status = statusLabel(event);
							return (
								<article key={event.id} className={`event-row-new${status.className === 'admin-blocked' ? ' event-row-blocked' : ''}`}>
									{status.className === 'admin-blocked' ? (
										<div className="event-admin-blocked-banner">
											Eveniment blocat de administrator — nu poate fi republicat fără aprobare
										</div>
									) : null}
									<div className={`event-accent ${status.className}`} />
									<div className="event-info-cell">
										<div className="event-info-main">
											<div className="event-title-row">
											<h4>{event.title}</h4>
											<span className={`status-tag ${status.className}`}>{status.text}</span>
										</div>
											<div className="event-meta-line">
												<p><FiClock /> {new Date(event.start_date).toLocaleDateString('ro-RO')}</p>
												<p className="sub"><FiMapPin /> {event.location || 'Locație'}</p>
											</div>
										</div>
									</div>

									<div className="event-progress-cell">
										<p>Participanți: <strong>{event.current_occupancy || 0}/{event.max_capacity || '∞'}</strong></p>
										<div className="progress-bg"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
									</div>

									<div className="event-price-cell">
										<span className={`event-price-value${Number(event.price || 0) <= 0 ? ' free' : ''}`}>
											{Number(event.price || 0) <= 0 ? 'Gratuit' : `${Number(event.price).toFixed(0)} RON`}
										</span>
										<div className="event-actions-cell">
											<button type="button" className="event-icon-action view" onClick={() => handleViewEvent(event.id)} title="Vizualizare" aria-label="Vizualizare">
												<FiEye />
											</button>
											<button type="button" className="event-icon-action edit" onClick={() => handleEditEvent(event.id)} title="Modificare" aria-label="Modificare">
												<FiEdit2 />
											</button>
											<button
												type="button"
												className="event-icon-action delete"
												onClick={() => handleDeleteEvent(event)}
												title="Ștergere"
												aria-label="Ștergere"
											>
												<FiTrash2 />
											</button>
										</div>
									</div>
								</article>
							);
						})
					)}
				</div>
			</section>
			</OrganizerShell>

			{showCreateModal ? (
				<div className="organizer-create-modal-backdrop" onClick={handleCloseCreateModal}>
					<div className="organizer-create-modal" onClick={(event) => event.stopPropagation()}>
						<div className="organizer-create-modal-header">
							<h3>{editingEventId ? 'Editează eveniment' : 'Eveniment nou'}</h3>
							<button type="button" className="organizer-create-close" onClick={handleCloseCreateModal}>×</button>
						</div>

						<form className="organizer-create-form" onSubmit={(event) => handleCreateEvent(event, 'published')}>
							<div className="organizer-create-modal-body">
								{eventFormError ? <div className="organizer-create-error">{eventFormError}</div> : null}

								<div className="organizer-create-field">
									<label>Imagine eveniment</label>
									<div className="organizer-image-mode-toggle" role="group" aria-label="Sursă imagine">
										<button
											type="button"
											className={`organizer-image-mode-btn ${imageInputMode === 'upload' ? 'active' : ''}`}
											onClick={() => setImageInputMode('upload')}
										>
											Încarcă fișier
										</button>
										<button
											type="button"
											className={`organizer-image-mode-btn ${imageInputMode === 'url' ? 'active' : ''}`}
											onClick={() => setImageInputMode('url')}
										>
											Link imagine
										</button>
									</div>
									{imageInputMode === 'url' ? (
										<input
											type="url"
											value={eventImageUrl}
											onChange={(event) => handleImageUrlChange(event.target.value)}
											placeholder="https://exemplu.com/imagine.jpg"
										/>
									) : null}
									<label className="organizer-image-upload-box">
										<input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageSelect} hidden disabled={imageInputMode === 'url'} />
										{eventImagePreview ? (
											<img src={eventImagePreview} alt="Preview eveniment" className="organizer-image-preview" />
										) : (
											<div className="organizer-image-placeholder">
												<FiImage />
												<p>Click pentru a adăuga o imagine</p>
												<span>JPG, PNG, max 5MB</span>
											</div>
										)}
									</label>
									{imageInputMode === 'upload' && eventImageName ? <small className="organizer-image-name">{eventImageName}</small> : null}
								</div>

								<div className="organizer-create-field">
									<label>Titlu eveniment</label>
									<input type="text" value={eventForm.title} onChange={(event) => handleCreateFormChange('title', event.target.value)} placeholder="ex: Tech Meetup Bucharest" required />
								</div>

								<div className="organizer-create-field">
									<label>Descriere</label>
									<textarea value={eventForm.description} onChange={(event) => handleCreateFormChange('description', event.target.value)} rows={3} placeholder="Descrie evenimentul tău..." />
								</div>

								<div className="organizer-create-field">
									<label>Locație</label>
									<div className="organizer-location-autocomplete">
										<input
											type="text"
											value={eventForm.location}
											onChange={(event) => handleCreateFormChange('location', event.target.value)}
											onFocus={() => { if (eventForm.location.trim()) setLocationDropdownOpen(true); }}
											onBlur={() => setLocationDropdownOpen(false)}
											placeholder="ex: Hub-ul Digital, Str. Lipscani 45, București"
											autoComplete="off"
											required
										/>
										{locationDropdownOpen && eventForm.location.trim() ? (
											<div className="organizer-location-suggestions" role="listbox" aria-label="Sugestii locație">
												{isLoadingLocationSuggestions ? (
													<p className="organizer-location-suggestion-empty">Căutăm adrese reale în România...</p>
												) : mergedLocationSuggestions.length > 0 ? (
													mergedLocationSuggestions.map((locationValue) => (
														<button
															key={locationValue}
															type="button"
															className="organizer-location-suggestion"
															onMouseDown={(mouseEvent) => mouseEvent.preventDefault()}
															onClick={() => handleLocationSelect(locationValue)}
														>
															{locationValue}
														</button>
													))
												) : (
													<p className="organizer-location-suggestion-empty">Nu am găsit sugestii pentru strada/orașul introdus.</p>
												)}
											</div>
										) : null}
									</div>
									<small className="organizer-location-hint">Format recomandat: Stradă, număr, Oraș</small>
								</div>

								<div className="organizer-create-datetime-block">
									<label className="organizer-create-section-title">Data si ora *</label>
									<div className="organizer-create-datetime-grid">
										<div className="organizer-create-datetime-col">
											<span className="organizer-create-datetime-label">Început</span>
											<input type="date" value={eventForm.startDate} onChange={(event) => handleCreateFormChange('startDate', event.target.value)} required />
											<div className="organizer-time-select-wrap" ref={startMenuRef}>
												<button
													type="button"
													className="organizer-time-select-trigger"
													onClick={() => setActiveTimeMenu(activeTimeMenu === 'start' ? null : 'start')}
												>
													{formatTimeLabel(eventForm.startTime)}
												</button>
												{activeTimeMenu === 'start' ? (
													<div className="organizer-time-dropdown-menu">
														{timeOptions.map((time) => (
															<button
																key={`org-start-${time}`}
																type="button"
																className={`organizer-time-dropdown-item ${eventForm.startTime === time ? 'selected' : ''}`}
																onClick={() => {
																	handleCreateFormChange('startTime', time);
																	setActiveTimeMenu(null);
																}}
															>
																<span className="organizer-time-dropdown-main">{formatTimeLabel(time)}</span>
																<span className="organizer-time-dropdown-duration placeholder">00h</span>
															</button>
														))}
													</div>
												) : null}
											</div>
										</div>

										<div className="organizer-create-datetime-col">
											<span className="organizer-create-datetime-label">Sfârșit</span>
											<input type="date" value={eventForm.endDate} onChange={(event) => handleCreateFormChange('endDate', event.target.value)} required />
											<div className="organizer-time-select-wrap" ref={endMenuRef}>
												<button
													type="button"
													className="organizer-time-select-trigger"
													onClick={() => setActiveTimeMenu(activeTimeMenu === 'end' ? null : 'end')}
												>
													{formatTimeLabel(eventForm.endTime)}
												</button>
												{activeTimeMenu === 'end' ? (
													<div className="organizer-time-dropdown-menu">
														{endTimeOptions.map((option) => (
															<button
																key={`org-end-${option.value}`}
																type="button"
																className={`organizer-time-dropdown-item ${eventForm.endTime === option.value ? 'selected' : ''}`}
																onClick={() => {
																	handleCreateFormChange('endTime', option.value);
																	setActiveTimeMenu(null);
																}}
															>
																<span className="organizer-time-dropdown-main">{formatTimeLabel(option.value)}</span>
																<span className="organizer-time-dropdown-duration">{option.durationLabel}</span>
															</button>
														))}
													</div>
												) : null}
											</div>
										</div>
									</div>
								</div>

								<div className="organizer-create-grid-3">
									<div className="organizer-create-field">
										<label>Capacitate total</label>
										<input type="number" min="1" value={ticketTypeSummary.totalCapacity} readOnly />
									</div>

									<div className="organizer-create-field">
										<label>Preț de pornire (RON)</label>
										<input type="number" min="0" step="0.01" value={ticketTypeSummary.lowestPrice} readOnly />
									</div>

									<div className="organizer-create-field">
										<label>Puncte</label>
										<input type="number" min="0" value={ticketTypeSummary.basePoints} readOnly />
									</div>
								</div>

								<div className="organizer-ticket-types-section">
									<div className="organizer-ticket-types-header">
										<div>
											<label className="organizer-ticket-types-title">Tipuri de bilete</label>
											<p className="organizer-ticket-types-subtitle">Adaugă unul sau mai multe tipuri. Userii le vor vedea exact așa în pagina eventului.</p>
										</div>
										<button type="button" className="organizer-ticket-add" onClick={handleAddTicketType}>
											<FiPlus />
											<span>Adaugă tip</span>
										</button>
									</div>

									<div className="organizer-ticket-types-list">
										{ticketTypes.map((ticketType, index) => (
											<article key={ticketType.id} className="organizer-ticket-type-card">
												<div className="organizer-ticket-type-card-header">
													<strong>Tip #{index + 1}</strong>
													<button
														type="button"
														className="organizer-ticket-remove"
														onClick={() => handleRemoveTicketType(ticketType.id)}
														disabled={ticketTypes.length === 1}
													>
														<FiTrash2 />
														<span>Șterge</span>
													</button>
												</div>

												<div className="organizer-ticket-type-grid">
													<div className="organizer-create-field">
														<label>Nume bilet</label>
														<input
															type="text"
															value={ticketType.name}
															onChange={(event) => handleTicketTypeChange(ticketType.id, 'name', event.target.value)}
															placeholder="ex: Acces General"
															required
														/>
													</div>

													<div className="organizer-create-field">
														<label>Preț (RON)</label>
														<input
															type="number"
															min="0"
															step="0.01"
															value={ticketType.price}
															onChange={(event) => handleTicketTypeChange(ticketType.id, 'price', event.target.value)}
															required
														/>
													</div>

													<div className="organizer-create-field">
														<label>Cantitate</label>
														<input
															type="number"
															min="1"
															value={ticketType.quantity}
															onChange={(event) => handleTicketTypeChange(ticketType.id, 'quantity', event.target.value)}
															required
														/>
													</div>

													<div className="organizer-create-field">
														<label>Puncte</label>
														<input
															type="number"
															min="0"
															value={ticketType.points_reward}
															onChange={(event) => handleTicketTypeChange(ticketType.id, 'points_reward', event.target.value)}
														/>
													</div>

													<div className="organizer-create-field organizer-ticket-type-description">
														<label>Descriere</label>
														<textarea
															rows={2}
															value={ticketType.description}
															onChange={(event) => handleTicketTypeChange(ticketType.id, 'description', event.target.value)}
															placeholder="Ce include acest tip de bilet?"
														/>
													</div>
												</div>
											</article>
										))}
									</div>
								</div>

								<div className="organizer-create-field">
									<label>Categorie</label>
									<select value={eventForm.categoryId} onChange={(event) => handleCreateFormChange('categoryId', event.target.value)} required>
										{categories.map((category) => (
											<option key={category.id} value={category.id}>{category.name}</option>
										))}
									</select>
								</div>
							</div>

							<div className="organizer-create-modal-footer">
								{editingEventId && events.find((e) => e.id === editingEventId)?.moderation_status === 'reported' ? (
									<p className="organizer-create-blocked-note">Blocat de admin — salvează modificările ca draft și contactează administratorul pentru deblocare.</p>
								) : null}
								<button type="button" className="organizer-create-cancel" onClick={handleCloseCreateModal}>Anulează</button>
								<button
									type="button"
									className="organizer-create-draft"
									onClick={(event) => handleCreateEvent(event, 'hidden')}
									disabled={isSubmittingEvent || categories.length === 0}
								>
									{isSubmittingEvent ? 'Se salvează...' : 'Salvează draft'}
								</button>
								<button
									type="submit"
									className="organizer-create-submit"
									disabled={isSubmittingEvent || categories.length === 0 || (editingEventId && events.find((e) => e.id === editingEventId)?.moderation_status === 'reported')}
								>
									{isSubmittingEvent ? (editingEventId ? 'Se salvează...' : 'Se creează...') : (editingEventId ? 'Publică modificările' : 'Publică evenimentul')}
								</button>
							</div>
						</form>
					</div>
				</div>
			) : null}

			{previewEvent ? (
				<EventPreviewModal event={previewEvent} onClose={() => setPreviewEvent(null)} />
			) : null}
		</>
	);
};

export default OrganizerEventsPage;
