import { TicketType, Event, Organization } from '../models/relationships.js';
import { getOrgPlan } from '../utils/fileStorage.js';

export const getTicketTypesForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const ticketTypes = await TicketType.findAll({
      where: { event_id: eventId },
      order: [['display_order', 'ASC']],
      attributes: [
        'id', 'event_id', 'name', 'description', 'price',
        'quantity', 'sold_quantity', 'points_reward', 'display_order', 'is_active'
      ]
    });

    res.json(ticketTypes);
  } catch (error) {
    res.status(500).json({ message: 'Eroare la preluarea tipurilor de bilete', error: error.message });
  }
};

export const createTicketType = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { name, description, price, quantity, points_reward, display_order, is_active } = req.body;

    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Evenimentul nu a fost găsit' });
    }

    if (event.org_id) {
      const org = await Organization.findByPk(event.org_id);
      if (getOrgPlan(org?.id) === 'gratuit') {
        const existing = await TicketType.count({ where: { event_id: eventId } });
        if (existing >= 1) {
          return res.status(403).json({
            message: 'Planul Gratuit permite un singur tip de bilet per eveniment. Fă upgrade la Pro pentru tipuri personalizate.',
            code: 'PLAN_LIMIT_EXCEEDED'
          });
        }
        if (name && name.trim() !== 'General Access') {
          return res.status(403).json({
            message: 'Planul Gratuit permite doar bilete de tip "General Access". Fă upgrade la Pro pentru denumiri personalizate.',
            code: 'PLAN_LIMIT_EXCEEDED'
          });
        }
      }
    }

    const ticketType = await TicketType.create({
      event_id: eventId,
      name: name || 'General Access',
      description: description || null,
      price: price || 0,
      quantity: quantity || 100,
      sold_quantity: 0,
      points_reward: points_reward || 0,
      display_order: display_order || 0,
      is_active: is_active !== false
    });

    res.status(201).json({ 
      message: 'Tip de bilet creat cu succes',
      ticketType 
    });
  } catch (error) {
    res.status(500).json({ message: 'Eroare la crearea tipului de bilet', error: error.message });
  }
};

export const updateTicketType = async (req, res) => {
  try {
    const { eventId, ticketTypeId } = req.params;
    const { name, description, price, quantity, points_reward, display_order, is_active } = req.body;

    const ticketType = await TicketType.findOne({
      where: { id: ticketTypeId, event_id: eventId }
    });

    if (!ticketType) {
      return res.status(404).json({ message: 'Tipul de bilet nu a fost găsit' });
    }

    await ticketType.update({
      name: name !== undefined ? name : ticketType.name,
      description: description !== undefined ? description : ticketType.description,
      price: price !== undefined ? price : ticketType.price,
      quantity: quantity !== undefined ? quantity : ticketType.quantity,
      points_reward: points_reward !== undefined ? points_reward : ticketType.points_reward,
      display_order: display_order !== undefined ? display_order : ticketType.display_order,
      is_active: is_active !== undefined ? is_active : ticketType.is_active
    });

    res.json({ 
      message: 'Tip de bilet actualizat cu succes',
      ticketType 
    });
  } catch (error) {
    res.status(500).json({ message: 'Eroare la actualizarea tipului de bilet', error: error.message });
  }
};

export const deleteTicketType = async (req, res) => {
  try {
    const { eventId, ticketTypeId } = req.params;

    const ticketType = await TicketType.findOne({
      where: { id: ticketTypeId, event_id: eventId }
    });

    if (!ticketType) {
      return res.status(404).json({ message: 'Tipul de bilet nu a fost găsit' });
    }

    await ticketType.destroy();

    res.json({ message: 'Tip de bilet șters cu succes' });
  } catch (error) {
    res.status(500).json({ message: 'Eroare la ștergerea tipului de bilet', error: error.message });
  }
};

export const getTicketTypeById = async (req, res) => {
  try {
    const { ticketTypeId } = req.params;

    const ticketType = await TicketType.findByPk(ticketTypeId, {
      attributes: [
        'id', 'event_id', 'name', 'description', 'price',
        'quantity', 'sold_quantity', 'points_reward', 'display_order', 'is_active'
      ]
    });

    if (!ticketType) {
      return res.status(404).json({ message: 'Tipul de bilet nu a fost găsit' });
    }

    res.json(ticketType);
  } catch (error) {
    res.status(500).json({ message: 'Eroare la preluarea tipului de bilet', error: error.message });
  }
};
