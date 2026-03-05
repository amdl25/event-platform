import sequelize from './config/database.js';
import { Account, Organization, Event, Category, LoyaltyWallet } from './models/relationships.js';

const seedDatabase = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log("Emptying database for seeding...");

    const catCoffee = await Category.create({ name: 'Coffee & Chill' });
    const catTech = await Category.create({ name: 'Tech Workshops' });
    const catSport = await Category.create({ name: 'Outdoor Sports' });
    const catArt = await Category.create({ name: 'Arts & Culture' });
    const catMusic = await Category.create({ name: 'Live Music' });

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
      image_url:'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
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
      image_url: null,
      creator_id: testUser.id,
      org_id: null
    });
    await event2.addCategory(catSport);

    const eventArt = await Event.create({
    title: 'Vernisaj: Lumini Urbane',
    description: 'O expoziție de fotografie contemporană care surprinde pulsul orașului noaptea. Vin și gustări incluse.',
    location: 'Galeria de Artă "Metropolis"',
    start_date: new Date(2026, 3, 15, 18, 30),
    end_date: new Date(2026, 3, 15, 21, 0),
    max_capacity: 40,
    current_occupancy: 25,
    price: 35.00,
    points_value: 150,
    image_url:'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80',
    creator_id: organizer.id,
    org_id: coffeeShop.id
    });
    await eventArt.addCategory(catArt);

const eventMusic = await Event.create({
  title: 'Jazz in the Garden',
  description: 'O seară relaxantă de jazz live în aer liber. Perfect pentru networking și relaxare.',
  location: 'Grădina Botanică - Terasa Verde',
  start_date: new Date(2026, 3, 20, 19, 0),
  end_date: new Date(2026, 3, 20, 22, 30),
  max_capacity: 100,
  current_occupancy: 42,
  price: 65.00,
  points_value: 200, 
  image_url:'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1200&q=80',
  creator_id: organizer.id,
  org_id: coffeeShop.id
});
await eventMusic.addCategory(catMusic);

const eventWorkshop = await Event.create({
  title: 'Atelier de Pictură cu Acuarelă',
  description: 'Exprimă-ți creativitatea sub îndrumarea unui artist local. Toate materialele sunt asigurate.',
  location: 'Studio Creative Flow',
  start_date: new Date(2026, 3, 10, 11, 0),
  end_date: new Date(2026, 3, 10, 14, 0),
  max_capacity: 12,
  current_occupancy: 11,
  price: 90.00,
  points_value: 120,
  image_url:'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80',
  creator_id: organizer.id,
  org_id: coffeeShop.id
});
await eventWorkshop.addCategory(catArt);

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