import crypto from 'crypto';
import { Account, Event, Participation, Organization } from '../models/relationships.js';

const generateTicketCode = () => `TKT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

const generateTicketQrUrl = (ticketCode, event) => {
  const payload = `ticket:${ticketCode}|event:${event.id}|title:${event.title}|date:${event.start_date}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(payload)}`;
};

export const getInvitePreview = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findByPk(eventId, {
      include: [{ model: Organization, as: 'organization', attributes: ['name'] }],
    });

    if (!event) {
      return res.status(404).json({ message: 'Evenimentul nu a fost găsit' });
    }

    if (event.org_id !== null) {
      return res.status(403).json({ message: 'Link-ul de invitație este disponibil doar pentru evenimente private' });
    }

    return res.json({
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      start_date: event.start_date,
      end_date: event.end_date,
      image_url: event.image_url,
      max_capacity: event.max_capacity,
      current_occupancy: event.current_occupancy,
      creator_id: event.creator_id,
      organizerName: event.organization?.name || 'Eveniment personal',
      inviteLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${event.id}`,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const confirmInviteParticipation = async (req, res) => {
  try {
    const { eventId } = req.params;
    const account_id = req.user?.id;

    if (!account_id) {
      return res.status(400).json({ message: 'account_id este obligatoriu' });
    }

    const [event, account] = await Promise.all([
      Event.findByPk(eventId),
      Account.findByPk(account_id),
    ]);

    if (!event) {
      return res.status(404).json({ message: 'Evenimentul nu a fost găsit' });
    }

    if (!account) {
      return res.status(404).json({ message: 'Contul utilizatorului nu a fost găsit' });
    }

    if (event.org_id !== null) {
      return res.status(403).json({ message: 'Acest endpoint este pentru invitații private' });
    }

    if (event.creator_id === account_id) {
      return res.status(200).json({
        message: 'Ești organizatorul evenimentului. Nu este nevoie să confirmi participarea.',
        alreadyJoined: true,
        isOrganizer: true,
      });
    }

    if (event.current_occupancy >= event.max_capacity) {
      return res.status(400).json({ message: 'Eveniment sold out' });
    }

    const existingParticipation = await Participation.findOne({
      where: { account_id, event_id: eventId },
    });

    if (existingParticipation) {
      return res.status(200).json({
        message: 'Participarea este deja confirmată',
        alreadyJoined: true,
        participationId: existingParticipation.id,
      });
    }

    const ticketCode = generateTicketCode();
    const ticketQr = generateTicketQrUrl(ticketCode, event);
    const buyerName = `${account.first_name || ''} ${account.last_name || ''}`.trim() || account.email;

    const participation = await Participation.create({
      account_id,
      event_id: eventId,
      buyer_name: buyerName,
      buyer_email: account.email,
      ticket_qr: ticketQr,
    });

    await event.increment('current_occupancy', { by: 1 });

    return res.status(201).json({
      message: 'Participare confirmată cu succes',
      alreadyJoined: false,
      participationId: participation.id,
      ticket: {
        code: ticketCode,
        qr: ticketQr,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
