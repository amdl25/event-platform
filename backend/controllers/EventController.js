import { Event, Organization, Category, Account, Participation, TicketType } from '../models/relationships.js';
import { Op } from 'sequelize';
import { getOrgPlan } from '../utils/fileStorage.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

const createInviteToken = () => crypto.randomBytes(18).toString('hex');

const isArchivedEvent = (event) => {
  const referenceDate = event?.end_date || event?.start_date;
  if (!referenceDate) return false;

  const eventDate = new Date(referenceDate);
  if (Number.isNaN(eventDate.getTime())) return false;

  return eventDate < new Date();
};

const canRequesterAccessEvent = async (event, requesterId, requesterRole) => {
  if (!event) return false;
  if (requesterRole === 'admin') return true;
  if (event.creator_id && event.creator_id === requesterId) return true;

  if (requesterRole === 'organizer' && event.org_id && requesterId) {
    const organization = await Organization.findByPk(event.org_id, {
      attributes: ['owner_id']
    });

    return organization?.owner_id === requesterId;
  }

  return false;
};

const parseTicketTypesInput = (value) => {
  if (!value) return [];

  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((ticketType, index) => ({
      name: String(ticketType?.name || '').trim(),
      description: ticketType?.description ? String(ticketType.description).trim() : null,
      price: Number(ticketType?.price || 0),
      quantity: Number(ticketType?.quantity || 0),
      points_reward: Number(ticketType?.points_reward || 0),
      display_order: Number.isFinite(Number(ticketType?.display_order)) ? Number(ticketType.display_order) : index,
      is_active: ticketType?.is_active !== false
    }))
    .filter((ticketType) => ticketType.name.length > 0);
};

