import crypto from 'crypto';
import { Event, Participation } from '../models/relationships.js';

const generateTicketCode = () => `TKT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

const generateTicketQrUrl = (ticketCode, event) => {
	const payload = `ticket:${ticketCode}|event:${event.id}|title:${event.title}|date:${event.start_date}`;
	return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(payload)}`;
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const purchaseAsUser = async (req, res) => {
	const { event_id, account_id, buyer_name, buyer_email, quantity = 1 } = req.body;
	const parsedQuantity = Number(quantity);

	if (!event_id || !account_id || !buyer_name || !buyer_email) {
		return res.status(400).json({ message: 'event_id, account_id, buyer_name și buyer_email sunt obligatorii' });
	}

	if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 20) {
		return res.status(400).json({ message: 'quantity trebuie să fie un număr întreg între 1 și 20' });
	}

	if (!isValidEmail(buyer_email)) {
		return res.status(400).json({ message: 'Email invalid' });
	}

	try {
		const event = await Event.findByPk(event_id);
		if (!event) {
			return res.status(404).json({ message: 'Evenimentul nu a fost găsit' });
		}

		if (event.current_occupancy + parsedQuantity > event.max_capacity) {
			return res.status(400).json({ message: 'Eveniment sold out' });
		}

		const ticketData = [];
		for (let index = 0; index < parsedQuantity; index += 1) {
			const ticketCode = generateTicketCode();
			const ticketQr = generateTicketQrUrl(ticketCode, event);

			const participation = await Participation.create({
				account_id,
				event_id,
				buyer_name,
				buyer_email,
				ticket_qr: ticketQr
			});

			ticketData.push({
				participationId: participation.id,
				code: ticketCode,
				qr: ticketQr,
				eventTitle: event.title,
				eventDate: event.start_date,
				eventLocation: event.location,
				buyerName: buyer_name,
				buyerEmail: buyer_email,
				price: Number(event.price) || 0
			});
		}

		await event.increment('current_occupancy', { by: parsedQuantity });

		return res.status(201).json({
			message: 'Bilet cumpărat cu succes',
			quantity: parsedQuantity,
			totalPrice: parsedQuantity * (Number(event.price) || 0),
			tickets: ticketData
		});
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
};

export const purchaseAsGuest = async (req, res) => {
	const { event_id, buyer_name, buyer_email, quantity = 1 } = req.body;
	const parsedQuantity = Number(quantity);

	if (!event_id || !buyer_name || !buyer_email) {
		return res.status(400).json({ message: 'event_id, buyer_name și buyer_email sunt obligatorii' });
	}

	if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 20) {
		return res.status(400).json({ message: 'quantity trebuie să fie un număr întreg între 1 și 20' });
	}

	if (!isValidEmail(buyer_email)) {
		return res.status(400).json({ message: 'Email invalid' });
	}

	try {
		const event = await Event.findByPk(event_id);
		if (!event) {
			return res.status(404).json({ message: 'Evenimentul nu a fost găsit' });
		}

		if (event.current_occupancy + parsedQuantity > event.max_capacity) {
			return res.status(400).json({ message: 'Eveniment sold out' });
		}

		const ticketData = [];
		for (let index = 0; index < parsedQuantity; index += 1) {
			const ticketCode = generateTicketCode();
			const ticketQr = generateTicketQrUrl(ticketCode, event);

			const participation = await Participation.create({
				account_id: null,
				event_id,
				buyer_name,
				buyer_email,
				ticket_qr: ticketQr
			});

			ticketData.push({
				participationId: participation.id,
				code: ticketCode,
				qr: ticketQr,
				eventTitle: event.title,
				eventDate: event.start_date,
				eventLocation: event.location,
				buyerName: buyer_name,
				buyerEmail: buyer_email,
				price: Number(event.price) || 0
			});
		}

		await event.increment('current_occupancy', { by: parsedQuantity });

		return res.status(201).json({
			message: 'Bilet cumpărat cu succes',
			quantity: parsedQuantity,
			totalPrice: parsedQuantity * (Number(event.price) || 0),
			tickets: ticketData
		});
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
};
