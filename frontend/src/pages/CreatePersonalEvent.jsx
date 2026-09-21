import React, { useEffect, useMemo, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import { useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiCopy, FiExternalLink, FiImage } from 'react-icons/fi';
import API from '../api';
import '../styles/CreatePersonalEvent.css';

const CreatePersonalEvent = ({ user }) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdEventId, setCreatedEventId] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [eventImagePreview, setEventImagePreview] = useState('');
  const [eventImageName, setEventImageName] = useState('');
  const [startTime, setStartTime] = useState('14:30');
  const [endTime, setEndTime] = useState('');
  const [activeTimeMenu, setActiveTimeMenu] = useState(null);
  const startMenuRef = useRef(null);
  const endMenuRef = useRef(null);

  const [showGuestList, setShowGuestList] = useState(false);
  const [guestNotes, setGuestNotes] = useState('');

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

  const endTimeOptions = useMemo(() => {
    const startMinutes = toMinutes(startTime);

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
  }, [startTime]);

  useEffect(() => {
    if (endTime && !endTimeOptions.some((option) => option.value === endTime)) {
      setEndTime('');
    }
  }, [endTime, endTimeOptions]);

  const formatTimeLabel = (timeValue) => {
    if (!timeValue) return '-';
    const [rawHours, rawMinutes] = timeValue.split(':');
    const hours = Number(rawHours);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    return `${String(displayHour).padStart(2, '0')}:${rawMinutes} ${period}`;
  };

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

  const combineDateAndTime = (dateValue, timeValue) => {
    const date = new Date(dateValue);
    const [hours, minutes] = timeValue.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const handleCreateEvent = async () => {
    if (!user?.id) {
      navigate('/login');
      return;
    }

    const cleanTitle = title.trim();
    const cleanLocation = location.trim();
    const cleanDescription = description.trim();
    const cleanGuestNotes = guestNotes.trim();

    if (!cleanTitle) {
      setSubmitError('Titlul evenimentului este obligatoriu.');
      return;
    }

    if (cleanTitle.length < 3 || cleanTitle.length > 120) {
      setSubmitError('Titlul evenimentului trebuie să aibă între 3 și 120 de caractere.');
      return;
    }

    if (!cleanLocation) {
      setSubmitError('Locația este obligatorie.');
      return;
    }

    if (cleanLocation.length < 5 || cleanLocation.length > 180) {
      setSubmitError('Locația trebuie să aibă între 5 și 180 de caractere.');
      return;
    }

    if (cleanDescription.length > 2000) {
      setSubmitError('Descrierea este prea lungă.');
      return;
    }

    if (cleanGuestNotes.length > 500) {
      setSubmitError('Notițele pentru invitați sunt prea lungi.');
      return;
    }

    const startDateTime = combineDateAndTime(startDate, startTime);
    const endDateTime = endTime ? combineDateAndTime(endDate, endTime) : startDateTime;

    if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
      setSubmitError('Completează corect data și ora evenimentului.');
      return;
    }

    if (endDateTime < startDateTime) {
      setSubmitError('Ora de final trebuie să fie după ora de start.');
      return;
    }

    setSubmitError('');
    setIsSubmitting(true);

    try {
      const response = await API.post('/events', {
        title: cleanTitle,
        description: cleanDescription || null,
        location: cleanLocation,
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        creator_id: user.id,
        org_id: user.role === 'organizer' ? user.organizationId : null,
        price: 0,
        max_capacity: 0,
        show_guest_list: showGuestList,
        guest_notes: cleanGuestNotes || null,
      });

      const newEventId = response.data?.id;
      if (newEventId) {
        setCreatedEventId(newEventId);
      }
    } catch (error) {
      setSubmitError(error.response?.data?.message || 'Nu am putut crea evenimentul.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inviteLink = createdEventId ? `${window.location.origin}/invite/${createdEventId}` : '';

  const handleCopyInviteLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyMessage('Link-ul de invitație a fost copiat.');
    } catch {
      setCopyMessage('Nu am putut copia automat link-ul.');
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setEventImageName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setEventImagePreview(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="create-event-page">
      <div className="container-max create-grid">
      
        <aside className="create-sidebar">
          <div className="event-preview-card">
            <label className="preview-image-box">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="preview-image-input"
                onChange={handleImageSelect}
              />

              {eventImagePreview ? (
                <img src={eventImagePreview} alt="Preview eveniment" className="preview-image-preview" />
              ) : (
                <>
                  <FiImage className="preview-image-icon" />
                  <span>Încarcă o imagine</span>
                  <small>JPG, PNG, max 5MB</small>
                </>
              )}
            </label>
            {eventImageName ? <p className="preview-image-name">{eventImageName}</p> : null}
          </div>
        </aside>

        <main className="create-form-area">
          <div className="form-header">
             <span className="badge-category">Eveniment Personal</span>
             <input 
                type="text" 
                className="input-title-large" 
                placeholder="Nume eveniment" 
               value={title}
               maxLength={120}
               onChange={(event) => setTitle(event.target.value)}
             />
          </div>

          <div className="form-sections">
            <div className="input-group">
              <div className="group-icon"><i className="fi fi-rr-calendar"></i></div>
              <div className="group-content">
                <div className="time-row">
                  <span className="label-fixed">Start</span>
                  <DatePicker selected={startDate} onChange={(date) => setStartDate(date || new Date())} className="datepicker-custom" />
                  <div className="time-select-wrap" ref={startMenuRef}>
                    <button
                      type="button"
                      className="time-select-trigger"
                      onClick={() => setActiveTimeMenu(activeTimeMenu === 'start' ? null : 'start')}
                    >
                      {formatTimeLabel(startTime)}
                    </button>
                    {activeTimeMenu === 'start' && (
                      <div className="time-dropdown-menu">
                        {timeOptions.map((time) => (
                          <button
                            key={`start-${time}`}
                            type="button"
                            className={`time-dropdown-item ${startTime === time ? 'selected' : ''}`}
                            onClick={() => {
                              setStartTime(time);
                              setActiveTimeMenu(null);
                            }}
                          >
                            <span className="time-dropdown-main">{formatTimeLabel(time)}</span>
                            <span className="time-dropdown-duration placeholder">00h</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="time-row">
                  <span className="label-fixed">Final</span>
                  <DatePicker selected={endDate} onChange={(date) => setEndDate(date || new Date())} className="datepicker-custom" />
                  <div className="time-select-wrap" ref={endMenuRef}>
                    <button
                      type="button"
                      className="time-select-trigger"
                      onClick={() => setActiveTimeMenu(activeTimeMenu === 'end' ? null : 'end')}
                    >
                      {formatTimeLabel(endTime)}
                    </button>
                    {activeTimeMenu === 'end' && (
                      <div className="time-dropdown-menu">
                        <button
                          type="button"
                          className={`time-dropdown-item ${endTime === '' ? 'selected' : ''}`}
                          onClick={() => {
                            setEndTime('');
                            setActiveTimeMenu(null);
                          }}
                        >
                          <span className="time-dropdown-main">- Fără oră de final</span>
                          <span className="time-dropdown-duration placeholder">optional</span>
                        </button>
                        {endTimeOptions.map((option) => (
                          <button
                            key={`end-${option.value}`}
                            type="button"
                            className={`time-dropdown-item ${endTime === option.value ? 'selected' : ''}`}
                            onClick={() => {
                              setEndTime(option.value);
                              setActiveTimeMenu(null);
                            }}
                          >
                            <span className="time-dropdown-main">{formatTimeLabel(option.value)}</span>
                            <span className="time-dropdown-duration">{option.durationLabel}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="input-group interactive">
              <div className="group-icon"><i className="fi fi-rr-marker"></i></div>
              <input
                type="text"
                className="input-transparent"
                placeholder="Adaugă locația..."
                value={location}
                maxLength={180}
                onChange={(event) => setLocation(event.target.value)}
              />
            </div>

            <div className="input-group interactive">
              <div className="group-icon"><i className="fi fi-rr-document"></i></div>
              <textarea
                className="input-transparent"
                placeholder="Adaugă o descriere..."
                rows="1"
                value={description}
                maxLength={2000}
                onChange={(event) => setDescription(event.target.value)}
              ></textarea>
            </div>

            {submitError ? <p style={{ color: '#d14343', margin: 0 }}>{submitError}</p> : null}

            <div className="extra-options">
              <h4 className="options-subtitle">Opțiuni Eveniment</h4>
              
              <div className="option-item">
                 <div className="option-info"><i className="fi fi-rr-users"></i> Lista de invitați</div>
                 <div className="option-control">
                    <label className="toggle-ui">
                      <input 
                        type="checkbox"
                        checked={showGuestList}
                        onChange={(e) => setShowGuestList(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <span className="toggle-text">{showGuestList ? 'Vizibil' : 'Ascuns'}</span>
                 </div>
              </div>

              <div className="option-item option-item-fullwidth">
                 <div className="option-info"><i className="fi fi-rr-comment"></i></div>
                 <div className="option-control">
                    <textarea
                      className="input-guest-notes"
                      placeholder='Alte detalii'
                      rows="2"
                      value={guestNotes}
                      maxLength={500}
                      onChange={(e) => setGuestNotes(e.target.value)}
                    ></textarea>
                 </div>
              </div>


            </div>

            <button className="btn-submit-event" type="button" onClick={handleCreateEvent} disabled={isSubmitting}>
              {isSubmitting ? 'Se creează...' : 'Creează Eveniment'}
            </button>

            {createdEventId ? (
              <div className="invite-share-sheet">
                <div className="invite-share-header">
                  <FiCheckCircle />
                  <div>
                    <strong>Eveniment creat cu succes! 🎉</strong>
                    <p>Copiază link-ul de invitație și trimite-l prietenilor pe WhatsApp, Messenger sau Instagram.</p>
                  </div>
                </div>
                <div className="invite-link-box">{inviteLink}</div>
                <div className="invite-share-actions">
                  <button type="button" className="invite-action-btn" onClick={handleCopyInviteLink}>
                    <FiCopy /> Copiază Link Invitație
                  </button>
                  <button type="button" className="invite-action-btn secondary" onClick={() => navigate('/calendar')}>
                    <FiExternalLink /> Mergi la Calendarul meu
                  </button>
                </div>
                {copyMessage ? <p className="invite-copy-message">{copyMessage}</p> : null}
              </div>
            ) : null}
          </div>
        </main>

      </div>
    </div>
  );
};

export default CreatePersonalEvent;