import sequelize from '../config/database.js';
import { Account, Event, Category } from '../models/relationships.js';

const run = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: false });

    const creator = await Account.findOne({ where: { email: 'andrei@test.com' } });
    if (!creator) throw new Error('User andrei@test.com not found');

    const catPetreceri = await Category.findOne({ where: { name: 'Petreceri' } });

    const ev = await Event.create({
      title: 'BBQ la mine – Vineri seară',
      description: 'Grill, muzică bună și prieteni. Aduceți ceva de băut, restul e asigurat. Vă aștept!',
      location: 'Str. Florilor 7, București',
      start_date: new Date(2026, 5, 25, 18, 0),
      end_date:   new Date(2026, 5, 25, 23, 0),
      max_capacity: 20,
      current_occupancy: 0,
      price: 0,
      points_value: 0,
      image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80',
      creator_id: creator.id,
      org_id: null,
      show_guest_list: true,
    });

    if (catPetreceri) await ev.addCategory(catPetreceri);

    console.log(`Eveniment privat creat (id=${ev.id}) de ${creator.first_name} ${creator.last_name} pentru 25 iunie 2026 18:00`);
    process.exit(0);
  } catch (err) {
    console.error('Eroare:', err.message);
    process.exit(1);
  }
};

run();