const serializeErrorMessage = (error) => {
  if (!error) return 'Eroare necunoscută.';
  if (typeof error === 'string') return error;
  if (error instanceof Error && typeof error.message === 'string') return error.message;
  if (typeof error.message === 'string') return error.message;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

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
          include: [
            { model: Category, as: 'categories', through: { attributes: [] } },
            { model: Account, as: 'creator', attributes: ['first_name', 'last_name'] },
            { model: Organization, as: 'organization', attributes: ['name'] }
          ]
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
          include: [
            { model: Category, as: 'categories', through: { attributes: [] } },
            { model: Account, as: 'creator', attributes: ['first_name', 'last_name'] },
            { model: Organization, as: 'organization', attributes: ['name'] }
          ]
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
      .map(evt => {
        const creatorName = `${evt.creator?.first_name || ''} ${evt.creator?.last_name || ''}`.trim();
        const organizerName = evt.organization?.name || creatorName || 'Organizator';

        return {
          id: evt.id,
          title: evt.title,
          creator_id: evt.creator_id,
          organizer_name: organizerName,
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
        };
      })
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

    const includeArchived = String(req.query.includeArchived || '').toLowerCase() === 'true' && (requesterRole === 'admin' || requesterRole === 'organizer');

    const events = await Event.findAll({
      include: [
        { model: Organization, as: 'organization', attributes: ['name', 'verification_status'] },
        { model: Category, as: 'categories', through: { attributes: [] } },
        { 
          model: TicketType, 
          as: 'ticketTypes',
          attributes: ['id', 'name', 'description', 'price', 'quantity', 'sold_quantity', 'points_reward', 'display_order', 'is_active']
        }
      ],
      order: [['start_date', 'ASC']]
    });

    const visibleEvents = events.filter((event) => {
      if (!includeArchived && isArchivedEvent(event)) {
        return false;
      }

      if (event.moderation_status === 'hidden' || event.moderation_status === 'reported') {
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

            const ticketTypesToCreate = submittedTicketTypes.length > 0
              ? submittedTicketTypes
              : [{
                  name: 'General Access',
                  description: null,
                  price: Number(payload.price) || 0,
                  quantity: Number(payload.max_capacity) || 100,
                  points_reward: Number(payload.points_value) || 0,
                  display_order: 0,
                  is_active: true
                }];

            await TicketType.bulkCreate(
              ticketTypesToCreate.map((ticketType) => ({
                event_id: newEvent.id,
                name: ticketType.name,
                description: ticketType.description,
                price: Number(ticketType.price) || 0,
                quantity: Number(ticketType.quantity) || 0,
                sold_quantity: 0,
                points_reward: Number(ticketType.points_reward) || 0,
                display_order: Number(ticketType.display_order) || 0,
                is_active: ticketType.is_active !== false
              }))
            );
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
        },
        {
          model: TicketType,
          as: 'ticketTypes',
          attributes: ['id', 'name', 'description', 'price', 'quantity', 'sold_quantity', 'points_reward', 'display_order', 'is_active']
        }
      ]
    });

    if (!event) {
      return res.status(404).json({ message: "Evenimentul nu a fost găsit" });
    }

    if (isArchivedEvent(event) && !(await canRequesterAccessEvent(event, requesterId, requesterRole))) {
      return res.status(404).json({ message: "Evenimentul nu a fost găsit" });
    }

    if (event.moderation_status === 'hidden' && !(await canRequesterAccessEvent(event, requesterId, requesterRole))) {
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
    console.log('updateEvent: incoming content-type=', req.headers?.['content-type'] || 'unknown');
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
    const submittedTicketTypes = parseTicketTypesInput(req.body.ticket_types);

    if (requestedStatus && !allowedOrganizerStatuses.includes(requestedStatus)) {
      return res.status(400).json({ message: 'Status invalid pentru eveniment.' });
    }

    if (requestedStatus === 'published' && event.moderation_status === 'reported') {
      return res.status(403).json({ message: 'Evenimentul este blocat de administrator. Contactează adminul sau modifică evenimentul pentru deblocare.' });
    }
    const parsedCategoryIds = Array.isArray(category_ids)
      ? category_ids
      : (() => { try { return JSON.parse(category_ids); } catch { return []; } })();
    const normalizedCategoryIds = parsedCategoryIds.filter(Boolean);

    if (category_id) {
      normalizedCategoryIds.push(category_id);
    }

    const uploadedImageUrl = req.file ? (req.file.url || null) : null;
    console.log('updateEvent: req.file=', req.file ? { filename: req.file.filename, url: req.file.url, originalname: req.file.originalname } : null);
    const hasImageUrlField = Object.prototype.hasOwnProperty.call(req.body, 'image_url');
    const normalizedBodyImageUrl = typeof req.body.image_url === 'string' ? req.body.image_url.trim() : '';
    const nextImageUrl = uploadedImageUrl || (hasImageUrlField ? (normalizedBodyImageUrl || null) : event.image_url);
    console.log('updateEvent: uploadedImageUrl=', uploadedImageUrl, 'hasImageUrlField=', hasImageUrlField, 'normalizedBodyImageUrl=', normalizedBodyImageUrl, 'nextImageUrl=', nextImageUrl);

    await event.update({
      title: req.body.title,
      description: req.body.description,
      location: req.body.location,
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      max_capacity: req.body.max_capacity,
      price: req.body.price,
      points_value: req.body.points_value,
      image_url: nextImageUrl,
      show_guest_list: typeof req.body.show_guest_list === 'boolean' ? req.body.show_guest_list : event.show_guest_list,
      guest_notes: req.body.guest_notes !== undefined ? req.body.guest_notes : event.guest_notes,
      moderation_status: requestedStatus || event.moderation_status,
      creator_id: event.org_id ? null : event.creator_id,
      org_id: event.org_id || null
    });

    if (submittedTicketTypes.length > 0) {
      await TicketType.destroy({ where: { event_id: id } });
      await TicketType.bulkCreate(
        submittedTicketTypes.map((ticketType) => ({
          event_id: id,
          name: ticketType.name,
          description: ticketType.description,
          price: Number(ticketType.price) || 0,
          quantity: Number(ticketType.quantity) || 0,
          sold_quantity: 0,
          points_reward: Number(ticketType.points_reward) || 0,
          display_order: Number(ticketType.display_order) || 0,
          is_active: ticketType.is_active !== false
        }))
      );
    }

    if (normalizedCategoryIds.length > 0) {
      const categories = await Category.findAll({ where: { id: normalizedCategoryIds } });
      await event.setCategories(categories.map((category) => category.id));
    }

    const updatedEvent = await Event.findByPk(id, {
      include: [
        { model: Organization, as: 'organization', attributes: ['name', 'description'] },
        { model: Category, as: 'categories', through: { attributes: [] } },
        { model: TicketType, as: 'ticketTypes' }
      ]
    });

    return res.status(200).json(updatedEvent);
  } catch (error) {
    console.error('updateEvent failed:', error);
    return res.status(500).json({ message: serializeErrorMessage(error) });
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
    const bodyImageUrl = typeof req.body.image_url === 'string' ? req.body.image_url.trim() : '';
    const imageUrl = req.file ? (req.file.url || null) : (bodyImageUrl || null);
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

    const submittedTicketTypes = parseTicketTypesInput(req.body.ticket_types);

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

      if (getOrgPlan(organization.id) === 'gratuit') {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const monthlyCount = await Event.count({
          where: {
            org_id: organization.id,
            start_date: { [Op.between]: [startOfMonth, endOfMonth] },
            moderation_status: { [Op.ne]: 'hidden' }
          }
        });
        if (monthlyCount >= 10) {
          return res.status(403).json({
            message: 'Ai atins limita de 10 evenimente pe lună pentru planul Gratuit. Fă upgrade la Pro pentru evenimente nelimitate.',
            code: 'PLAN_LIMIT_EXCEEDED'
          });
        }
      }
    }

    if (creator.role === 'user' && org_id) {
      return res.status(403).json({ message: 'Contul participant nu poate publica evenimente business.' });
    }

    const parsedCategoryIds = Array.isArray(category_ids)
      ? category_ids
      : (() => { try { return JSON.parse(category_ids); } catch { return []; } })();
    const normalizedCategoryIds = parsedCategoryIds.filter(Boolean);

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
      show_guest_list: Boolean(req.body.show_guest_list),
      guest_notes: req.body.guest_notes || null,
      moderation_status: requestedStatus || 'published',
      creator_id: creator.role === 'user' ? creator_id : null,
      org_id: creator.role === 'user' ? null : org_id,
      image_url: imageUrl
    };

    if (!payload.org_id) {
      payload.private_invite_token = createInviteToken();
      const expiration = new Date();
      expiration.setDate(expiration.getDate() + 60);
      payload.private_invite_token_expires_at = expiration;
    }

    const newEvent = await Event.create(payload);

    const ticketTypesToCreate = submittedTicketTypes.length > 0
      ? submittedTicketTypes
      : [{
          name: 'General Access',
          description: null,
          price: Number(payload.price) || 0,
          quantity: Number(payload.max_capacity) || 100,
          points_reward: Number(payload.points_value) || 0,
          display_order: 0,
          is_active: true
        }];

    await TicketType.bulkCreate(
      ticketTypesToCreate.map((ticketType) => ({
        event_id: newEvent.id,
        name: ticketType.name,
        description: ticketType.description,
        price: Number(ticketType.price) || 0,
        quantity: Number(ticketType.quantity) || 0,
        sold_quantity: 0,
        points_reward: Number(ticketType.points_reward) || 0,
        display_order: Number(ticketType.display_order) || 0,
        is_active: ticketType.is_active !== false
      }))
    );

    if (normalizedCategoryIds.length > 0) {
      const categories = await Category.findAll({ where: { id: normalizedCategoryIds } });
      if (categories.length > 0) {
        await newEvent.setCategories(categories.map((category) => category.id));
      }
    }

    const createdEvent = await Event.findByPk(newEvent.id, {
      include: [
        { model: Category, as: 'categories', through: { attributes: [] } },
        { model: TicketType, as: 'ticketTypes' }
      ]
    });

    res.status(201).json(createdEvent || newEvent);
  } catch (error) {
    console.error('createEvent failed:', error);
    res.status(500).json({ message: serializeErrorMessage(error) });
  }
};

