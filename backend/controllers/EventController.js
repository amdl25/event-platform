import { Event, Organization, Category } from '../models/relationships.js';

export const getAllEvents = async (req, res) => {
  try {
    const events = await Event.findAll({
      include: [
        { model: Organization, as: 'organization', attributes: ['name'] },
        { model: Category, as: 'categories', through: { attributes: [] } }
      ],
      order: [['start_date', 'ASC']]
    });

    const eventData = events.map(event => ({
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
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const newEvent = await Event.create({
      ...req.body,
      image_url: imageUrl
    });

    res.status(201).json(newEvent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};