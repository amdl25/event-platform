import sequelize from '../config/database.js';
import {
  Organization, Event, Category, TicketType,
} from '../models/relationships.js';

const mkEvent = async (data, categories, ticketTypes = []) => {
  const ev = await Event.create({ creator_id: null, ...data });
  if (categories.length > 0) await ev.addCategories(categories);
  for (let i = 0; i < ticketTypes.length; i++) {
    await TicketType.create({ event_id: ev.id, display_order: i, ...ticketTypes[i] });
  }
  return ev;
};

const run = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: false });
    console.log('Conectat la baza de date...\n');

    const [
      coffeeShop, orgTech, orgArt, orgFit, orgPhoto, orgCluj, orgTm,
    ] = await Promise.all([
      Organization.findOne({ where: { name: 'The Coffee Hub' } }),
      Organization.findOne({ where: { name: 'TechHub Romania' } }),
      Organization.findOne({ where: { name: 'Asociația Culturală Arta' } }),
      Organization.findOne({ where: { name: 'FitLife Studio' } }),
      Organization.findOne({ where: { name: 'PixelPro Photography Studio' } }),
      Organization.findOne({ where: { name: 'Cluj Creativ' } }),
      Organization.findOne({ where: { name: 'Timișoara Events' } }),
    ]);

    const [
      catMuzica, catArta, catSpectacole, catSport,
      catFood, catWorkshop, catComunitate, catPetreceri, catNatura,
    ] = await Promise.all([
      Category.findOne({ where: { name: 'Muzică' } }),
      Category.findOne({ where: { name: 'Artă & Cultură' } }),
      Category.findOne({ where: { name: 'Spectacole' } }),
      Category.findOne({ where: { name: 'Sport' } }),
      Category.findOne({ where: { name: 'Food & Drinks' } }),
      Category.findOne({ where: { name: 'Workshop-uri' } }),
      Category.findOne({ where: { name: 'Comunitate & Familie' } }),
      Category.findOne({ where: { name: 'Petreceri' } }),
      Category.findOne({ where: { name: 'Natură & Aventură' } }),
    ]);

    await mkEvent({
      title: 'Festival Craft Beer – Herăstrău',
      description: 'Peste 20 de berării artizanale românești și internaționale sub același acoperiș. Muzică live, food trucks și ateliere de degustare.',
      location: 'Parcul Herăstrău – Terasa Lacului, București',
      start_date: new Date(2026, 5, 27, 13, 0),
      end_date:   new Date(2026, 5, 27, 22, 0),
      max_capacity: 500, current_occupancy: 120,
      price: 30.00, points_value: 100,
      image_url: 'https://images.unsplash.com/photo-1559526324-593bc073d938?auto=format&fit=crop&w=1200&q=80',
      org_id: orgTm.id,
    }, [catFood, catComunitate], [
      { name: 'Acces + 3 degustări', price: 30.00, quantity: 400, sold_quantity: 95, points_reward: 100 },
      { name: 'VIP + 8 degustări',   price: 65.00, quantity: 100, sold_quantity: 25, points_reward: 200 },
    ]);

    await mkEvent({
      title: 'Open Air Cinema – Filme Clasice Sub Stele',
      description: 'Proiecție în aer liber cu două filme clasice românești. Șezlonguri, popcorn și băuturi artizanale incluse.',
      location: 'Grădina Botanică – Aleea Centrală, Cluj-Napoca',
      start_date: new Date(2026, 5, 27, 21, 30),
      end_date:   new Date(2026, 5, 28, 0, 30),
      max_capacity: 150, current_occupancy: 60,
      price: 25.00, points_value: 80,
      image_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
      org_id: orgCluj.id,
    }, [catSpectacole, catArta], [
      { name: 'Bilet Seară', price: 25.00, quantity: 150, sold_quantity: 60, points_reward: 80 },
    ]);

    await mkEvent({
      title: 'Workshop Ceramică – Modelaj pe Roată',
      description: 'Sesiune hands-on de modelaj pe roată de olar, cu argilos și glazuri. Rezultatul tău pleacă acasă după ardere (livrare în 10 zile).',
      location: 'Studio Artizanat – Str. Doamnei 11, București',
      start_date: new Date(2026, 5, 27, 10, 0),
      end_date:   new Date(2026, 5, 27, 13, 0),
      max_capacity: 12, current_occupancy: 5,
      price: 120.00, points_value: 180,
      image_url: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1200&q=80',
      org_id: orgArt.id,
    }, [catArta, catWorkshop], [
      { name: 'Loc la Atelier', price: 120.00, quantity: 12, sold_quantity: 5, points_reward: 180, description: 'Materiale incluse + livrare piesă arsă' },
    ]);

    await mkEvent({
      title: 'Alergare de Dimineață – 5K Sunrise Run',
      description: 'Alergăm împreună 5km la răsărit. Traseu marcat, tempo relaxat, cafea oferită la final de FitLife Studio.',
      location: 'Parcul Tineretului – Intrarea Sud, București',
      start_date: new Date(2026, 5, 27, 7, 0),
      end_date:   new Date(2026, 5, 27, 8, 30),
      max_capacity: 80, current_occupancy: 22,
      price: 0, points_value: 60,
      image_url: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?auto=format&fit=crop&w=1200&q=80',
      org_id: orgFit.id,
    }, [catSport, catComunitate], [
      { name: 'Gratuit', price: 0, quantity: 80, sold_quantity: 22, points_reward: 60 },
    ]);

    await mkEvent({
      title: 'Concert Acustic – Seri de Vară la Cafenea',
      description: 'Doi artiști independenți cântă live acoustic: indie folk și jazz vocal. 60 de locuri, atmosferă intimă.',
      location: 'The Coffee Hub – Str. Speranței 10, București',
      start_date: new Date(2026, 5, 27, 19, 0),
      end_date:   new Date(2026, 5, 27, 22, 0),
      max_capacity: 60, current_occupancy: 35,
      price: 40.00, points_value: 120,
      image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
      org_id: coffeeShop.id,
    }, [catMuzica, catSpectacole], [
      { name: 'Bilet + consumație', price: 40.00, quantity: 60, sold_quantity: 35, points_reward: 120 },
    ]);

    await mkEvent({
      title: 'Hackathon 24h – Green Tech Challenge',
      description: 'Construiți soluții tech pentru sustenabilitate în 24 de ore. Premii în valoare de 10.000 lei și mentorat de la parteneri corporate.',
      location: 'TechHub HQ – Str. Polizu 1-3, București',
      start_date: new Date(2026, 5, 27, 9, 0),
      end_date:   new Date(2026, 5, 28, 9, 0),
      max_capacity: 100, current_occupancy: 40,
      price: 0, points_value: 300,
      image_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
      org_id: orgTech.id,
    }, [catWorkshop, catComunitate], [
      { name: 'Participant (echipă 2-4 pers.)', price: 0, quantity: 100, sold_quantity: 40, points_reward: 300 },
    ]);


    await mkEvent({
      title: 'Yoga & Brunch în Aer Liber',
      description: 'Sesiune de yoga flow de 60 min urmată de un brunch sănătos cu produse bio locale. Saltele puse la dispoziție.',
      location: 'Parcul Herăstrău – Pajiștea Nordică, București',
      start_date: new Date(2026, 5, 28, 9, 0),
      end_date:   new Date(2026, 5, 28, 12, 0),
      max_capacity: 40, current_occupancy: 18,
      price: 85.00, points_value: 150,
      image_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
      org_id: orgFit.id,
    }, [catSport, catFood], [
      { name: 'Yoga + Brunch', price: 85.00, quantity: 40, sold_quantity: 18, points_reward: 150 },
    ]);

    await mkEvent({
      title: 'Târg de Artă & Design – Sunday Market',
      description: 'Peste 40 de artiști și designeri locali prezintă ilustrații, bijuterii, ceramică, textile și artă vizuală. Intrare liberă.',
      location: 'Piața Lahovari, București',
      start_date: new Date(2026, 5, 28, 11, 0),
      end_date:   new Date(2026, 5, 28, 19, 0),
      max_capacity: 1000, current_occupancy: 200,
      price: 0, points_value: 50,
      image_url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80',
      org_id: orgArt.id,
    }, [catArta, catComunitate], [
      { name: 'Intrare Liberă', price: 0, quantity: 1000, sold_quantity: 200, points_reward: 50 },
    ]);

    await mkEvent({
      title: 'Tur Fotografic – Timișoara Secesionistă',
      description: 'Explorăm clădirile Art Nouveau și Secession din Timișoara cu ochiul aparatului foto. Ghid arhitect + instructor foto.',
      location: 'Piața Victoriei – Centrul Vechi, Timișoara',
      start_date: new Date(2026, 5, 28, 10, 0),
      end_date:   new Date(2026, 5, 28, 13, 30),
      max_capacity: 15, current_occupancy: 6,
      price: 80.00, points_value: 140,
      image_url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80',
      org_id: orgPhoto.id,
    }, [catArta, catWorkshop], [
      { name: 'Participant', price: 80.00, quantity: 15, sold_quantity: 6, points_reward: 140 },
    ]);

    await mkEvent({
      title: 'Petrecere în Grădină – Sunday Fiesta',
      description: 'DJ set, cocktailuri tropicale și mâncare fusion pe terasa cu piscină. Dress code: colorat.',
      location: 'Club Nuba – Str. Făt-Frumos 9, București',
      start_date: new Date(2026, 5, 28, 16, 0),
      end_date:   new Date(2026, 5, 28, 23, 59),
      max_capacity: 250, current_occupancy: 90,
      price: 80.00, points_value: 150,
      image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
      org_id: orgTm.id,
    }, [catPetreceri, catMuzica], [
      { name: 'Bilet Standard',          price: 80.00,  quantity: 200, sold_quantity: 80, points_reward: 150 },
      { name: 'VIP + 2 cocktailuri',     price: 150.00, quantity: 50,  sold_quantity: 10, points_reward: 280 },
    ]);

    await mkEvent({
      title: 'Picnic Family Day – Parc & Activități pentru Copii',
      description: 'Zi de picnic în familie: jocuri organizate, atelier de pictură pentru copii, muzică live ușoară și food trucks cu opțiuni vegane.',
      location: 'Parcul Rozelor, Cluj-Napoca',
      start_date: new Date(2026, 5, 28, 11, 0),
      end_date:   new Date(2026, 5, 28, 18, 0),
      max_capacity: 300, current_occupancy: 75,
      price: 0, points_value: 40,
      image_url: 'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?auto=format&fit=crop&w=1200&q=80',
      org_id: orgCluj.id,
    }, [catComunitate, catNatura], [
      { name: 'Intrare Liberă', price: 0, quantity: 300, sold_quantity: 75, points_reward: 40 },
    ]);

    console.log('✅ 11 evenimente noi adăugate pentru weekendul 27-28 iunie 2026!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Eroare:', err);
    process.exit(1);
  }
};

run();