export const getMyPrivateEvents = async (req, res) => {
  try {
    const accountId = req.user?.id || String(req.query?.userId || '').trim();
    if (!accountId) {
      return res.status(401).json({ message: 'Neautorizat.' });
    }

    const createdEvents = await Event.findAll({
      where: { creator_id: accountId, org_id: null },
      include: [
        {
          model: Participation,
          attributes: ['id', 'account_id', 'invite_status', 'buyer_name'],
          include: [
            { model: Account, attributes: ['id', 'first_name', 'last_name'] }
          ]
        }
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
            { model: Account, as: 'creator', attributes: ['id', 'first_name', 'last_name'] },
            {
              model: Participation,
              attributes: ['id', 'account_id', 'invite_status', 'buyer_name'],
              include: [
                { model: Account, attributes: ['id', 'first_name', 'last_name'] }
              ]
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const created = await Promise.all(createdEvents.map(async (event) => {
      let data = event.toJSON();

      if (!data.private_invite_token) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 60);
        const generatedToken = createInviteToken();

        await event.update({
          private_invite_token: generatedToken,
          private_invite_token_expires_at: expiresAt
        });

        data = event.toJSON();
      }

      const participations = data.Participations || [];
      const totalInvited = participations.length;
      const confirmedGuests = participations
        .filter((item) => item.invite_status === 'accepted')
        .map((item) => {
          const firstName = item?.Account?.first_name || '';
          const lastName = item?.Account?.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim() || item?.buyer_name || '';

          if (!fullName) return null;
          return {
            id: item.id,
            firstName: firstName || null,
            lastName: lastName || null,
            fullName
          };
        })
        .filter(Boolean);
      const confirmedCount = confirmedGuests.length;

      return {
        id: data.id,
        title: data.title,
        description: data.description || null,
        location: data.location,
        start_date: data.start_date,
        end_date: data.end_date,
        showGuestList: Boolean(data.show_guest_list),
        guestNotes: data.guest_notes || null,
        inviteLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${data.id}?token=${data.private_invite_token}`,
        inviteExpiresAt: data.private_invite_token_expires_at,
        confirmedCount,
        totalInvited: data.max_capacity > 0 ? data.max_capacity : totalInvited,
        confirmedGuests,
        image_url: data.image_url
      };
    }));

    const invited = invitedParticipations
      .map((participation) => {
        const event = participation.Event;
        if (!event || event.creator_id === accountId) {
          return null;
        }

        const startDate = event.start_date ? new Date(event.start_date) : null;
        if (!startDate || Number.isNaN(startDate.getTime()) || startDate < new Date()) {
          return null;
        }

        const hostName = `${event.creator?.first_name || ''} ${event.creator?.last_name || ''}`.trim() || 'Organizator';
        const eventParticipations = event.Participations || [];
        const canShowGuestList = Boolean(event.show_guest_list);
        const confirmedGuests = eventParticipations
          .filter((item) => item.invite_status === 'accepted')
          .map((item) => {
            const firstName = item?.Account?.first_name || '';
            const lastName = item?.Account?.last_name || '';
            const fullName = `${firstName} ${lastName}`.trim() || item?.buyer_name || '';

            if (!fullName) return null;
            return {
              id: item.id,
              firstName: firstName || null,
              lastName: lastName || null,
              fullName
            };
          })
          .filter(Boolean);

        return {
          participationId: participation.id,
          inviteStatus: participation.invite_status || 'accepted',
          event: {
            id: event.id,
            title: event.title,
            description: event.description || null,
            location: event.location,
            start_date: event.start_date,
            end_date: event.end_date,
            hostName,
            image_url: event.image_url,
            showGuestList: canShowGuestList,
            guestNotes: event.guest_notes || null,
            confirmedCount: confirmedGuests.length,
            totalInvited: event.max_capacity > 0 ? event.max_capacity : eventParticipations.length,
            confirmedGuests: canShowGuestList ? confirmedGuests : []
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

export const regeneratePrivateInviteLink = async (req, res) => {
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
      return res.status(403).json({ message: 'Nu poți regenera linkul acestui eveniment.' });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);

    await event.update({
      private_invite_token: createInviteToken(),
      private_invite_token_expires_at: expiresAt
    });

    return res.status(200).json({
      message: 'Linkul de invitație a fost regenerat.',
      inviteLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${event.id}?token=${event.private_invite_token}`,
      expiresAt: event.private_invite_token_expires_at
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updatePrivateEventSettings = async (req, res) => {
  try {
    const accountId = req.user?.id;
    const { eventId } = req.params;
    const { show_guest_list, guest_notes } = req.body;

    if (!accountId) {
      return res.status(401).json({ message: 'Neautorizat.' });
    }

    const event = await Event.findByPk(eventId);
    if (!event || event.org_id !== null) {
      return res.status(404).json({ message: 'Eveniment privat negăsit.' });
    }

    if (event.creator_id !== accountId) {
      return res.status(403).json({ message: 'Nu poți modifica setările acestui eveniment.' });
    }

    const updates = {};
    if (typeof show_guest_list === 'boolean') {
      updates.show_guest_list = show_guest_list;
    }
    if (guest_notes !== undefined) {
      updates.guest_notes = guest_notes;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Nicio setare validă de actualizat.' });
    }

    await event.update(updates);

    return res.status(200).json({
      message: 'Setările evenimentului au fost actualizate.',
      showGuestList: Boolean(event.show_guest_list),
      guestNotes: event.guest_notes || null
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};