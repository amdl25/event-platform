import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import EventDetails from '../components/EventDetails';

const EventDetailsPage = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`http://localhost:5000/events/${id}`);
        
        setEvent(response.data);
      } catch (err) {
        console.error("Eroare la încărcarea evenimentului:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEvent();
    }
  }, [id]);

  if (loading) return <div className="loading-state">Se încarcă detaliile experienței...</div>;
  if (!event) return <div className="error-state">Evenimentul nu a fost găsit.</div>;

  return <EventDetails event={event} />;
};

export default EventDetailsPage;