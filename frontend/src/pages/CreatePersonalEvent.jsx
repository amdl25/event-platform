import React, { useEffect, useMemo, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import '../styles/CreatePersonalEvent.css';

const CreatePersonalEvent = () => {
  const [startTime, setStartTime] = useState('14:30');
  const [endTime, setEndTime] = useState('15:30');
  const [activeTimeMenu, setActiveTimeMenu] = useState(null);
  const startMenuRef = useRef(null);
  const endMenuRef = useRef(null);

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
    if (!endTimeOptions.some((option) => option.value === endTime)) {
      setEndTime(endTimeOptions[0].value);
    }
  }, [endTime, endTimeOptions]);

  const formatTimeLabel = (timeValue) => {
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

  return (
    <div className="create-event-page">
      <div className="container-max create-grid">
        
        <aside className="create-sidebar">
          <div className="event-preview-card">
            <div className="preview-image-box">
               <i className="fi fi-rr-picture"></i>
               <span>Încarcă o imagine</span>
            </div>
          </div>
        </aside>

        <main className="create-form-area">
          <div className="form-header">
             <span className="badge-category">Eveniment Personal</span>
             <input 
                type="text" 
                className="input-title-large" 
                placeholder="Nume eveniment" 
             />
          </div>

          <div className="form-sections">
            <div className="input-group">
              <div className="group-icon"><i className="fi fi-rr-calendar"></i></div>
              <div className="group-content">
                <div className="time-row">
                  <span className="label-fixed">Start</span>
                  <DatePicker selected={new Date()} className="datepicker-custom" />
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
                  <DatePicker selected={new Date()} className="datepicker-custom" />
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
              <input type="text" className="input-transparent" placeholder="Adaugă locația..." />
            </div>

            <div className="input-group interactive">
              <div className="group-icon"><i className="fi fi-rr-document"></i></div>
              <textarea className="input-transparent" placeholder="Adaugă o descriere..." rows="1"></textarea>
            </div>

            <div className="extra-options">
              <h4 className="options-subtitle">Opțiuni Eveniment</h4>
              
              <div className="option-item">
                 <div className="option-info"><i className="fi fi-rr-ticket"></i> Preț bilet</div>
                 <div className="option-control">Gratuit <i className="fi fi-rr-edit"></i></div>
              </div>

              <div className="option-item">
                 <div className="option-info"><i className="fi fi-rr-user-add"></i> Necesită aprobare</div>
                 <div className="option-control">
                    <label className="toggle-ui">
                      <input type="checkbox" />
                      <span className="toggle-slider"></span>
                    </label>
                 </div>
              </div>
            </div>

            <button className="btn-submit-event">Creează Eveniment</button>
          </div>
        </main>

      </div>
    </div>
  );
};

export default CreatePersonalEvent;