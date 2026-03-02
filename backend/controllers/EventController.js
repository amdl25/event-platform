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