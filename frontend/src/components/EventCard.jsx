import React from 'react';

const EventCard = ({ event, onJoin }) => {
  const isPublic = !!event.org_id;
  const occupancyRate = (event.current_occupancy / event.max_capacity) * 100;
  const isFull = event.current_occupancy >= event.max_capacity;

  return (
    <div className={`event-card ${isPublic ? 'card-public' : 'card-private'}`}>
      <div className="card-content">
        {event.points_value > 0 && (
          <span className="points-pill">🪙 {event.points_value} pts</span>
        )}
        
        <span className={`type-badge ${isPublic ? 'badge-public' : 'badge-private'}`}>
          {isPublic ? '🏢 Business / Public' : '👥 Community / Private'}
        </span>

        <h3>{event.title}</h3>
        <p style={{color: '#666', fontSize: '14px'}}>📍 {event.location}</p>

        <div className="occupancy-container">
          <span>{event.current_occupancy} / {event.max_capacity} locuri ocupate</span>
          <div className="progress-bg">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${occupancyRate}%`, 
                backgroundColor: isFull ? '#dc3545' : (isPublic ? '#007bff' : '#28a745') 
              }}
            ></div>
          </div>
        </div>

        <button 
          className="btn-join"
          onClick={() => onJoin(event.id)}
          disabled={isFull}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: isFull ? '#ccc' : '#222',
            color: '#fff',
            cursor: isFull ? 'not-allowed' : 'pointer'
          }}
        >
          {isFull ? 'Sold Out' : 'Rezervă Loc'}
        </button>
      </div>
    </div>
  );
};

export default EventCard;