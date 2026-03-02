import { Participation, Event, LoyaltyWallet } from '../models/relationships.js';

export const joinEvent = async (req, res) => {
  const { event_id } = req.body;
  const test_account_id = "ID_USER_TEST";

  try {
    const event = await Event.findByPk(event_id);
    
    if (event.current_occupancy >= event.max_capacity) {
      return res.status(400).json({ message: "Sold Out!" });
    }

    const participation = await Participation.create({
      account_id: test_account_id,
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