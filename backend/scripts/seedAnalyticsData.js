import { QueryTypes } from 'sequelize';
import { randomUUID } from 'crypto';
import sequelize from '../config/database.js';
import { Account, Organization, Event, TicketType } from '../models/relationships.js';

const RO_NAMES = [
  'Alexandru Popa', 'Andrei Ionescu', 'Bogdan Moldovan', 'Călin Ene',
  'Cristian Stan', 'Dan Florescu', 'Elena Dumitrescu', 'Florin Gheorghe',
  'Gabriel Constantin', 'Ioana Stoica', 'Laura Popescu', 'Mihai Anghel',
  'Nicoleta Marin', 'Octavian Radu', 'Paula Vasile', 'Radu Niculescu',
  'Simona Tudor', 'Teodor Barbu', 'Valentina Drăgan', 'Vlad Matei',
  'Ana Petrescu', 'Bogdan Mureșan', 'Carmen Ciobanu', 'Daniel Luca',
  'Elvira Preda', 'Florentina Ioanid', 'Horia Manolescu', 'Irina Voicu',
  'Lucian Brânzei', 'Mădălina Ghiță',
];

const nameToEmail = (name, idx) =>
  `${name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10)}${idx}@mail.ro`;

const genParticipations = (eventId, count, eventDate) => {
  const rows = [];
  const dowWeights = [14, 9, 9, 11, 14, 20, 23];
  const weightedDay = () => {
    const r = Math.random() * 100;
    let acc = 0;
    for (let d = 0; d < 7; d++) { acc += dowWeights[d]; if (r <= acc) return d; }
    return 5;
  };

  for (let i = 0; i < count; i++) {
    const daysBack = Math.floor(Math.random() * 25) + 1;
    const base = new Date(eventDate);
    base.setDate(base.getDate() - daysBack);

    if (Math.random() < 0.4) {
      const targetDow = weightedDay();
      const currentDow = base.getDay();
      const diff = (targetDow - currentDow + 7) % 7;
      base.setDate(base.getDate() + (diff <= 3 ? diff : diff - 7));
    }
    const idx = i % RO_NAMES.length;
    rows.push({
      id: randomUUID(),
      account_id: null,
      event_id: eventId,
      buyer_name: RO_NAMES[idx],
      buyer_email: nameToEmail(RO_NAMES[idx], i),
      status: 'going',
      ticket_qr: `TK-${randomUUID().slice(0, 8).toUpperCase()}`,
      createdAt: base.toISOString(),
      updatedAt: base.toISOString(),
    });
  }
  return rows;
};

const insertParticipations = async (rows) => {
  for (const p of rows) {
    await sequelize.query(
      `INSERT INTO participation (id, account_id, event_id, buyer_name, buyer_email, status, invite_status, ticket_qr, "createdAt", "updatedAt")
       VALUES (:id, :account_id, :event_id, :buyer_name, :buyer_email, :status, 'accepted', :ticket_qr, :createdAt, :updatedAt)`,
      { replacements: p, type: QueryTypes.INSERT }
    );
  }
};

