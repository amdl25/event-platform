import { Event, Organization, Category, Account, Participation } from '../models/relationships.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

export const getUserCalendarEvents = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    if (!requesterId) {
      return res.status(401).json({ message: 'Neautorizat' });
    }

    if (requesterRole !== 'admin' && requesterId !== userId) {
      return res.status(403).json({ message: 'Nu ai acces la calendarul altui utilizator.' });
    }

    const user = await Account.findByPk(userId, {
      include: [
        {
          model: Event,
          as: 'createdEvents',
          include: [{ model: Category, as: 'categories', through: { attributes: [] } }]
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilizator nu a fost găsit' });
    }

    const participations = await Participation.findAll({
      where: { account_id: userId },
      include: [
        {
          model: Event,
          include: [{ model: Category, as: 'categories', through: { attributes: [] } }]
        }
      ]
    });

    const participatedEvents = participations
      .map((participation) => participation.Event)
      .filter(Boolean);

    const allEvents = [...(user.createdEvents || []), ...participatedEvents];
    const uniqueEvents = Array.from(
      new Map(allEvents.map(evt => [evt.id, evt])).values()
    );

    const calendarEvents = uniqueEvents
      .filter(evt => evt.start_date && evt.end_date)
      .map(evt => ({
        id: evt.id,
        title: evt.title,
        creator_id: evt.creator_id,
        start_date: evt.start_date,
        end_date: evt.end_date,
        start: evt.start_date,
        end: evt.end_date,
        org_id: evt.org_id,
        type: evt.type,
        description: evt.description,
        location: evt.location,
        image_url: evt.image_url,
        max_capacity: evt.max_capacity,
        current_occupancy: evt.current_occupancy,
        price: evt.price,
        points_value: evt.points_value,
        categories: evt.categories || [],
        backgroundColor: evt.type === 'private' ? '#9c87ff' : '#00a884',
        textColor: '#ffffff',
        borderColor: 'transparent'
      }))
      .sort((a, b) => new Date(a.start) - new Date(b.start));

    res.json(calendarEvents);
  } catch (error) {
    console.error('Eroare la preluarea evenimentelor calendar:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getAllEvents = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    let requesterId = null;
    let requesterRole = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        requesterId = decoded?.sub || null;
        requesterRole = decoded?.role || null;
      } catch (tokenError) {
        requesterId = null;
        requesterRole = null;
      }
    }

    const events = await Event.findAll({
      include: [
        { model: Organization, as: 'organization', attributes: ['name', 'verification_status'] },
        { model: Category, as: 'categories', through: { attributes: [] } }
      ],
      order: [['start_date', 'ASC']]
    });

    const visibleEvents = events.filter((event) => {
      if (event.moderation_status === 'hidden') {
        return requesterRole === 'admin' || (requesterId && event.creator_id === requesterId);
      }

      if (!event.org_id) {
        return Boolean(requesterId && event.creator_id === requesterId);
      }

      return true;
    });

    const eventData = visibleEvents.map(event => ({
      ...event.toJSON(),
      isFull: event.current_occupancy >= event.max_capacity,
      availableSlots: event.max_capacity - event.current_occupancy
    }));

    res.json(eventData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    let requesterId = null;
    let requesterRole = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        requesterId = decoded?.sub || null;
        requesterRole = decoded?.role || null;
      } catch (tokenError) {
        requesterId = null;
        requesterRole = null;
      }
    }

    const event = await Event.findByPk(id, {
      include: [
        {
          model: Organization,
          as: 'organization',
          attributes: ['name', 'description']
        },
        {
          model: Category,
          as: 'categories',
          through: { attributes: [] }
        }
      ]
    });

    if (!event) {
      return res.status(404).json({ message: "Evenimentul nu a fost găsit" });
    }

    if (event.moderation_status === 'hidden' && requesterRole !== 'admin' && event.creator_id !== requesterId) {
      return res.status(404).json({ message: "Evenimentul nu a fost găsit" });
    }

    res.json(event);
  } catch (error) {
    console.error("Eroare la preluarea evenimentului:", error);
    res.status(500).json({ message: "Eroare internă de server" });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const creatorId = req.user?.id;

    if (!creatorId) {
      return res.status(401).json({ message: 'Neautorizat.' });
    }

    const event = await Event.findByPk(id, {
      include: [{ model: Category, as: 'categories', through: { attributes: [] } }]
    });

    if (!event) {
      return res.status(404).json({ message: 'Evenimentul nu a fost găsit.' });
    }

    const creator = await Account.findByPk(creatorId);
    if (!creator) {
      return res.status(404).json({ message: 'Contul creatorului nu a fost găsit.' });
    }

    if (creator.role === 'organizer') {
      const organization = await Organization.findOne({
        where: { id: event.org_id, owner_id: creatorId }
      });

      if (!organization) {
        return res.status(403).json({ message: 'Nu ai acces la acest eveniment.' });
      }

      if (organization.verification_status !== 'verified') {
        return res.status(403).json({ message: 'Cont în așteptare. Nu poți edita evenimentul până la validare.' });
      }
    }

    if (creator.role === 'user' && event.creator_id !== creatorId) {
      return res.status(403).json({ message: 'Nu ai acces la acest eveniment.' });
    }

    const { category_ids = [], category_id = null } = req.body;
    const requestedStatus = req.body.moderation_status;
    const allowedOrganizerStatuses = ['published', 'hidden'];

    if (requestedStatus && !allowedOrganizerStatuses.includes(requestedStatus)) {
      return res.status(400).json({ message: 'Status invalid pentru eveniment.' });
    }
    const normalizedCategoryIds = Array.isArray(category_ids)
      ? category_ids.filter(Boolean)
      : [];

    if (category_id) {
      normalizedCategoryIds.push(category_id);
    }

    await event.update({
      title: req.body.title,
      description: req.body.description,
      location: req.body.location,
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      max_capacity: req.body.max_capacity,
      price: req.body.price,
      points_value: req.body.points_value,
      moderation_status: requestedStatus || event.moderation_status
    });

    if (normalizedCategoryIds.length > 0) {
      const categories = await Category.findAll({ where: { id: normalizedCategoryIds } });
      await event.setCategories(categories.map((category) => category.id));
    }

    const updatedEvent = await Event.findByPk(id, {
      include: [
        { model: Organization, as: 'organization', attributes: ['name', 'description'] },
        { model: Category, as: 'categories', through: { attributes: [] } }
      ]
    });

    return res.status(200).json(updatedEvent);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    if (!requesterId) {
      return res.status(401).json({ message: 'Neautorizat.' });
    }

    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ message: 'Evenimentul nu a fost găsit.' });
    }

    if (requesterRole === 'organizer') {
      const organization = await Organization.findOne({
        where: { id: event.org_id, owner_id: requesterId }
      });

      if (!organization) {
        return res.status(403).json({ message: 'Nu ai acces la acest eveniment.' });
      }

      if (organization.verification_status !== 'verified') {
        return res.status(403).json({ message: 'Cont în așteptare. Nu poți șterge evenimentul până la validare.' });
      }
    }

    if (requesterRole === 'user' && event.creator_id !== requesterId) {
      return res.status(403).json({ message: 'Nu ai acces la acest eveniment.' });
    }

    if (requesterRole !== 'admin' && requesterRole !== 'organizer' && requesterRole !== 'user') {
      return res.status(403).json({ message: 'Nu ai acces la acest eveniment.' });
    }

    await Participation.destroy({ where: { event_id: id } });
    await event.destroy();

    return res.status(200).json({ message: 'Evenimentul a fost șters.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createEvent = async (req, res) => {
  try {
    const imageUrl = req.file ? (req.file.url ? req.file.url : `/uploads/${req.file.filename}`) : null;
    const creator_id = req.user?.id;
    const { org_id, category_ids = [], category_id = null } = req.body;
    const requestedStatus = req.body.moderation_status;
    const allowedOrganizerStatuses = ['published', 'hidden'];

    if (requestedStatus && !allowedOrganizerStatuses.includes(requestedStatus)) {
      return res.status(400).json({ message: 'Status invalid pentru eveniment.' });
    }

    if (!creator_id) {
      return res.status(400).json({ message: 'creator_id este obligatoriu.' });
    }

    const creator = await Account.findByPk(creator_id);
    if (!creator) {
      return res.status(404).json({ message: 'Contul creatorului nu a fost găsit.' });
    }

    if (creator.role === 'organizer') {
      if (!org_id) {
        return res.status(403).json({
          message: 'Contul de organizator poate publica doar evenimente business, asociate unei organizații.'
        });
      }

      const organization = await Organization.findOne({
        where: {
          id: org_id,
          owner_id: creator_id
        }
      });

      if (!organization) {
        return res.status(403).json({ message: 'Nu ai acces la această organizație.' });
      }

      if (organization.verification_status !== 'verified') {
        return res.status(403).json({
          message: 'Cont în așteptare. Încarcă documentele și așteaptă validarea pentru a publica evenimente.'
        });
      }
    }

    if (creator.role === 'user' && org_id) {
      return res.status(403).json({ message: 'Contul participant nu poate publica evenimente business.' });
    }

    const normalizedCategoryIds = Array.isArray(category_ids)
      ? category_ids.filter(Boolean)
      : [];

    if (category_id) {
      normalizedCategoryIds.push(category_id);
    }

    const payload = {
      title: req.body.title,
      description: req.body.description,
      location: req.body.location,
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      max_capacity: req.body.max_capacity,
      price: req.body.price,
      points_value: req.body.points_value,
      moderation_status: requestedStatus || 'published',
      creator_id,
      org_id: creator.role === 'user' ? null : org_id,
      image_url: imageUrl
    };

    const newEvent = await Event.create(payload);

    if (normalizedCategoryIds.length > 0) {
      const categories = await Category.findAll({ where: { id: normalizedCategoryIds } });
      if (categories.length > 0) {
        await newEvent.setCategories(categories.map((category) => category.id));
      }
    }

    const createdEvent = await Event.findByPk(newEvent.id, {
      include: [{ model: Category, as: 'categories', through: { attributes: [] } }]
    });

    res.status(201).json(createdEvent || newEvent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyPrivateEvents = async (req, res) => {
  try {
    const accountId = req.user?.id;
    if (!accountId) {
      return res.status(401).json({ message: 'Neautorizat.' });
    }

    const createdEvents = await Event.findAll({
      where: { creator_id: accountId, org_id: null },
      include: [
        { model: Participation, attributes: ['id', 'account_id', 'invite_status'] }
      ],
      order: [['start_date', 'DESC']]
    });

    const invitedParticipations = await Participation.findAll({
      where: { account_id: accountId },
      include: [
        {
          model: Event,
          where: { org_id: null },
          include: [
            { model: Account, as: 'creator', attributes: ['id', 'first_name', 'last_name'] }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const created = createdEvents.map((event) => {
      const data = event.toJSON();
      const totalInvited = (data.Participations || []).length;
      const confirmedCount = (data.Participations || []).filter((item) => item.invite_status !== 'rejected').length;

      return {
        id: data.id,
        title: data.title,
        location: data.location,
        start_date: data.start_date,
        end_date: data.end_date,
        inviteLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${data.id}`,
        confirmedCount,
        totalInvited: data.max_capacity > 0 ? data.max_capacity : totalInvited,
        image_url: data.image_url
      };
    });

    const invited = invitedParticipations
      .map((participation) => {
        const event = participation.Event;
        if (!event || event.creator_id === accountId) {
          return null;
        }

        const hostName = `${event.creator?.first_name || ''} ${event.creator?.last_name || ''}`.trim() || 'Gazdă';

        return {
          participationId: participation.id,
          inviteStatus: participation.invite_status || 'accepted',
          event: {
            id: event.id,
            title: event.title,
            location: event.location,
            start_date: event.start_date,
            end_date: event.end_date,
            hostName,
            image_url: event.image_url
          }
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      created,
      invited
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const respondToPrivateInvitation = async (req, res) => {
  try {
    const accountId = req.user?.id;
    const { participationId } = req.params;
    const { action } = req.body;

    if (!accountId) {
      return res.status(401).json({ message: 'Neautorizat.' });
    }

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Acțiune invalidă.' });
    }

    const participation = await Participation.findByPk(participationId, {
      include: [{ model: Event }]
    });

    if (!participation || !participation.Event || participation.Event.org_id !== null) {
      return res.status(404).json({ message: 'Invitația nu a fost găsită.' });
    }

    if (participation.account_id !== accountId) {
      return res.status(403).json({ message: 'Nu ai acces la această invitație.' });
    }

    await participation.update({
      invite_status: action === 'accept' ? 'accepted' : 'rejected',
      status: action === 'accept' ? 'going' : 'canceled'
    });

    return res.status(200).json({
      message: action === 'accept' ? 'Invitație acceptată.' : 'Invitație refuzată.',
      inviteStatus: participation.invite_status
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deletePrivateEvent = async (req, res) => {
  try {
    const accountId = req.user?.id;
    const { eventId } = req.params;

    if (!accountId) {
      return res.status(401).json({ message: 'Neautorizat.' });
    }

    const event = await Event.findByPk(eventId);
    if (!event || event.org_id !== null) {
      return res.status(404).json({ message: 'Eveniment privat negăsit.' });
    }

    if (event.creator_id !== accountId) {
      return res.status(403).json({ message: 'Nu poți șterge acest eveniment.' });
    }

    await Participation.destroy({ where: { event_id: eventId } });
    await event.destroy();

    return res.status(200).json({ message: 'Evenimentul privat a fost șters.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};