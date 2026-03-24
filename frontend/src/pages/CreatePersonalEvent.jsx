import React from 'react';
import DatePicker from 'react-datepicker';
import '../styles/CreatePersonalEvent.css';

const CreatePersonalEvent = () => {
  return (
    <div className="create-event-page">
      <div className="container-max create-grid">
        
        <aside className="create-sidebar">
          <div className="event-preview-card">
            <div className="preview-image-box">
               <i className="fi fi-rr-picture"></i>
               <span>Încarcă o imagine</span>
            </div>
            <div className="theme-controls">
              <div className="theme-label">
                <small>Aspect</small>
                <strong>Minimalist</strong>
              </div>
              <button className="btn-shuffle"><i className="fi fi-rr-shuffle"></i></button>
            </div>
          </div>
        </aside>

        <main className="create-form-area">
          <div className="form-header">
             <span className="badge-category">Eveniment Personal</span>
             <input 
                type="text" 
                className="input-title-large" 
                placeholder="Titlul evenimentului..." 
             />
          </div>

          <div className="form-sections">
            <div className="input-group">
              <div className="group-icon"><i className="fi fi-rr-calendar"></i></div>
              <div className="group-content">
                <div className="time-row">
                  <span className="label-fixed">Start</span>
                  <DatePicker selected={new Date()} className="datepicker-custom" />
                  <span className="value-fixed">14:30</span>
                </div>
                <div className="time-row">
                  <span className="label-fixed">Final</span>
                  <DatePicker selected={new Date()} className="datepicker-custom" />
                  <span className="value-fixed">15:30</span>
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