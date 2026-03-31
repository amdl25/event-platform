import { Participation, Event, LoyaltyWallet } from '../models/relationships.js';

export const joinEvent = async (req, res) => {
  const { event_id } = req.body;
  const account_id = req.user?.id;

  if (!account_id) {
    return res.status(401).json({ message: 'Neautorizat' });
  }

  if (!event_id) {
    return res.status(400).json({ message: 'event_id este obligatoriu' });
  }

  try {
    const event = await Event.findByPk(event_id);
    
    if (event.current_occupancy >= event.max_capacity) {
      return res.status(400).json({ message: "Sold Out!" });
    }

    const participation = await Participation.create({
      account_id,
      event_id: event_id,
      status: 'going',
      ticket_qr: `QR-${Math.random().toString(36).substr(2, 9)}`
    });

    await event.increment('current_occupancy');

    res.json({ message: "Te-ai înscris cu succes!", participation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};