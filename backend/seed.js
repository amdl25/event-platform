import sequelize from './config/database.js';
import { Account, Organization, Event, Category, LoyaltyWallet } from './models/relationships.js';

const seedDatabase = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log("Emptying database for seeding...");

    const catCoffee = await Category.create({ name: 'Coffee & Chill' });
    const catTech = await Category.create({ name: 'Tech Workshops' });
    const catSport = await Category.create({ name: 'Outdoor Sports' });

    const testUser = await Account.create({
      email: 'andrei@test.com',
      password_hash: 'hash_simulat',
      first_name: 'Andrei',
      last_name: 'Participantul',
      role: 'user'
    });

    const organizer = await Account.create({
      email: 'contact@cafenea.ro',
      password_hash: 'hash_simulat',
      first_name: 'Matei',
      last_name: 'Manager',
      role: 'organizer'
    });

    const coffeeShop = await Organization.create({
      name: 'The Coffee Hub',
      description: 'Cea mai primitoare cafenea din oraș.',
      owner_id: organizer.id
    });

    const event1 = await Event.create({
      title: 'Workshop: Arta Latte-ului',
      description: 'Învață să faci desene în cafea ca un profesionist.',
      location: 'Str. Speranței nr. 10',
      start_date: new Date(2024, 10, 25, 10, 0),
      end_date: new Date(2024, 10, 25, 12, 0),
      max_capacity: 10,
      current_occupancy: 8,
      price: 50.00,
      points_value: 100,
      creator_id: organizer.id,
      org_id: coffeeShop.id
    });
    await event1.addCategory(catCoffee);

    const event2 = await Event.create({
      title: 'Ieșire la Alergat în Parc',
      description: 'Alergăm 5km lejer, apoi bem o apă.',
      location: 'Parcul Central',
      start_date: new Date(2024, 10, 26, 18, 0),
      end_date: new Date(2024, 10, 26, 19, 30),
      max_capacity: 20,
      current_occupancy: 2,
      price: 0.00,
      points_value: 0,
      creator_id: testUser.id,
      org_id: null
    });
    await event2.addCategory(catSport);

    await LoyaltyWallet.create({
      account_id: testUser.id,
      org_id: coffeeShop.id,
      points_balance: 50
    });

    console.log("✅ Database seeded successfully!");
    process.exit();
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();