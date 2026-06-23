import sequelize from './config/database.js';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Account, Organization, Event, Category,
  LoyaltyWallet, TicketType, Participation,
} from './models/relationships.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ORG_PLANS_FILE = path.join(__dirname, 'storage/orgPlans.json');

const hash = (pw) => bcrypt.hash(pw, 10);

const mkEvent = async (data, categories, ticketTypes = []) => {
  const ev = await Event.create({ creator_id: null, ...data });
  if (categories.length > 0) await ev.addCategories(categories);
  for (let i = 0; i < ticketTypes.length; i++) {
    await TicketType.create({ event_id: ev.id, display_order: i, ...ticketTypes[i] });
  }
  return ev;
};

const seedDatabase = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('🧹 Baza de date resetată...\n');

    const catMuzica      = await Category.create({ name: 'Muzică' });
    const catArta        = await Category.create({ name: 'Artă & Cultură' });
    const catSpectacole  = await Category.create({ name: 'Spectacole' });
    const catSport       = await Category.create({ name: 'Sport' });
    const catFood        = await Category.create({ name: 'Food & Drinks' });
    const catWorkshop    = await Category.create({ name: 'Workshop-uri' });
    const catComunitate  = await Category.create({ name: 'Comunitate & Familie' });
    const catPetreceri   = await Category.create({ name: 'Petreceri' });
    const catNatura      = await Category.create({ name: 'Natură & Aventură' });
    console.log('✅ 9 categorii create (denumiri originale)');

    const testUser = await Account.create({
      email: 'andrei@test.com',
      password_hash: await hash('parola123'),
      first_name: 'Andrei', last_name: 'Participantul', role: 'user',
    });
    await testUser.addInterests([catMuzica, catSport, catWorkshop]);

    const userAna = await Account.create({
      email: 'ana@test.com',
      password_hash: await hash('parola123'),
      first_name: 'Ana', last_name: 'Popescu', role: 'user',
    });
    await userAna.addInterests([catWorkshop, catArta]);

    const userMihai = await Account.create({
      email: 'mihai@test.com',
      password_hash: await hash('parola123'),
      first_name: 'Mihai', last_name: 'Ionescu', role: 'user',
    });
    await userMihai.addInterests([catSport, catNatura, catMuzica]);

    const userElena = await Account.create({
      email: 'elena@test.com',
      password_hash: await hash('parola123'),
      first_name: 'Elena', last_name: 'Constantin', role: 'user',
    });
    await userElena.addInterests([catArta, catSpectacole, catFood]);
    console.log('✅ 4 utilizatori creați');

    const organizer = await Account.create({
      email: 'contact@cafenea.ro',
      password_hash: await hash('parola123'),
      first_name: 'Matei', last_name: 'Manager', role: 'organizer',
    });
    const coffeeShop = await Organization.create({
      name: 'The Coffee Hub',
      description: 'Cea mai primitoare cafenea din oraș.',
      owner_id: organizer.id,
      verification_status: 'verified',
    });

    const accTech = await Account.create({
      email: 'admin@techhubromania.ro',
      password_hash: await hash('parola123'),
      first_name: 'Alexandru', last_name: 'Popa', role: 'organizer',
    });
    const orgTech = await Organization.create({
      name: 'TechHub Romania',
      description: 'Comunitate tech din România. Workshops, conferințe și hackathoane pentru developeri.',
      business_identifier: 'RO12345678',
      registered_address: 'Str. Polizu 1-3, București',
      official_phone: '+40 720 100 200',
      owner_id: accTech.id,
      verification_status: 'verified',
    });

    const accArt = await Account.create({
      email: 'contact@artaculturala.ro',
      password_hash: await hash('parola123'),
      first_name: 'Maria', last_name: 'Văcărescu', role: 'organizer',
    });
    const orgArt = await Organization.create({
      name: 'Asociația Culturală Arta',
      description: 'Promovăm arta contemporană prin expoziții, vernisaje și ateliere creative.',
      business_identifier: 'RO23456789',
      registered_address: 'Calea Victoriei 45, București',
      official_phone: '+40 730 200 300',
      owner_id: accArt.id,
      verification_status: 'verified',
    });

    const accFit = await Account.create({
      email: 'hello@fitlife.ro',
      password_hash: await hash('parola123'),
      first_name: 'Radu', last_name: 'Marinescu', role: 'organizer',
    });
    const orgFit = await Organization.create({
      name: 'FitLife Studio',
      description: 'Antrenamente, cursuri de dans, yoga și evenimente sportive.',
      business_identifier: 'RO34567890',
      registered_address: 'Bd. Unirii 22, București',
      official_phone: '+40 740 300 400',
      owner_id: accFit.id,
      verification_status: 'verified',
    });

    const accPhoto = await Account.create({
      email: 'team@pixelprostudio.ro',
      password_hash: await hash('parola123'),
      first_name: 'Dan', last_name: 'Florescu', role: 'organizer',
    });
    const orgPhoto = await Organization.create({
      name: 'PixelPro Photography Studio',
      description: 'Cursuri și workshopuri de fotografie pentru toate nivelurile.',
      business_identifier: 'RO56789012',
      registered_address: 'Str. Armenească 12, București',
      official_phone: '+40 760 500 600',
      owner_id: accPhoto.id,
      verification_status: 'verified',
    });

    const accCluj = await Account.create({
      email: 'office@clujcreativ.ro',
      password_hash: await hash('parola123'),
      first_name: 'Bogdan', last_name: 'Mureșan', role: 'organizer',
    });
    const orgCluj = await Organization.create({
      name: 'Cluj Creativ',
      description: 'Comunitate de creatori, developeri și artiști din Cluj-Napoca.',
      business_identifier: 'RO67890123',
      registered_address: 'Str. Napoca 8, Cluj-Napoca',
      official_phone: '+40 770 600 700',
      owner_id: accCluj.id,
      verification_status: 'verified',
    });

    const accTm = await Account.create({
      email: 'hello@timisoarevents.ro',
      password_hash: await hash('parola123'),
      first_name: 'Ioana', last_name: 'Petrescu', role: 'organizer',
    });
    const orgTm = await Organization.create({
      name: 'Timișoara Events',
      description: 'Festivaluri, concerte și evenimente culturale în Timișoara.',
      business_identifier: 'RO78901234',
      registered_address: 'Piața Victoriei 1, Timișoara',
      official_phone: '+40 780 700 800',
      owner_id: accTm.id,
      verification_status: 'verified',
    });

    console.log('✅ 7 organizatori + organizații create');

    const plans = {
      [coffeeShop.id]: 'gratuit',
      [orgTech.id]:    'business',
      [orgArt.id]:     'pro',
      [orgFit.id]:     'pro',
      [orgPhoto.id]:   'business',
      [orgCluj.id]:    'pro',
      [orgTm.id]:      'gratuit',
    };
    fs.writeFileSync(ORG_PLANS_FILE, JSON.stringify(plans, null, 2), 'utf8');
    console.log('✅ Planuri scrise în orgPlans.json');

    await mkEvent({
      title: 'Workshop: Arta Latte-ului',
      description: 'Învață să faci desene în cafea ca un profesionist.',
      location: 'Str. Speranței nr. 10, București',
      start_date: new Date(2026, 5, 25, 10, 0),
      end_date:   new Date(2026, 5, 25, 12, 0),
      max_capacity: 10, current_occupancy: 8,
      price: 50.00, points_value: 100,
      image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
      org_id: coffeeShop.id,
    }, [catWorkshop, catFood], [
      { name: 'Loc la Workshop', price: 50.00, quantity: 10, sold_quantity: 8, points_reward: 100 },
    ]);

    const evAlergatPrivat = await Event.create({
      title: 'Ieșire la Alergat în Parc',
      description: 'Alergăm 5km lejer, apoi bem o apă.',
      location: 'Parcul Central, Cluj-Napoca',
      start_date: new Date(2026, 6, 5, 18, 0),
      end_date:   new Date(2026, 6, 5, 19, 30),
      max_capacity: 20, current_occupancy: 2,
      price: 0.00, points_value: 0,
      image_url: null,
      creator_id: testUser.id,
      org_id: null,
      show_guest_list: true,
    });
    await evAlergatPrivat.addCategory(catSport);

    const evVernisajOriginal = await mkEvent({
      title: 'Vernisaj: Lumini Urbane',
      description: 'O expoziție de fotografie contemporană care surprinde pulsul orașului noaptea. Vinuri și gustări incluse.',
      location: 'Galeria de Artă Metropolis – Calea Victoriei 45, București',
      start_date: new Date(2026, 6, 15, 18, 30),
      end_date:   new Date(2026, 6, 15, 21, 0),
      max_capacity: 40, current_occupancy: 25,
      price: 35.00, points_value: 150,
      image_url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80',
      org_id: coffeeShop.id,
    }, [catArta], [
      { name: 'Acces General', price: 35.00, quantity: 30, sold_quantity: 22, points_reward: 150 },
      { name: 'Acces VIP',     price: 70.00, quantity: 10, sold_quantity: 3,  points_reward: 250 },
    ]);

    const evJazzOriginal = await mkEvent({
      title: 'Jazz in the Garden',
      description: 'O seară relaxantă de jazz live în aer liber. Perfect pentru networking și relaxare.',
      location: 'Grădina Botanică – Terasa Verde, București',
      start_date: new Date(2026, 6, 20, 19, 0),
      end_date:   new Date(2026, 6, 20, 22, 30),
      max_capacity: 100, current_occupancy: 42,
      price: 65.00, points_value: 200,
      image_url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1200&q=80',
      org_id: coffeeShop.id,
    }, [catMuzica], [
      { name: 'Bilet Standard', price: 65.00,  quantity: 80, sold_quantity: 40, points_reward: 200 },
      { name: 'Bilet VIP',      price: 120.00, quantity: 20, sold_quantity: 2,  points_reward: 350 },
    ]);

    await mkEvent({
      title: 'Atelier de Pictură cu Acuarelă',
      description: 'Exprimă-ți creativitatea sub îndrumarea unui artist local. Toate materialele sunt asigurate.',
      location: 'Studio Creative Flow – Str. Armenească 12, București',
      start_date: new Date(2026, 6, 10, 11, 0),
      end_date:   new Date(2026, 6, 10, 14, 0),
      max_capacity: 12, current_occupancy: 11,
      price: 90.00, points_value: 120,
      image_url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80',
      org_id: coffeeShop.id,
    }, [catArta, catWorkshop], [
      { name: 'Participant', price: 90.00, quantity: 12, sold_quantity: 11, points_reward: 120 },
    ]);

    console.log('✅ 5 evenimente originale restaurate');

    const evAI = await mkEvent({
      title: 'AI Mastery Workshop: Build with Gemini',
      description: 'Hands-on workshop dedicat construirii de aplicații AI cu Google Gemini API. Chatbot funcțional și analiză de imagini.',
      location: 'Bulevardul Dimitrie Pompeiu 10B, București',
      start_date: new Date(2026, 5, 26, 10, 0),
      end_date:   new Date(2026, 5, 26, 17, 0),
      max_capacity: 60, current_occupancy: 38,
      price: 350.00, points_value: 500,
      image_url: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?auto=format&fit=crop&w=1200&q=80',
      org_id: orgTech.id,
    }, [catWorkshop], [
      { name: 'Early Bird',      price: 250.00, quantity: 20, sold_quantity: 20, points_reward: 600, description: 'EPUIZAT' },
      { name: 'Standard',        price: 350.00, quantity: 30, sold_quantity: 18, points_reward: 500 },
      { name: 'VIP + Mentoring', price: 550.00, quantity: 10, sold_quantity: 0,  points_reward: 800, description: 'Workshop + sesiune 1:1 post-event' },
    ]);

    await mkEvent({
      title: 'React & Next.js Bootcamp – 3 Zile Intensive',
      description: 'Bootcamp intensiv: React 18, Next.js 14, Server Components, App Router, TanStack Query și deployment pe Vercel.',
      location: 'TechHub HQ – Str. Polizu 1-3, București',
      start_date: new Date(2026, 6, 5, 9, 0),
      end_date:   new Date(2026, 6, 7, 18, 0),
      max_capacity: 30, current_occupancy: 22,
      price: 900.00, points_value: 1000,
      image_url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=1200&q=80',
      org_id: orgTech.id,
    }, [catWorkshop], [
      { name: 'Early Bird', price: 700.00, quantity: 10, sold_quantity: 10, points_reward: 1200, description: 'EPUIZAT' },
      { name: 'Standard',   price: 900.00, quantity: 20, sold_quantity: 12, points_reward: 1000, description: 'Certificat de absolvire inclus' },
    ]);

    await mkEvent({
      title: 'Startup Pitch Night: Demo Day București',
      description: '10 startup-uri tech prezintă în fața unui panel de investitori. Networking și cocktail incluse.',
      location: 'Hub de Inovare – Piața Presei Libere, București',
      start_date: new Date(2026, 6, 15, 18, 0),
      end_date:   new Date(2026, 6, 15, 22, 0),
      max_capacity: 200, current_occupancy: 87,
      price: 0, points_value: 150,
      image_url: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1200&q=80',
      org_id: orgTech.id,
    }, [catComunitate, catWorkshop], [
      { name: 'Acces Gratuit',     price: 0,      quantity: 150, sold_quantity: 87, points_reward: 150 },
      { name: 'VIP Investor Pass', price: 200.00, quantity: 50,  sold_quantity: 0,  points_reward: 300 },
    ]);

    await mkEvent({
      title: 'DevFest București 2026',
      description: 'Cel mai mare festival tech din România. 30+ speakeri, 5 track-uri: Web, Mobile, Cloud, AI/ML și DevOps.',
      location: 'Palatul Parlamentului – Sala Unirii, București',
      start_date: new Date(2026, 8, 20, 8, 30),
      end_date:   new Date(2026, 8, 20, 20, 0),
      max_capacity: 500, current_occupancy: 156,
      price: 150.00, points_value: 400,
      image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
      org_id: orgTech.id,
    }, [catWorkshop, catComunitate], [
      { name: 'Early Bird', price: 99.00,  quantity: 100, sold_quantity: 100, points_reward: 500, description: 'EPUIZAT' },
      { name: 'Standard',   price: 150.00, quantity: 300, sold_quantity: 56,  points_reward: 400 },
      { name: 'Premium',    price: 299.00, quantity: 100, sold_quantity: 0,   points_reward: 700, description: 'VIP + dinner cu speakerii' },
    ]);

    await mkEvent({
      title: 'Cybersecurity Masterclass: Ethical Hacking',
      description: 'O zi de cybersecurity practic: penetration testing, OWASP Top 10 și cum să-ți protejezi aplicațiile.',
      location: 'TechHub HQ – Str. Polizu 1-3, București',
      start_date: new Date(2026, 7, 10, 10, 0),
      end_date:   new Date(2026, 7, 10, 18, 0),
      max_capacity: 40, current_occupancy: 15,
      price: 400.00, points_value: 600,
      image_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
      org_id: orgTech.id,
    }, [catWorkshop], [
      { name: 'Standard',             price: 400.00,  quantity: 30, sold_quantity: 15, points_reward: 600 },
      { name: 'Corporate (3 locuri)', price: 1000.00, quantity: 10, sold_quantity: 0,  points_reward: 1800 },
    ]);

    await mkEvent({
      title: 'Seară de Teatru Independent: Voci din Margine',
      description: 'Piesă de teatru documentar despre povestea a trei personaje din periferia marilor orașe.',
      location: 'Teatrul Masca – Bd. Uverturii 35, București',
      start_date: new Date(2026, 7, 5, 19, 30),
      end_date:   new Date(2026, 7, 5, 22, 0),
      max_capacity: 120, current_occupancy: 70,
      price: 60.00, points_value: 150,
      image_url: 'https://images.unsplash.com/photo-1507924538820-ede94a04019d?auto=format&fit=crop&w=1200&q=80',
      org_id: orgArt.id,
    }, [catSpectacole], [
      { name: 'Rând 1-5 (față)', price: 85.00, quantity: 40, sold_quantity: 30, points_reward: 200 },
      { name: 'Acces General',   price: 60.00, quantity: 80, sold_quantity: 40, points_reward: 150 },
    ]);

    await mkEvent({
      title: 'Expoziție: Forme & Materie – Sculptură Contemporană',
      description: 'Instalații și sculpturi din metal, ceramică și materiale reciclate de la 8 artiști invitați.',
      location: 'Centrul Național al Dansului – Str. Batiștei 14, București',
      start_date: new Date(2026, 8, 1, 17, 0),
      end_date:   new Date(2026, 8, 1, 21, 0),
      max_capacity: 150, current_occupancy: 20,
      price: 0, points_value: 100,
      image_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=1200&q=80',
      org_id: orgArt.id,
    }, [catArta], [
      { name: 'Intrare Liberă', price: 0, quantity: 150, sold_quantity: 20, points_reward: 100 },
    ]);

    const evMaraton = await mkEvent({
      title: 'Maraton Urban București 2026',
      description: 'A 8-a ediție a maratonului urban. Trasee de 5km, 10km, semi și maraton complet. Tricou și medalie incluse.',
      location: 'Parcul Izvor – lângă Piața Constituției, București',
      start_date: new Date(2026, 9, 15, 7, 0),
      end_date:   new Date(2026, 9, 15, 15, 0),
      max_capacity: 5000, current_occupancy: 2340,
      price: 80.00, points_value: 500,
      image_url: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=1200&q=80',
      org_id: orgFit.id,
    }, [catSport], [
      { name: 'Traseu 5km',           price: 40.00,  quantity: 2000, sold_quantity: 890,  points_reward: 200 },
      { name: 'Traseu 10km',          price: 60.00,  quantity: 1500, sold_quantity: 780,  points_reward: 350 },
      { name: 'Semi-Maraton 21km',    price: 80.00,  quantity: 1000, sold_quantity: 520,  points_reward: 500 },
      { name: 'Maraton Complet 42km', price: 120.00, quantity: 500,  sold_quantity: 150,  points_reward: 900 },
    ]);

    const evYoga = await mkEvent({
      title: 'Yoga în Parc – Sesiune de Dimineață',
      description: 'Sesiune de Vinyasa Yoga în aer liber. Toate nivelurile binevenite. Saltele disponibile gratuit.',
      location: 'Parcul Herăstrău – Intrarea Nordului, București',
      start_date: new Date(2026, 6, 12, 7, 30),
      end_date:   new Date(2026, 6, 12, 9, 0),
      max_capacity: 50, current_occupancy: 28,
      price: 35.00, points_value: 100,
      image_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
      org_id: orgFit.id,
    }, [catSport], [
      { name: 'Sesiune Individuală',  price: 35.00,  quantity: 40, sold_quantity: 25, points_reward: 100 },
      { name: 'Abonament 4 Sesiuni', price: 110.00, quantity: 10, sold_quantity: 3,  points_reward: 420 },
    ]);

    await mkEvent({
      title: 'Curs de Dans Latino: Salsa & Bachata',
      description: 'Cursul perfect pentru a învăța salsa și bachata de la zero. Instructor cu experiență internațională.',
      location: 'FitLife Studio – Bd. Unirii 22, București',
      start_date: new Date(2026, 6, 20, 19, 0),
      end_date:   new Date(2026, 6, 20, 21, 0),
      max_capacity: 40, current_occupancy: 16,
      price: 70.00, points_value: 120,
      image_url: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?auto=format&fit=crop&w=1200&q=80',
      org_id: orgFit.id,
    }, [catMuzica, catWorkshop], [
      { name: 'Individual', price: 70.00,  quantity: 30, sold_quantity: 12, points_reward: 120 },
      { name: 'Cuplu',      price: 120.00, quantity: 10, sold_quantity: 2,  points_reward: 250 },
    ]);

    await mkEvent({
      title: 'Hiking Weekend la Bucegi – Traseul Caraimanului',
      description: 'Weekend de drumeție: Sinaia – Cota 1400 – Cota 2000 – Crucea Eroilor. Cazare și transport incluse.',
      location: 'Masivul Bucegi – Traseul Caraimanului, Sinaia',
      start_date: new Date(2026, 7, 22, 6, 0),
      end_date:   new Date(2026, 7, 23, 20, 0),
      max_capacity: 25, current_occupancy: 10,
      price: 450.00, points_value: 700,
      image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
      org_id: orgFit.id,
    }, [catNatura, catSport], [
      { name: 'Participant', price: 450.00, quantity: 25, sold_quantity: 10, points_reward: 700, description: 'Transport + cazare + ghid montan' },
    ]);

    const evPortret = await mkEvent({
      title: 'Curs Foto Portret – Lumina Naturală & Flash',
      description: 'Curs practic de portret: lumina naturală, flash portabil, retușare Lightroom, comunicare cu modelul.',
      location: 'PixelPro Studio – Str. Armenească 12, București',
      start_date: new Date(2026, 6, 14, 10, 0),
      end_date:   new Date(2026, 6, 14, 17, 0),
      max_capacity: 15, current_occupancy: 9,
      price: 280.00, points_value: 400,
      image_url: 'https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?auto=format&fit=crop&w=1200&q=80',
      org_id: orgPhoto.id,
    }, [catArta, catWorkshop], [
      { name: 'Cursant',         price: 280.00, quantity: 12, sold_quantity: 9, points_reward: 400 },
      { name: 'Cursant Avansat', price: 380.00, quantity: 3,  sold_quantity: 0, points_reward: 550, description: '+ shooting 1:1 cu instructorul' },
    ]);

    await mkEvent({
      title: 'Street Photography Walk – București Vechi',
      description: 'Plimbare foto prin Centrul Istoric cu un fotograf consacrat. Tehnici de street photography.',
      location: 'Piața Universității – Centrul Istoric, București',
      start_date: new Date(2026, 6, 28, 17, 30),
      end_date:   new Date(2026, 6, 28, 21, 0),
      max_capacity: 12, current_occupancy: 7,
      price: 90.00, points_value: 160,
      image_url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80',
      org_id: orgPhoto.id,
    }, [catArta], [
      { name: 'Participant', price: 90.00, quantity: 12, sold_quantity: 7, points_reward: 160 },
    ]);

    await mkEvent({
      title: 'Rooftop Summer Party – Sky Lounge',
      description: 'Petrecere de vară pe terasa din vârf. DJ set live, cocktailuri signature, buffet și priveliște panoramică asupra Bucureștiului.',
      location: 'Sky Lounge – Calea Floreasca 169, București',
      start_date: new Date(2026, 6, 26, 21, 0),
      end_date:   new Date(2026, 6, 27, 3, 0),
      max_capacity: 200, current_occupancy: 145,
      price: 120.00, points_value: 200,
      image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
      org_id: orgTm.id,
    }, [catPetreceri, catMuzica], [
      { name: 'Bilet Standard', price: 120.00, quantity: 150, sold_quantity: 120, points_reward: 200 },
      { name: 'Bilet VIP',      price: 220.00, quantity: 50,  sold_quantity: 25,  points_reward: 400, description: 'Zonă VIP + 2 cocktailuri incluse' },
    ]);

    await mkEvent({
      title: 'Degustare Cafea de Specialitate: Etiopia & Colombia',
      description: 'Călătorie senzorială prin două origini emblematice. Povestea fermierilor, torrefiere și cum identifici notele aromatice.',
      location: 'The Coffee Hub – Str. Speranței 10, București',
      start_date: new Date(2026, 6, 8, 17, 0),
      end_date:   new Date(2026, 6, 8, 19, 0),
      max_capacity: 20, current_occupancy: 12,
      price: 80.00, points_value: 150,
      image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
      org_id: coffeeShop.id,
    }, [catFood], [
      { name: 'Participare',           price: 80.00,  quantity: 15, sold_quantity: 10, points_reward: 150 },
      { name: 'Participare + Kit Acasă', price: 150.00, quantity: 5, sold_quantity: 2, points_reward: 280 },
    ]);

    console.log('✅ 15 evenimente noi create (București)');

    await mkEvent({
      title: 'Jazz & Blues Night – Cluj-Napoca',
      description: 'Seară memorabilă de jazz și blues cu formații locale și invitați speciali din Europa.',
      location: 'Club Euphoria – Str. Napoca 8, Cluj-Napoca',
      start_date: new Date(2026, 6, 11, 20, 0),
      end_date:   new Date(2026, 6, 11, 23, 30),
      max_capacity: 150, current_occupancy: 95,
      price: 55.00, points_value: 180,
      image_url: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?auto=format&fit=crop&w=1200&q=80',
      org_id: orgCluj.id,
    }, [catMuzica], [
      { name: 'Acces General', price: 55.00,  quantity: 120, sold_quantity: 85, points_reward: 180 },
      { name: 'Acces VIP',     price: 100.00, quantity: 30,  sold_quantity: 10, points_reward: 300 },
    ]);

    await mkEvent({
      title: 'Tech Meetup Cluj: AI & Machine Learning',
      description: 'Prezentări și demo-uri despre cele mai recente aplicații AI. Networking cu comunitatea tech din Cluj.',
      location: 'Cluj Innovation Park – Str. Taietura Turcului 47, Cluj-Napoca',
      start_date: new Date(2026, 6, 17, 18, 0),
      end_date:   new Date(2026, 6, 17, 21, 0),
      max_capacity: 100, current_occupancy: 45,
      price: 0, points_value: 80,
      image_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80',
      org_id: orgCluj.id,
    }, [catWorkshop, catComunitate], [
      { name: 'Acces Gratuit', price: 0, quantity: 100, sold_quantity: 45, points_reward: 80 },
    ]);

    await mkEvent({
      title: 'Drumeție Cheile Turzii – Traseu Complet',
      description: 'Traseu de o zi prin cele mai spectaculoase chei din Transilvania. Dificultate medie, ~4 ore.',
      location: 'Cheile Turzii – Traseul Inelului, Turda',
      start_date: new Date(2026, 7, 8, 8, 0),
      end_date:   new Date(2026, 7, 8, 17, 0),
      max_capacity: 30, current_occupancy: 18,
      price: 80.00, points_value: 200,
      image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80',
      org_id: orgCluj.id,
    }, [catNatura, catSport], [
      { name: 'Participant', price: 80.00, quantity: 30, sold_quantity: 18, points_reward: 200, description: 'Transport + ghid local' },
    ]);

    await mkEvent({
      title: 'Speciality Coffee Tour – Cluj-Napoca',
      description: 'Vizităm 4 cafenele de specialitate din Cluj. Barista explică metoda de preparare la fiecare oprire.',
      location: 'Punct de întâlnire – Piața Unirii, Cluj-Napoca',
      start_date: new Date(2026, 7, 15, 10, 0),
      end_date:   new Date(2026, 7, 15, 14, 0),
      max_capacity: 20, current_occupancy: 8,
      price: 60.00, points_value: 120,
      image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80',
      org_id: orgCluj.id,
    }, [catFood], [
      { name: 'Tur Ghidat', price: 60.00, quantity: 20, sold_quantity: 8, points_reward: 120, description: '4 degustări incluse' },
    ]);

    await mkEvent({
      title: 'Festival Street Art – Timișoara',
      description: 'Cel mai mare festival de artă stradală din vestul României. 20 artiști pictează fațade în Fabric timp de 3 zile.',
      location: 'Cartierul Fabric – Str. Coriolan Brediceanu, Timișoara',
      start_date: new Date(2026, 7, 14, 10, 0),
      end_date:   new Date(2026, 7, 16, 22, 0),
      max_capacity: 500, current_occupancy: 120,
      price: 0, points_value: 60,
      image_url: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?auto=format&fit=crop&w=1200&q=80',
      org_id: orgTm.id,
    }, [catArta, catComunitate], [
      { name: 'Acces Liber', price: 0, quantity: 500, sold_quantity: 120, points_reward: 60 },
    ]);

    await mkEvent({
      title: 'Concert Folk & Acoustic Night – Timișoara',
      description: 'Seară de muzică folk și acustică cu 5 artiști independenți români. Grădina Casei de Cultură.',
      location: 'Casa de Cultură a Municipiului – Bd. C.D. Loga 2, Timișoara',
      start_date: new Date(2026, 6, 25, 19, 30),
      end_date:   new Date(2026, 6, 25, 23, 0),
      max_capacity: 200, current_occupancy: 130,
      price: 40.00, points_value: 120,
      image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
      org_id: orgTm.id,
    }, [catMuzica, catSpectacole], [
      { name: 'Bilet Standard', price: 40.00, quantity: 180, sold_quantity: 120, points_reward: 120 },
      { name: 'Bilet VIP',      price: 75.00, quantity: 20,  sold_quantity: 10,  points_reward: 220 },
    ]);

    await mkEvent({
      title: 'Workshop Startup: De la Idee la Produs',
      description: 'Cum validezi o idee de business în 48h, cum construiești un MVP și cum prezinți investitorilor.',
      location: 'Impact Hub Timișoara – Str. Mercy 1, Timișoara',
      start_date: new Date(2026, 8, 5, 9, 0),
      end_date:   new Date(2026, 8, 5, 18, 0),
      max_capacity: 50, current_occupancy: 22,
      price: 150.00, points_value: 300,
      image_url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=80',
      org_id: orgTm.id,
    }, [catWorkshop, catComunitate], [
      { name: 'Participant', price: 150.00, quantity: 50, sold_quantity: 22, points_reward: 300 },
    ]);

    await mkEvent({
      title: 'Cros Iași – Alergare în Parcul Copou',
      description: 'Cros urban în inima orașului, prin cel mai frumos parc din Iași. Trasee de 5km și 10km.',
      location: 'Parcul Copou – Bd. Carol I, Iași',
      start_date: new Date(2026, 8, 13, 8, 0),
      end_date:   new Date(2026, 8, 13, 13, 0),
      max_capacity: 300, current_occupancy: 145,
      price: 35.00, points_value: 150,
      image_url: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?auto=format&fit=crop&w=1200&q=80',
      org_id: orgFit.id,
    }, [catSport], [
      { name: 'Traseu 5km',  price: 35.00, quantity: 200, sold_quantity: 95, points_reward: 150 },
      { name: 'Traseu 10km', price: 50.00, quantity: 100, sold_quantity: 50, points_reward: 250 },
    ]);

    await mkEvent({
      title: 'Festivalul Național de Teatru Tânăr – Iași',
      description: '3 zile cu spectacole ale celor mai talentate trupe de teatru studențesc din România. Intrare gratuită.',
      location: 'Teatrul Național Vasile Alecsandri – Str. Agatha Bârsescu 18, Iași',
      start_date: new Date(2026, 9, 3, 17, 0),
      end_date:   new Date(2026, 9, 5, 22, 0),
      max_capacity: 400, current_occupancy: 88,
      price: 0, points_value: 80,
      image_url: 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?auto=format&fit=crop&w=1200&q=80',
      org_id: orgArt.id,
    }, [catSpectacole], [
      { name: 'Acces Gratuit', price: 0, quantity: 400, sold_quantity: 88, points_reward: 80 },
    ]);

    await mkEvent({
      title: 'Festival Film Indie – Brașov',
      description: 'Proiecții de filme independente românești și internaționale în aer liber în Piața Sfatului. Q&A cu regizori.',
      location: 'Piața Sfatului – Centrul Vechi, Brașov',
      start_date: new Date(2026, 7, 28, 21, 0),
      end_date:   new Date(2026, 7, 28, 23, 30),
      max_capacity: 300, current_occupancy: 210,
      price: 25.00, points_value: 80,
      image_url: 'https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?auto=format&fit=crop&w=1200&q=80',
      org_id: orgArt.id,
    }, [catSpectacole, catArta], [
      { name: 'Bilet Seară', price: 25.00, quantity: 300, sold_quantity: 210, points_reward: 80 },
    ]);

    await mkEvent({
      title: 'Traseu Vârful Postăvarul – Brașov',
      description: 'Drumeție ghidată spre Vârful Postăvarul. Panoramă spectaculoasă asupra Brașovului și Bucegilor.',
      location: 'Telecabina Postăvarul – Str. Poiana Soarelui, Brașov',
      start_date: new Date(2026, 8, 6, 9, 0),
      end_date:   new Date(2026, 8, 6, 16, 0),
      max_capacity: 20, current_occupancy: 7,
      price: 60.00, points_value: 180,
      image_url: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=80',
      org_id: orgFit.id,
    }, [catNatura, catSport], [
      { name: 'Participant', price: 60.00, quantity: 20, sold_quantity: 7, points_reward: 180, description: 'Ghid montan inclus' },
    ]);

    await mkEvent({
      title: 'Coffee & Brunch în Centrul Vechi – Brașov',
      description: 'Dimineață relaxantă de brunch și cafea de specialitate pe terasa istorică. Meniu sezonier cu produse locale.',
      location: 'Terasa Sfatului – Piața Sfatului 14, Brașov',
      start_date: new Date(2026, 7, 30, 10, 0),
      end_date:   new Date(2026, 7, 30, 13, 0),
      max_capacity: 40, current_occupancy: 15,
      price: 45.00, points_value: 100,
      image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
      org_id: coffeeShop.id,
    }, [catFood, catComunitate], [
      { name: 'Brunch + Cafea', price: 45.00, quantity: 40, sold_quantity: 15, points_reward: 100 },
    ]);

    await mkEvent({
      title: 'FITS – Festivalul Internațional de Teatru Sibiu',
      description: 'Spectacole de teatru, dans și performanță artistică din toată lumea, pe străzile și scenele din Sibiu.',
      location: 'Piața Mare – Centrul Istoric, Sibiu',
      start_date: new Date(2026, 6, 7, 17, 0),
      end_date:   new Date(2026, 6, 7, 23, 0),
      max_capacity: 1000, current_occupancy: 780,
      price: 30.00, points_value: 120,
      image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80',
      org_id: orgArt.id,
    }, [catSpectacole, catArta], [
      { name: 'Bilet Seară', price: 30.00, quantity: 1000, sold_quantity: 780, points_reward: 120 },
    ]);

    await mkEvent({
      title: 'Marș al Familiei – Sibiu',
      description: 'Plimbare de familie prin Sibiul medieval, cu activități pentru copii, muzică și standuri cu produse locale.',
      location: 'Parcul Sub Arini, Sibiu',
      start_date: new Date(2026, 7, 16, 10, 0),
      end_date:   new Date(2026, 7, 16, 17, 0),
      max_capacity: 500, current_occupancy: 210,
      price: 0, points_value: 50,
      image_url: 'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?auto=format&fit=crop&w=1200&q=80',
      org_id: orgTm.id,
    }, [catComunitate, catSport], [
      { name: 'Acces Gratuit', price: 0, quantity: 500, sold_quantity: 210, points_reward: 50 },
    ]);

    console.log('✅ 14 evenimente create (Cluj-Napoca, Timișoara, Iași, Brașov, Sibiu, Turda, Sinaia)');

    const ts = Date.now();
    await Promise.all([
      Participation.create({ account_id: testUser.id,  event_id: evJazzOriginal.id,    buyer_name: 'Andrei Participantul', buyer_email: 'andrei@test.com', status: 'going', invite_status: 'accepted', ticket_qr: `TK-ANDREI-JAZZ-${ts}` }),
      Participation.create({ account_id: userAna.id,   event_id: evAI.id,              buyer_name: 'Ana Popescu',          buyer_email: 'ana@test.com',    status: 'going', invite_status: 'accepted', ticket_qr: `TK-ANA-AI-${ts}` }),
      Participation.create({ account_id: userAna.id,   event_id: evPortret.id,         buyer_name: 'Ana Popescu',          buyer_email: 'ana@test.com',    status: 'going', invite_status: 'accepted', ticket_qr: `TK-ANA-FOTO-${ts}` }),
      Participation.create({ account_id: userMihai.id, event_id: evYoga.id,            buyer_name: 'Mihai Ionescu',        buyer_email: 'mihai@test.com',  status: 'going', invite_status: 'accepted', ticket_qr: `TK-MIHAI-YOGA-${ts}` }),
      Participation.create({ account_id: userMihai.id, event_id: evMaraton.id,         buyer_name: 'Mihai Ionescu',        buyer_email: 'mihai@test.com',  status: 'going', invite_status: 'accepted', ticket_qr: `TK-MIHAI-MARA-${ts}` }),
      Participation.create({ account_id: userElena.id, event_id: evVernisajOriginal.id, buyer_name: 'Elena Constantin',    buyer_email: 'elena@test.com',  status: 'going', invite_status: 'accepted', ticket_qr: `TK-ELENA-VERN-${ts}` }),
    ]);
    console.log('✅ 6 participări demo create');

    await Promise.all([
      LoyaltyWallet.create({ account_id: testUser.id,  org_id: coffeeShop.id, points_balance: 50 }),
      LoyaltyWallet.create({ account_id: userAna.id,   org_id: orgTech.id,   points_balance: 850 }),
      LoyaltyWallet.create({ account_id: userAna.id,   org_id: orgPhoto.id,  points_balance: 400 }),
      LoyaltyWallet.create({ account_id: userMihai.id, org_id: orgFit.id,    points_balance: 1200 }),
      LoyaltyWallet.create({ account_id: userElena.id, org_id: orgArt.id,    points_balance: 650 }),
      LoyaltyWallet.create({ account_id: userElena.id, org_id: coffeeShop.id, points_balance: 200 }),
    ]);
    console.log('✅ 6 loyalty wallets create\n');

    console.log('🎉 Baza de date populată cu succes!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Categorii: Muzică | Artă & Cultură | Spectacole | Sport | Food & Drinks | Workshop-uri | Comunitate & Familie | Petreceri | Natură & Aventură\n');
    console.log('🏙️  Orașe: București | Cluj-Napoca | Timișoara | Iași | Brașov | Sibiu | Sinaia | Turda\n');
    console.log('📧 Conturi (parola: parola123)');
    console.log('  andrei@test.com          contact@cafenea.ro → The Coffee Hub [Gratuit]');
    console.log('  ana@test.com             admin@techhubromania.ro → TechHub Romania [Business]');
    console.log('  mihai@test.com           contact@artaculturala.ro → Asoc. Culturală [Pro]');
    console.log('  elena@test.com           hello@fitlife.ro → FitLife Studio [Pro]');
    console.log('                           team@pixelprostudio.ro → PixelPro Photo [Business]');
    console.log('                           office@clujcreativ.ro → Cluj Creativ [Pro]');
    console.log('                           hello@timisoarevents.ro → Timișoara Events [Gratuit]');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(0);
  } catch (error) {
    console.error('❌ Eroare la seeding:', error);
    process.exit(1);
  }
};

seedDatabase();
