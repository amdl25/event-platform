import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import EventDetails from '../components/EventDetails';

const EventDetailsPage = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:5000/api/events/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setEvent(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Eroare la încărcarea evenimentului:", err);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="loading-state">Se încarcă detaliile experienței...</div>;
  if (!event) return <div className="error-state">Evenimentul nu a fost găsit.</div>;

  return <EventDetails event={event} />;
};

export default EventDetailsPage;