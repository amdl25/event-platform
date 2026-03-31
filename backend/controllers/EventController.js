import { Event, Organization, Category, Account, Participation } from '../models/relationships.js';

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
        start_date: evt.start_date,
        end_date: evt.end_date,
        start: evt.start_date,
        end: evt.end_date,
        org_id: evt.org_id,
        type: evt.type,
        description: evt.description,
        location: evt.location,
        image_url: evt.image_url,
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
    const events = await Event.findAll({
      include: [
        { model: Organization, as: 'organization', attributes: ['name', 'verification_status'] },
        { model: Category, as: 'categories', through: { attributes: [] } }
      ],
      order: [['start_date', 'ASC']]
    });

    const visibleEvents = events.filter((event) => {
      if (!event.org_id) return true;
      return event.organization?.verification_status === 'verified';
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

    const event = await Event.findByPk(id, {
      include: [
        {
          model: Organization,
          as: 'organization',
          attributes: ['name', 'description']
        }
      ]
    });

    if (!event) {
      return res.status(404).json({ message: "Evenimentul nu a fost găsit" });
    }

    res.json(event);
  } catch (error) {
    console.error("Eroare la preluarea evenimentului:", error);
    res.status(500).json({ message: "Eroare internă de server" });
  }
};

export const createEvent = async (req, res) => {
  try {
    const imageUrl = req.file ? (req.file.url ? req.file.url : `/uploads/${req.file.filename}`) : null;
    const creator_id = req.user?.id;
    const { org_id } = req.body;

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

    const payload = {
      ...req.body,
      creator_id,
      org_id: creator.role === 'user' ? null : org_id,
      image_url: imageUrl
    };

    const newEvent = await Event.create({
      ...payload
    });

    res.status(201).json(newEvent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};