const mkPastEvent = async (data, orgId, ticketPrice, totalSeats, soldSeats) => {
  const ev = await Event.create({
    ...data,
    org_id: orgId,
    creator_id: null,
    price: ticketPrice,
    max_capacity: totalSeats,
    current_occupancy: soldSeats,
    points_value: Math.round(ticketPrice * 1.5),
    moderation_status: 'published',
  });
  await TicketType.create({
    event_id: ev.id,
    name: 'Bilet Standard',
    price: ticketPrice,
    quantity: totalSeats,
    sold_quantity: soldSeats,
    points_reward: Math.round(ticketPrice * 1.5),
    is_active: true,
    display_order: 0,
  });
  return ev;
};

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexiune DB OK\n');

    const findOrg = async (email) => {
      const acc = await Account.findOne({ where: { email } });
      if (!acc) throw new Error(`Contul ${email} nu există. Rulează seed.js mai întâi.`);
      const org = await Organization.findOne({ where: { owner_id: acc.id } });
      if (!org) throw new Error(`Organizația pentru ${email} nu există.`);
      return org;
    };

    const orgTech  = await findOrg('admin@techhubromania.ro');
    const orgPhoto = await findOrg('team@pixelprostudio.ro');
    const orgFit   = await findOrg('hello@fitlife.ro');
    const orgArt   = await findOrg('contact@artaculturala.ro');
    const orgCluj  = await findOrg('office@clujcreativ.ro');
    const orgCafe  = await findOrg('contact@cafenea.ro');

    const existingCount = await Event.count({
      where: { org_id: orgTech.id },
    });
    if (existingCount >= 10) {
      console.log(`ℹTechHub are deja ${existingCount} evenimente. Datele de analytics par populate.`);
      console.log('   Dacă vrei să refaci datele, rulează seed.js (ATENȚIE: resetează toată BD).');
      process.exit(0);
    }


    console.log('TechHub Romania (Business)...');
    const techEvents = [
      { month: new Date(2025, 6, 12), title: 'React Fundamentals Workshop',          price: 300, seats: 30, sold: 22 },
      { month: new Date(2025, 7, 16), title: 'Node.js & Express Bootcamp',           price: 450, seats: 25, sold: 18 },
      { month: new Date(2025, 8, 20), title: 'Cloud Native Conference',              price: 150, seats: 80, sold: 62 },
      { month: new Date(2025, 9, 11), title: 'DevOps Workshop: Docker & Kubernetes', price: 380, seats: 35, sold: 31 },
      { month: new Date(2025, 10, 8), title: 'Tech Leadership Masterclass',          price: 200, seats: 60, sold: 45 },
      { month: new Date(2025, 11, 13),title: 'AI & LLM Workshop cu OpenAI',          price: 350, seats: 45, sold: 40 },
      { month: new Date(2026, 0, 17), title: 'React Advanced Patterns & Performance',price: 320, seats: 28, sold: 25 },
      { month: new Date(2026, 1, 14), title: 'TypeScript Mastery Workshop',           price: 280, seats: 32, sold: 29 },
      { month: new Date(2026, 2, 21), title: 'System Design Masterclass',             price: 400, seats: 40, sold: 37 },
      { month: new Date(2026, 3, 12), title: 'Web Security Fundamentals',             price: 350, seats: 22, sold: 20 },
      { month: new Date(2026, 4, 17), title: 'GraphQL & REST APIs cu NestJS',         price: 290, seats: 38, sold: 34 },
    ];

    for (const e of techEvents) {
      const endDate = new Date(e.month);
      endDate.setHours(endDate.getHours() + 8);
      const ev = await mkPastEvent({
        title: e.title,
        description: `Workshop intensiv organizat de TechHub Romania. ${e.title} — sesiune practică cu experți din industrie.`,
        location: 'TechHub HQ – Str. Polizu 1-3, București',
        start_date: e.month,
        end_date: endDate,
        image_url: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?auto=format&fit=crop&w=1200&q=80',
      }, orgTech.id, e.price, e.seats, e.sold);

      const participations = genParticipations(ev.id, e.sold, e.month);
      await insertParticipations(participations);
      process.stdout.write('.');
    }
    console.log(`\n${techEvents.length} evenimente + participări`);

    console.log('📷 PixelPro Photography (Business)...');
    const photoEvents = [
      { month: new Date(2025, 6, 19), title: 'Fotografie de Produs cu Iluminare Studio', price: 250, seats: 12, sold: 10 },
      { month: new Date(2025, 8, 6),  title: 'Editare Avansată Lightroom & Capture One',  price: 180, seats: 15, sold: 13 },
      { month: new Date(2025, 10, 15),title: 'Workshop Fotografie de Nuntă',               price: 320, seats: 10, sold: 9  },
      { month: new Date(2026, 0, 25), title: 'Fotografie de Arhitectură & Interior',       price: 280, seats: 8,  sold: 7  },
      { month: new Date(2026, 2, 8),  title: 'Masterclass: Iluminare Creativă în Studio',  price: 350, seats: 12, sold: 11 },
      { month: new Date(2026, 4, 10), title: 'Street Photography – Tehnici Avansate',      price: 200, seats: 14, sold: 12 },
      { month: new Date(2026, 5, 6),  title: 'Fotojurnalism: Povestea Prin Imagine',       price: 230, seats: 10, sold: 9  },
    ];

    for (const e of photoEvents) {
      const endDate = new Date(e.month);
      endDate.setHours(endDate.getHours() + 7);
      const ev = await mkPastEvent({
        title: e.title,
        description: `Curs intensiv de fotografie organizat de PixelPro Photography Studio.`,
        location: 'PixelPro Studio – Str. Armenească 12, București',
        start_date: e.month,
        end_date: endDate,
        image_url: 'https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?auto=format&fit=crop&w=1200&q=80',
      }, orgPhoto.id, e.price, e.seats, e.sold);

      const participations = genParticipations(ev.id, e.sold, e.month);
      await insertParticipations(participations);
      process.stdout.write('.');
    }
    console.log(`\n${photoEvents.length} evenimente + participări`);

    console.log('FitLife Studio (Pro)...');
    const fitEvents = [
      { month: new Date(2025, 7, 9),  title: 'CrossFit Challenge Weekend',           price: 120, seats: 40, sold: 32 },
      { month: new Date(2025, 9, 4),  title: 'Bootcamp Antrenament Funcțional',      price:  80, seats: 60, sold: 48 },
      { month: new Date(2025, 11, 6), title: 'Yoga Retreat de Iarnă',                price: 150, seats: 25, sold: 21 },
      { month: new Date(2026, 1, 21), title: 'Curs Dans Contemporary pentru Adulți', price:  90, seats: 30, sold: 25 },
      { month: new Date(2026, 3, 5),  title: 'HIIT & TRX Bootcamp Primăvară',        price: 100, seats: 50, sold: 42 },
      { month: new Date(2026, 5, 7),  title: 'Tabără Fitness Urbană – 1 Zi',         price: 130, seats: 35, sold: 28 },
    ];

    for (const e of fitEvents) {
      const endDate = new Date(e.month);
      endDate.setHours(endDate.getHours() + 6);
      const ev = await mkPastEvent({
        title: e.title,
        description: `Eveniment sportiv organizat de FitLife Studio. Antrenori cu experiență, program intens și motivant.`,
        location: 'FitLife Studio – Bd. Unirii 22, București',
        start_date: e.month,
        end_date: endDate,
        image_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
      }, orgFit.id, e.price, e.seats, e.sold);

      const participations = genParticipations(ev.id, e.sold, e.month);
      await insertParticipations(participations);
      process.stdout.write('.');
    }
    console.log(`\n${fitEvents.length} evenimente + participări`);

    console.log('Asociația Culturală Arta (Pro)...');
    const artEvents = [
      { month: new Date(2025, 7, 23),  title: 'Expoziție: Identitate & Diversitate',       price:  0, seats: 200, sold: 145 },
      { month: new Date(2025, 9, 18),  title: 'Spectacol: Povestiri din Tranziție',        price: 50,  seats: 80,  sold: 64  },
      { month: new Date(2025, 11, 20), title: 'Concert de Colinde cu Orchestră Simfonică', price: 80,  seats: 150, sold: 120 },
      { month: new Date(2026, 2, 14),  title: 'Atelier de Ceramică Artizanală',            price: 120, seats: 20,  sold: 17  },
      { month: new Date(2026, 4, 24),  title: 'Vernisaj: Culori de Primăvară',             price: 30,  seats: 100, sold: 72  },
    ];

    for (const e of artEvents) {
      const endDate = new Date(e.month);
      endDate.setHours(endDate.getHours() + 4);
      const ev = await mkPastEvent({
        title: e.title,
        description: `Eveniment cultural organizat de Asociația Culturală Arta. Artă, cultură și comunitate.`,
        location: 'Galeria de Artă Metropolis – Calea Victoriei 45, București',
        start_date: e.month,
        end_date: endDate,
        image_url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80',
      }, orgArt.id, e.price, e.seats, e.sold);

      const participations = genParticipations(ev.id, e.sold, e.month);
      await insertParticipations(participations);
      process.stdout.write('.');
    }
    console.log(`\n${artEvents.length} evenimente + participări`);

    console.log('Cluj Creativ (Pro)...');
    const clujEvents = [
      { month: new Date(2025, 8, 27),  title: 'Designathon 24h – UI/UX Challenge',           price:   0, seats: 80,  sold: 62 },
      { month: new Date(2025, 10, 22), title: 'Meetup: Product Design Cluj',                  price:   0, seats: 100, sold: 78 },
      { month: new Date(2026, 1, 28),  title: 'Workshop Branding & Visual Identity',          price: 150, seats: 30,  sold: 24 },
      { month: new Date(2026, 3, 25),  title: 'Tech Talk: Ecosistemul de Startup Cluj',       price:   0, seats: 120, sold: 92 },
      { month: new Date(2026, 5, 13),  title: 'UX Research Intensiv – Metode și Instrumente', price: 180, seats: 25,  sold: 21 },
    ];

    for (const e of clujEvents) {
      const endDate = new Date(e.month);
      endDate.setHours(endDate.getHours() + 5);
      const ev = await mkPastEvent({
        title: e.title,
        description: `Eveniment comunitate organizat de Cluj Creativ – developeri, designeri și antreprenori.`,
        location: 'Cluj Innovation Park – Str. Taietura Turcului 47, Cluj-Napoca',
        start_date: e.month,
        end_date: endDate,
        image_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80',
      }, orgCluj.id, e.price, e.seats, e.sold);

      const participations = genParticipations(ev.id, e.sold, e.month);
      await insertParticipations(participations);
      process.stdout.write('.');
    }
    console.log(`\n${clujEvents.length} evenimente + participări`);

    console.log('The Coffee Hub (Gratuit)...');
    const cafeEvents = [
      { month: new Date(2025, 9, 11), title: 'Degustare Cafea Colombia Single Origin', price: 60, seats: 18, sold: 14 },
      { month: new Date(2026, 1, 7),  title: 'Curs Barista: Tehnici de Preparare',     price: 80, seats: 12, sold: 10 },
      { month: new Date(2026, 4, 3),  title: 'Speed Dating & Specialty Coffee Night',  price: 50, seats: 24, sold: 20 },
    ];

    for (const e of cafeEvents) {
      const endDate = new Date(e.month);
      endDate.setHours(endDate.getHours() + 2);
      const ev = await mkPastEvent({
        title: e.title,
        description: `Eveniment organizat de The Coffee Hub — atmosferă caldă, cafea de specialitate și oameni fieni.`,
        location: 'The Coffee Hub – Str. Speranței 10, București',
        start_date: e.month,
        end_date: endDate,
        image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
      }, orgCafe.id, e.price, e.seats, e.sold);

      const participations = genParticipations(ev.id, e.sold, e.month);
      await insertParticipations(participations);
      process.stdout.write('.');
    }
    console.log(`\n${cafeEvents.length} evenimente + participări`);

    const totalNew = techEvents.length + photoEvents.length + fitEvents.length + artEvents.length + clujEvents.length + cafeEvents.length;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Date de analytics adăugate cu succes! (${totalNew} evenimente noi)`);
    console.log('');
    console.log('Ce a fost adăugat:');
    console.log(`   TechHub Romania  [Business] — ${techEvents.length} ev. | Iul 2025 – Mai 2026`);
    console.log(`   PixelPro Studio  [Business] — ${photoEvents.length} ev. | Iul 2025 – Iun 2026`);
    console.log(`   FitLife Studio   [Pro]       — ${fitEvents.length} ev. | Aug 2025 – Iun 2026`);
    console.log(`   Asoc. Culturală  [Pro]       — ${artEvents.length} ev. | Aug 2025 – Mai 2026`);
    console.log(`   Cluj Creativ     [Pro]       — ${clujEvents.length} ev. | Sep 2025 – Iun 2026`);
    console.log(`   The Coffee Hub   [Gratuit]   — ${cafeEvents.length} ev. | Oct 2025 – Mai 2026`);
    console.log('');
    console.log('Logare cu admin@techhubromania.ro sau team@pixelprostudio.ro');
    console.log('   pentru a vedea Business Analytics.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(0);
  } catch (err) {
    console.error('\nEroare:', err.message);
    process.exit(1);
  }
};

run();
