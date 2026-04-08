import React, { useEffect, useState } from 'react';
import { FiCalendar, FiClock, FiEdit2, FiMapPin, FiX } from 'react-icons/fi';
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
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    maxCapacity: 0,
    price: 0,
    pointsValue: 0,
  });

  useEffect(() => {
    if (!isOpen || !event) return;

    const startDate = event.start_date ? toLocalDateInput(new Date(event.start_date)) : '';
    const startTime = event.start_date ? toLocalTimeInput(new Date(event.start_date)) : '';
    const endDate = event.end_date ? toLocalDateInput(new Date(event.end_date)) : '';
    const endTime = event.end_date ? toLocalTimeInput(new Date(event.end_date)) : '';

    setMode(initialMode);
    setError('');
    setForm({
      title: event.title || '',
      description: event.description || '',
      location: event.location || '',
      startDate,
      startTime,
      endDate,
      endTime,
      maxCapacity: Number(event.max_capacity || 0),
      price: Number(event.price || 0),
      pointsValue: Number(event.points_value || 0),
    });
  }, [event, initialMode, isOpen]);

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
    const endDateTime = new Date(`${form.endDate}T${form.endTime}`);

    if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
      setError('Completează corect data și ora evenimentului.');
      return;
    }

    if (endDateTime <= startDateTime) {
      setError('Data/ora de final trebuie să fie după start.');
      return;
    }

    try {
      setSaving(true);
      const response = await API.patch(`/events/${event.id}`, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        location: form.location.trim(),
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

                <div className="event-modal-datetime-group full-width">
                  <span className="event-modal-group-title">Data și ora</span>
                  <div className="event-modal-datetime-grid">
                    <label className="event-modal-field">
                      <span>Start</span>
                      <input type="date" value={form.startDate} onChange={(eventChange) => handleChange('startDate', eventChange.target.value)} required />
                      <input type="time" value={form.startTime} onChange={(eventChange) => handleChange('startTime', eventChange.target.value)} required />
                    </label>
                    <label className="event-modal-field">
                      <span>Final</span>
                      <input type="date" value={form.endDate} onChange={(eventChange) => handleChange('endDate', eventChange.target.value)} required />
                      <input type="time" value={form.endTime} onChange={(eventChange) => handleChange('endTime', eventChange.target.value)} required />
                    </label>
                  </div>
                </div>

                <div className="event-modal-inline-metrics full-width">
                  <label className="event-modal-field">
                    <span>Capacitate</span>
                    <input type="number" min="0" value={form.maxCapacity} onChange={(eventChange) => handleChange('maxCapacity', eventChange.target.value)} required />
                  </label>
                  <label className="event-modal-field">
                    <span>Preț</span>
                    <input type="number" min="0" step="0.01" value={form.price} onChange={(eventChange) => handleChange('price', eventChange.target.value)} required />
                  </label>
                  <label className="event-modal-field">
                    <span>Puncte</span>
                    <input type="number" min="0" value={form.pointsValue} onChange={(eventChange) => handleChange('pointsValue', eventChange.target.value)} />
                  </label>
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
              </div>

              <div className="event-modal-section">
                <h3>Descriere</h3>
                <p>{event.description || 'Eveniment fără descriere.'}</p>
              </div>

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

              <div className="event-modal-section event-modal-stats">
                <div>
                  <span>Capacitate</span>
                  <strong>{event.max_capacity || 0}</strong>
                </div>
                <div>
                  <span>Preț</span>
                  <strong>{Number(event.price) > 0 ? `${Number(event.price).toFixed(2)} lei` : 'Gratuit'}</strong>
                </div>
                <div>
                  <span>Puncte</span>
                  <strong>{event.points_value || 0}</strong>
                </div>
              </div>
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