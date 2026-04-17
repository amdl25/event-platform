import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiCalendar, FiClock, FiEdit2, FiMapPin, FiUser, FiX } from 'react-icons/fi';
import API, { API_BASE } from '../api';
import { getEventDateLabel, getEventTimeRangeLabel } from '../utils/eventDateTime';
import '../styles/EventDetailsModal.css';

const toLocalDateInput = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const toLocalTimeInput = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(11, 16);
};

const buildTimeOptions = () => Array.from({ length: 48 }, (_, index) => {
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
  if (!timeValue) return '-';
  const [rawHours, rawMinutes] = timeValue.split(':');
  const hours = Number(rawHours);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(displayHour).padStart(2, '0')}:${rawMinutes} ${period}`;
};

const EventDetailsModal = ({
  isOpen,
  event,
  onClose,
  canEdit = false,
  initialMode = 'view',
  onSaved,
}) => {
  const [mode, setMode] = useState(initialMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [guestList, setGuestList] = useState([]);
  const [guestListLoading, setGuestListLoading] = useState(false);
  const [guestListError, setGuestListError] = useState('');
  const [guestListMeta, setGuestListMeta] = useState({
    showGuestList: false,
    guestNotes: '',
    isOrganizer: false,
  });
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    guestNotes: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    maxCapacity: 0,
    price: 0,
    pointsValue: 0,
  });
  const [activeTimeMenu, setActiveTimeMenu] = useState(null);
  const startMenuRef = useRef(null);
  const endMenuRef = useRef(null);

  const timeOptions = useMemo(() => buildTimeOptions(), []);
  const endTimeOptions = useMemo(() => {
    if (!form.startTime) return [];

    const startMinutes = toMinutes(form.startTime);
    return Array.from({ length: 24 }, (_, index) => {
      const durationMinutes = (index + 1) * 30;
      const totalMinutes = (startMinutes + durationMinutes) % (24 * 60);
      const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
      const minutes = String(totalMinutes % 60).padStart(2, '0');
      return {
        value: `${hours}:${minutes}`,
        durationLabel: formatDuration(durationMinutes),
      };
    });
  }, [form.startTime]);

  useEffect(() => {
    if (!isOpen || !event) return;

    const startDate = event.start_date ? toLocalDateInput(new Date(event.start_date)) : '';
    const startTime = event.start_date ? toLocalTimeInput(new Date(event.start_date)) : '';
    const endDate = event.end_date ? toLocalDateInput(new Date(event.end_date)) : '';
    const endTimeValue = event.end_date ? toLocalTimeInput(new Date(event.end_date)) : '';
    const endTime = (startDate && startTime && endDate && endTimeValue && startDate === endDate && startTime === endTimeValue)
      ? ''
      : endTimeValue;

    setMode(initialMode);
    setError('');
    setForm({
      title: event.title || '',
      description: event.description || '',
      location: event.location || '',
      guestNotes: event.guest_notes || '',
      startDate,
      startTime,
      endDate,
      endTime,
      maxCapacity: Number(event.max_capacity || 0),
      price: Number(event.price || 0),
      pointsValue: Number(event.points_value || 0),
    });

    setGuestList([]);
    setGuestListError('');
    setGuestListMeta({
      showGuestList: false,
      guestNotes: '',
      isOrganizer: false,
    });
  }, [event, initialMode, isOpen]);

  useEffect(() => {
    const loadGuestList = async () => {
      if (!isOpen || !event?.id) return;

      const isPrivateEvent = event.org_id === null || event.org_id === undefined;
      if (!isPrivateEvent || !canEdit) return;

      try {
        setGuestListLoading(true);
        setGuestListError('');

        const response = await API.get(`/events/private/${event.id}/guests`);
        const guests = Array.isArray(response.data?.guests) ? response.data.guests : [];

        setGuestList(guests);
        setGuestListMeta({
          showGuestList: Boolean(response.data?.showGuestList),
          guestNotes: response.data?.guestNotes || '',
          isOrganizer: Boolean(response.data?.isOrganizer),
        });
      } catch (guestError) {
        setGuestList([]);
        setGuestListError(guestError.response?.data?.message || 'Nu am putut încărca lista invitaților.');
      } finally {
        setGuestListLoading(false);
      }
    };

    loadGuestList();
  }, [canEdit, event?.id, event?.org_id, isOpen]);

  useEffect(() => {
    const handleClickOutside = (eventClick) => {
      const clickedOutsideStart = startMenuRef.current && !startMenuRef.current.contains(eventClick.target);
      const clickedOutsideEnd = endMenuRef.current && !endMenuRef.current.contains(eventClick.target);

      if (activeTimeMenu === 'start' && clickedOutsideStart) setActiveTimeMenu(null);
      if (activeTimeMenu === 'end' && clickedOutsideEnd) setActiveTimeMenu(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeTimeMenu]);

  useEffect(() => {
    if (form.endTime && !endTimeOptions.some((option) => option.value === form.endTime)) {
      setForm((prev) => ({ ...prev, endTime: '' }));
    }
  }, [endTimeOptions, form.endTime]);

  if (!isOpen || !event) return null;

  const eventImage = event.image_url
    ? (event.image_url.startsWith('http') || event.image_url.startsWith('data:')
      ? event.image_url
      : `${API_BASE}${event.image_url}`)
    : '';

  const startLabel = event.start_date ? getEventDateLabel(event.start_date, 'ro-RO') : 'Data nespecificată';
  const timeRangeLabel = getEventTimeRangeLabel(event.start_date, event.end_date);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    setError('');

    const startDateTime = new Date(`${form.startDate}T${form.startTime}`);
    if (Number.isNaN(startDateTime.getTime())) {
      setError('Completează corect data și ora evenimentului.');
      return;
    }

    const endDateTime = form.endTime
      ? new Date(`${form.endDate || form.startDate}T${form.endTime}`)
      : startDateTime;

    if (form.endTime && Number.isNaN(endDateTime.getTime())) {
      setError('Completează corect data și ora de final.');
      return;
    }

    if (form.endTime && endDateTime <= startDateTime) {
      setError('Data/ora de final trebuie să fie după start.');
      return;
    }

    try {
      setSaving(true);
      const response = await API.patch(`/events/${event.id}`, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        location: form.location.trim(),
        guest_notes: form.guestNotes.trim() || null,
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        max_capacity: Number(form.maxCapacity || 0),
        price: Number(form.price || 0),
        points_value: Number(form.pointsValue || 0),
      });

      if (onSaved) {
        onSaved(response.data);
      }
      onClose();
    } catch (patchError) {
      setError(patchError.response?.data?.message || 'Nu am putut salva modificările.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="event-modal-backdrop" onClick={onClose}>
      <div className="event-modal-panel" onClick={(clickEvent) => clickEvent.stopPropagation()}>
        <button type="button" className="event-modal-close" onClick={onClose} aria-label="Închide modalul">
          <FiX />
        </button>

        {mode === 'edit' ? (
          <form className="event-modal-edit-form" onSubmit={handleSubmit}>
            <div className="event-modal-hero">
              {eventImage ? <img src={eventImage} alt={event.title} /> : <div className="event-modal-hero-placeholder">{event.title}</div>}
            </div>

            <div className="event-modal-content scrollable">
              <div className="event-modal-header-row">
                <div>
                  <p className="event-modal-kicker">Editare eveniment</p>
                  <h2>{event.title}</h2>
                </div>
                <button type="button" className="event-modal-secondary-action" onClick={() => setMode('view')}>
                  Vezi detalii
                </button>
              </div>

              {error ? <div className="event-modal-error">{error}</div> : null}

              <div className="event-modal-form-grid">
                <label className="event-modal-field">
                  <span>Titlu</span>
                  <input value={form.title} onChange={(eventChange) => handleChange('title', eventChange.target.value)} required />
                </label>
                <label className="event-modal-field full-width">
                  <span>Descriere</span>
                  <textarea rows="4" value={form.description} onChange={(eventChange) => handleChange('description', eventChange.target.value)} />
                </label>
                <label className="event-modal-field full-width">
                  <span>Locație</span>
                  <input value={form.location} onChange={(eventChange) => handleChange('location', eventChange.target.value)} required />
                </label>

                <label className="event-modal-field full-width">
                  <span>Alte detalii</span>
                  <textarea
                    rows="4"
                    value={form.guestNotes}
                    onChange={(eventChange) => handleChange('guestNotes', eventChange.target.value)}
                    placeholder="Adaugă informații utile pentru invitați"
                  />
                </label>

                <div className="event-modal-datetime-group full-width">
                  <span className="event-modal-group-title">Data și ora</span>
                  <div className="event-modal-datetime-grid">
                    <label className="event-modal-field">
                      <span>Start</span>
                      <input type="date" value={form.startDate} onChange={(eventChange) => handleChange('startDate', eventChange.target.value)} required />
                      <div className="event-modal-time-select-wrap" ref={startMenuRef}>
                        <button
                          type="button"
                          className="event-modal-time-select-trigger"
                          onClick={() => setActiveTimeMenu(activeTimeMenu === 'start' ? null : 'start')}
                        >
                          {formatTimeLabel(form.startTime)}
                        </button>
                        {activeTimeMenu === 'start' ? (
                          <div className="event-modal-time-dropdown-menu">
                            {timeOptions.map((timeValue) => (
                              <button
                                key={`modal-start-${timeValue}`}
                                type="button"
                                className={`event-modal-time-dropdown-item ${form.startTime === timeValue ? 'selected' : ''}`}
                                onClick={() => {
                                  handleChange('startTime', timeValue);
                                  setActiveTimeMenu(null);
                                }}
                              >
                                <span className="event-modal-time-dropdown-main">{formatTimeLabel(timeValue)}</span>
                                <span className="event-modal-time-dropdown-duration placeholder">00h</span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </label>
                    <label className="event-modal-field">
                      <span>Final</span>
                      <input
                        type="date"
                        value={form.endDate}
                        onChange={(eventChange) => handleChange('endDate', eventChange.target.value)}
                        required={Boolean(form.endTime)}
                        disabled={!form.endTime}
                      />
                      <div className="event-modal-time-select-wrap" ref={endMenuRef}>
                        <button
                          type="button"
                          className="event-modal-time-select-trigger"
                          onClick={() => setActiveTimeMenu(activeTimeMenu === 'end' ? null : 'end')}
                        >
                          {form.endTime ? formatTimeLabel(form.endTime) : '-'}
                        </button>
                        {activeTimeMenu === 'end' ? (
                          <div className="event-modal-time-dropdown-menu">
                            <button
                              type="button"
                              className={`event-modal-time-dropdown-item ${form.endTime === '' ? 'selected' : ''}`}
                              onClick={() => {
                                handleChange('endTime', '');
                                handleChange('endDate', form.startDate);
                                setActiveTimeMenu(null);
                              }}
                            >
                              <span className="event-modal-time-dropdown-main">- Fără oră de final</span>
                              <span className="event-modal-time-dropdown-duration placeholder">00h</span>
                            </button>
                            {endTimeOptions.map((option) => (
                              <button
                                key={`modal-end-${option.value}`}
                                type="button"
                                className={`event-modal-time-dropdown-item ${form.endTime === option.value ? 'selected' : ''}`}
                                onClick={() => {
                                  handleChange('endTime', option.value);
                                  setActiveTimeMenu(null);
                                }}
                              >
                                <span className="event-modal-time-dropdown-main">{formatTimeLabel(option.value)}</span>
                                <span className="event-modal-time-dropdown-duration">{option.durationLabel}</span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </label>
                  </div>
                </div>

              </div>
            </div>

            <div className="event-modal-footer">
              <button type="button" className="event-modal-secondary-button" onClick={onClose}>Anulează</button>
              <button type="submit" className="event-modal-primary-button" disabled={saving}>
                {saving ? 'Se salvează...' : 'Salvează modificările'}
              </button>
            </div>
          </form>
        ) : (
          <div className="event-modal-view">
            <div className="event-modal-hero">
              {eventImage ? <img src={eventImage} alt={event.title} /> : <div className="event-modal-hero-placeholder">{event.title}</div>}
            </div>

            <div className="event-modal-content scrollable">
              <div className="event-modal-header-row">
                <div>
                  <p className="event-modal-kicker">Detalii eveniment</p>
                  <h2>{event.title}</h2>
                </div>
                {canEdit ? (
                  <button type="button" className="event-modal-primary-button event-modal-header-edit" onClick={() => setMode('edit')}>
                    <FiEdit2 /> Editează
                  </button>
                ) : null}
              </div>

              <div className="event-modal-meta-grid">
                <div className="event-modal-meta-item">
                  <FiCalendar />
                  <div>
                    <span>Data</span>
                    <strong>{startLabel}</strong>
                  </div>
                </div>
                <div className="event-modal-meta-item">
                  <FiClock />
                  <div>
                    <span>Ora</span>
                    <strong>{timeRangeLabel || 'Ora nespecificată'}</strong>
                  </div>
                </div>
                <div className="event-modal-meta-item">
                  <FiMapPin />
                  <div>
                    <span>Locație</span>
                    <strong>{event.location || 'Locație nespecificată'}</strong>
                  </div>
                </div>
                {event.organizer_name ? (
                  <div className="event-modal-meta-item">
                    <FiUser />
                    <div>
                      <span>Organizator</span>
                      <strong>{event.organizer_name}</strong>
                    </div>
                  </div>
                ) : null}
              </div>

              {event.description ? (
                <div className="event-modal-section">
                  <h3>Descriere</h3>
                  <p>{event.description}</p>
                </div>
              ) : null}

              {event.guest_notes ? (
                <div className="event-modal-section">
                  <h3>Alte detalii</h3>
                  <p>{event.guest_notes}</p>
                </div>
              ) : null}

              {event.categories?.length ? (
                <div className="event-modal-section">
                  <h3>Categorii</h3>
                  <div className="event-modal-tags">
                    {event.categories.map((category) => (
                      <span key={category.id} className="event-modal-tag">{category.name}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              {canEdit && (event.org_id === null || event.org_id === undefined) ? (
                <div className="event-modal-section event-modal-guests-section">
                  <div className="event-modal-guests-header">
                    <h3>Lista invitaților</h3>
                    <span className={`guest-visibility-chip ${guestListMeta.showGuestList ? 'visible' : 'hidden'}`}>
                      {guestListMeta.showGuestList ? 'Vizibilă invitaților' : 'Ascunsă invitaților'}
                    </span>
                  </div>

                  {guestListMeta.guestNotes ? <p className="event-modal-guest-notes">{guestListMeta.guestNotes}</p> : null}

                  {guestListLoading ? <p className="event-modal-guest-state">Se încarcă invitații...</p> : null}
                  {!guestListLoading && guestListError ? <p className="event-modal-guest-state error">{guestListError}</p> : null}
                  {!guestListLoading && !guestListError && guestList.length === 0 ? (
                    <p className="event-modal-guest-state">Niciun invitat încă.</p>
                  ) : null}

                  {!guestListLoading && !guestListError && guestList.length > 0 ? (
                    <ul className="event-modal-guest-list">
                      {guestList.map((guest) => (
                        <li key={guest.id} className="event-modal-guest-item">
                          <div>
                            <strong>{guest.displayName || 'Invitat'}</strong>
                            {guest.email ? <small>{guest.email}</small> : null}
                          </div>
                          <span className={`guest-status-pill ${guest.inviteStatus === 'accepted' ? 'accepted' : 'pending'}`}>
                            {guest.inviteStatus === 'accepted' ? 'Acceptat' : 'În așteptare'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="event-modal-footer">
              <button type="button" className="event-modal-secondary-button" onClick={onClose}>Închide</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetailsModal;