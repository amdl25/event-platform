import crypto from 'crypto';
import { Account, Event, Participation, Organization } from '../models/relationships.js';

const generateTicketCode = () => `TKT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
const generateInviteToken = () => crypto.randomBytes(18).toString('hex');

const ensurePrivateEventToken = async (event) => {
  if (event.private_invite_token) return event.private_invite_token;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 60);

  const token = generateInviteToken();
  await event.update({
    private_invite_token: token,
    private_invite_token_expires_at: expiresAt
  });

  return token;
};

const canUseInviteToken = (event, token) => {
  if (!token || !event.private_invite_token) return false;
  if (event.private_invite_token !== token) return false;
  if (event.private_invite_token_expires_at && new Date(event.private_invite_token_expires_at) < new Date()) return false;
  return true;
};

const formatGuestName = (participation) => {
  if (participation?.Account?.first_name) {
    const firstName = participation.Account.first_name;
    const lastInitial = participation.Account.last_name ? `${participation.Account.last_name.charAt(0)}.` : '';
    return `${firstName} ${lastInitial}`.trim();
  }

  if (participation?.buyer_name) return participation.buyer_name;
  return 'Invitat';
};

const generateTicketQrUrl = (ticketCode, event) => {
  const payload = `ticket:${ticketCode}|event:${event.id}|title:${event.title}|date:${event.start_date}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(payload)}`;
};

export const getInvitePreview = async (req, res) => {
  try {
    const { eventId } = req.params;
    const tokenFromQuery = String(req.query?.token || '').trim();
    const requesterId = req.user?.id || null;

    const event = await Event.findByPk(eventId, {
      include: [{ model: Organization, as: 'organization', attributes: ['name'] }],
    });

    if (!event) {
      return res.status(404).json({ message: 'Evenimentul nu a fost găsit' });
    }

    if (event.org_id !== null) {
      return res.status(403).json({ message: 'Link-ul de invitație este disponibil doar pentru evenimente private' });
    }

    const isOrganizer = Boolean(requesterId && requesterId === event.creator_id);
    const ensuredToken = await ensurePrivateEventToken(event);
    const hasValidToken = canUseInviteToken(event, tokenFromQuery);

    if (!isOrganizer && !hasValidToken) {
      return res.status(403).json({ message: 'Link de invitație invalid sau expirat.' });
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
      show_guest_list: Boolean(event.show_guest_list),
      guest_notes: event.guest_notes,
      organizerName: event.organization?.name || 'Eveniment personal',
      requiresLoginToConfirm: true,
      inviteToken: isOrganizer ? ensuredToken : tokenFromQuery,
      inviteLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${event.id}?token=${isOrganizer ? ensuredToken : tokenFromQuery}`,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const confirmInviteParticipation = async (req, res) => {
  try {
    const { eventId } = req.params;
    const account_id = req.user?.id;
    const inviteToken = String(req.body?.inviteToken || '').trim();

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

    await ensurePrivateEventToken(event);

    if (event.creator_id !== account_id && !canUseInviteToken(event, inviteToken)) {
      return res.status(403).json({ message: 'Token de invitație invalid sau expirat.' });
    }

    if (event.creator_id === account_id) {
      return res.status(200).json({
        message: 'Ești organizatorul evenimentului. Nu este nevoie să confirmi participarea.',
        alreadyJoined: true,
        isOrganizer: true,
      });
    }

    const existingParticipation = await Participation.findOne({
      where: { account_id, event_id: eventId },
    });

    if (existingParticipation?.invite_status === 'accepted') {
      return res.status(200).json({
        message: 'Participarea este deja confirmată',
        alreadyJoined: true,
        participationId: existingParticipation.id,
      });
    }

    if (!existingParticipation && event.max_capacity > 0 && event.current_occupancy >= event.max_capacity) {
      return res.status(400).json({ message: 'Eveniment sold out' });
    }

    const ticketCode = generateTicketCode();
    const ticketQr = generateTicketQrUrl(ticketCode, event);
    const buyerName = `${account.first_name || ''} ${account.last_name || ''}`.trim() || account.email;

    let participation = existingParticipation;
    if (!participation) {
      participation = await Participation.create({
        account_id,
        event_id: eventId,
        buyer_name: buyerName,
        buyer_email: account.email,
        ticket_qr: ticketQr,
        status: 'going',
        invite_status: 'accepted'
      });

      await event.increment('current_occupancy', { by: 1 });
    } else {
      const wasAccepted = participation.invite_status === 'accepted';
      await participation.update({
        buyer_name: buyerName,
        buyer_email: account.email,
        ticket_qr: participation.ticket_qr || ticketQr,
        status: 'going',
        invite_status: 'accepted'
      });

      if (!wasAccepted) {
        await event.increment('current_occupancy', { by: 1 });
      }
    }

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

export const getPrivateGuestList = async (req, res) => {
  try {
    const { eventId } = req.params;
    const requesterId = req.user?.id;

    if (!requesterId) {
      return res.status(401).json({ message: 'Neautorizat' });
    }

    const event = await Event.findByPk(eventId);
    if (!event || event.org_id !== null) {
      return res.status(404).json({ message: 'Eveniment privat negăsit.' });
    }

    const isOrganizer = event.creator_id === requesterId;

    if (!isOrganizer) {
      const requesterParticipation = await Participation.findOne({
        where: { event_id: eventId, account_id: requesterId }
      });

      const canViewGuestList = Boolean(event.show_guest_list && requesterParticipation && requesterParticipation.invite_status === 'accepted');
      if (!canViewGuestList) {
        return res.status(403).json({ message: 'Lista invitaților nu este disponibilă.' });
      }
    }

    const where = isOrganizer
      ? { event_id: eventId }
      : { event_id: eventId, invite_status: 'accepted' };

    const guests = await Participation.findAll({
      where,
      include: [{ model: Account, attributes: ['id', 'first_name', 'last_name', 'email'] }],
      order: [['createdAt', 'ASC']]
    });

    const guestList = guests.map((participation) => ({
      id: participation.id,
      displayName: formatGuestName(participation),
      inviteStatus: participation.invite_status,
      status: participation.status,
      email: isOrganizer ? (participation.Account?.email || participation.buyer_email) : null
    }));

    return res.status(200).json({
      eventId,
      showGuestList: Boolean(event.show_guest_list),
      guestNotes: event.guest_notes || null,
      isOrganizer,
      guests: guestList
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
