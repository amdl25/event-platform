import dotenv from 'dotenv';
import sequelize from '../config/database.js';
import '../models/relationships.js';
import { Event, TicketType } from '../models/relationships.js';

dotenv.config();

const run = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });

    const events = await Event.findAll({
      include: [
        {
          model: TicketType,
          as: 'ticketTypes',
          attributes: ['id']
        }
      ]
    });

    let createdDefaultTicketTypes = 0;

    for (const event of events) {
      const hasTicketTypes = Array.isArray(event.ticketTypes) && event.ticketTypes.length > 0;
      if (hasTicketTypes) {
        continue;
      }

      await TicketType.create({
        event_id: event.id,
        name: 'General Access',
        description: null,
        price: Number(event.price || 0),
        quantity: Number(event.max_capacity || 0),
        sold_quantity: Number(event.current_occupancy || 0) ? 0 : 0,
        points_reward: Number(event.points_value || 0),
        display_order: 0,
        is_active: true
      });

      createdDefaultTicketTypes += 1;
    }

    console.log('Migrare TicketType finalizata cu succes.');
    console.log(`- evenimente scanate: ${events.length}`);
    console.log(`- ticket types default create: ${createdDefaultTicketTypes}`);
  } catch (error) {
    console.error('Migrarea TicketType a esuat:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

run();
