import { Participation, Event, LoyaltyWallet } from '../models/relationships.js';

export const getMyTickets = async (req, res) => {
  const accountId = req.user?.id;

  if (!accountId) {
    return res.status(401).json({ message: 'Neautorizat' });
  }

  try {
    const tickets = await Participation.findAll({
      where: { account_id: accountId },
      include: [
        {
          model: Event,
          include: [{ association: 'organization', attributes: ['name'] }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const data = tickets
      .map((ticket) => {
        const event = ticket.Event;
        if (!event) return null;

        const eventDate = event.start_date ? new Date(event.start_date) : null;
        const isFuture = Boolean(eventDate && eventDate > new Date());

        return {
          id: ticket.id,
          ticketQr: ticket.ticket_qr,
          ticketCode: ticket.id ? `TK-${String(ticket.id).slice(0, 8).toUpperCase()}` : 'TK-UNKNOWN',
          purchasedAt: ticket.createdAt,
          status: ticket.status,
          inviteStatus: ticket.invite_status,
          isFuture,
          event: {
            id: event.id,
            title: event.title,
            location: event.location,
            startDate: event.start_date,
            pointsValue: Number(event.points_value || 0),
            organizationName: event.organization?.name || 'Organizator'
          }
        };
      })
      .filter(Boolean);

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

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