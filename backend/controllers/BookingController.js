import crypto from 'crypto';
import Stripe from 'stripe';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { Event, LoyaltyTransaction, LoyaltyWallet, Organization, Participation, TicketType } from '../models/relationships.js';
import { sendTicketEmail } from '../services/EmailService.js';
import { generateTicketsPdfBuffer, sanitizePdfFilename } from '../services/TicketPdfService.js';

const generateTicketCode = () => `TKT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
const POINTS_PER_RON = Number(process.env.LOYALTY_POINTS_PER_RON || 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const stripe = process.env.STRIPE_SECRET_KEY
	? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
	: null;

const toPositiveInteger = (value, fallback = 0) => {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return fallback;
	return Math.max(0, Math.floor(parsed));
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getWalletPoints = async (accountId, orgId) => {
	if (!accountId || !orgId) return 0;

	const wallet = await LoyaltyWallet.findOne({
		where: { account_id: accountId, org_id: orgId },
		attributes: ['id', 'points_balance']
	});

	return toPositiveInteger(wallet?.points_balance, 0);
};

const computePricing = ({ unitPrice, quantity, availablePoints = 0, requestedPoints = 0 }) => {
	const safeQuantity = clamp(toPositiveInteger(quantity, 1), 1, 20);
	const safeUnitPrice = Number(unitPrice || 0);
	const subtotal = Number((safeUnitPrice * safeQuantity).toFixed(2));

	const maxPointsUsable = POINTS_PER_RON > 0
		? Math.min(toPositiveInteger(availablePoints, 0), Math.floor(subtotal * POINTS_PER_RON))
		: 0;

	const pointsUsed = clamp(toPositiveInteger(requestedPoints, 0), 0, maxPointsUsable);
	const discount = POINTS_PER_RON > 0 ? Number((pointsUsed / POINTS_PER_RON).toFixed(2)) : 0;
	const total = Number(Math.max(0, subtotal - discount).toFixed(2));

	return {
		quantity: safeQuantity,
		unitPrice: safeUnitPrice,
		subtotal,
		availablePoints: toPositiveInteger(availablePoints, 0),
		maxPointsUsable,
		pointsUsed,
		discount,
		total
	};
};

const extractTicketCodeFromQr = (qrUrl) => {
	if (!qrUrl) return null;
	try {
		const url = new URL(qrUrl);
		const payload = url.searchParams.get('data');
		if (!payload) return null;
		const match = payload.match(/ticket:([^|]+)/);
		return match?.[1] || null;
	} catch (_error) {
		return null;
	}
};

const getTicketUnitPrice = (event, ticketType) => ticketType
	? Number(ticketType.price || 0)
	: Number(event.price || 0);

const getPointsEarnedPerTicket = (event, ticketUnitPrice) => ticketUnitPrice > 0
	? Number(event.points_value || 0)
	: 0;

const buildTicketData = ({ participation, event, buyerName, buyerEmail, ticketCode, ticketUnitPrice, pointsPerTicket }) => ({
	participationId: participation.id,
	eventId: event.id,
	code: ticketCode || extractTicketCodeFromQr(participation.ticket_qr) || 'TKT-UNKNOWN',
	qr: participation.ticket_qr,
	eventTitle: event.title,
	eventDate: event.start_date,
	eventLocation: event.location,
	buyerName: buyerName || participation.buyer_name,
	buyerEmail: buyerEmail || participation.buyer_email,
	price: ticketUnitPrice,
	points: pointsPerTicket,
	organizationName: event.organization?.name || event.organizationName || event.orgName || 'Organizator'
});

const enrichTicketsWithOrganizationName = async (tickets = []) => {
	if (!Array.isArray(tickets) || tickets.length === 0) return tickets;

	const eventIds = [...new Set(
		tickets
			.map((ticket) => ticket?.eventId || null)
			.filter(Boolean)
	)];

	if (eventIds.length === 0) return tickets;

	const events = await Event.findAll({
		where: { id: { [Op.in]: eventIds } },
		attributes: ['id'],
		include: [{ association: 'organization', attributes: ['name'] }]
	});

	const organizerByEventId = new Map(
		events.map((event) => [event.id, event.organization?.name || null])
	);

	return tickets.map((ticket) => {
		if (!ticket) return ticket;

		const currentName = String(ticket.organizationName || '').trim();
		if (currentName && currentName.toLowerCase() !== 'organizator') {
			return ticket;
		}

		const organizerName = organizerByEventId.get(ticket.eventId);
		if (!organizerName) return ticket;

		return {
			...ticket,
			organizationName: organizerName
		};
	});
};

const loadEventForUpdate = async ({ eventId, transaction }) => {
	const event = await Event.findByPk(eventId, {
		transaction,
		lock: transaction.LOCK.UPDATE
	});

	if (!event) return null;

	if (event.org_id) {
		const organization = await Organization.findByPk(event.org_id, {
			attributes: ['name'],
			transaction
		});

		if (organization?.name) {
			event.setDataValue('organizationName', organization.name);
		}
	}

	return event;
};

const createParticipations = async ({
	transaction,
	event,
	accountId,
	buyerName,
	buyerEmail,
	quantity,
	paymentSessionId,
	ticketUnitPrice,
	pointsPerTicket
}) => {
	const tickets = [];

	for (let index = 0; index < quantity; index += 1) {
		const ticketCode = generateTicketCode();
		const ticketQr = generateTicketQrUrl(ticketCode, event);

		const participation = await Participation.create({
			account_id: accountId,
			event_id: event.id,
			buyer_name: buyerName,
			buyer_email: buyerEmail,
			ticket_qr: ticketQr,
			payment_session_id: paymentSessionId || null
		}, { transaction });

		tickets.push(buildTicketData({ participation, event, buyerName, buyerEmail, ticketCode, ticketUnitPrice, pointsPerTicket }));
	}

	return tickets;
};

const completePurchase = async ({
	eventId,
	accountId,
	buyerName,
	buyerEmail,
	quantity,
	ticketTypeId = null,
	pointsUsed = 0,
	paymentSessionId = null,
	transaction: existingTransaction = null
}) => {
	const executePurchase = async (transaction) => {
		const event = await loadEventForUpdate({ eventId, transaction });

		if (!event) {
			throw new Error('Evenimentul nu a fost găsit');
		}

		if (event.current_occupancy + quantity > event.max_capacity) {
			throw new Error('Eveniment sold out');
		}

		let selectedTicketType = null;
		if (ticketTypeId) {
			selectedTicketType = await TicketType.findByPk(ticketTypeId, {
				transaction,
				lock: transaction.LOCK.UPDATE
			});

			if (!selectedTicketType || selectedTicketType.event_id !== event.id) {
				throw new Error('Tipul de bilet nu a fost găsit');
			}

			const typeCapacity = Number(selectedTicketType.quantity || 0);
			const typeSold = Number(selectedTicketType.sold_quantity || 0);
			if (typeSold + quantity > typeCapacity) {
				throw new Error('Nu mai sunt suficiente bilete disponibile pentru tipul selectat');
			}
		}

		if (pointsUsed > 0 && accountId) {
			if (!event.org_id) {
				throw new Error('Punctele de loialitate pot fi folosite doar la evenimente asociate unei organizații.');
			}

			const wallet = await LoyaltyWallet.findOne({
				where: { account_id: accountId, org_id: event.org_id },
				transaction,
				lock: transaction.LOCK.UPDATE
			});

			if (!wallet) {
				throw new Error('Portofelul de loialitate nu a fost găsit.');
			}

			const currentBalance = toPositiveInteger(wallet?.points_balance, 0);
			if (currentBalance < pointsUsed) {
				throw new Error('Punctele disponibile nu mai acoperă reducerea selectată. Reîncearcă plata.');
			}

			await wallet.decrement('points_balance', { by: pointsUsed, transaction });
			await LoyaltyTransaction.create({
				wallet_id: wallet.id,
				event_id: event.id,
				points_amount: pointsUsed,
				type: 'redeem'
			}, { transaction });
		}

		const ticketUnitPrice = getTicketUnitPrice(event, selectedTicketType);
		const pointsPerTicket = getPointsEarnedPerTicket(event, ticketUnitPrice);

		if (accountId && event.org_id && pointsPerTicket > 0) {
			const pointsEarned = pointsPerTicket * quantity;
			const [wallet] = await LoyaltyWallet.findOrCreate({
				where: {
					account_id: accountId,
					org_id: event.org_id
				},
				defaults: {
					account_id: accountId,
					org_id: event.org_id,
					points_balance: 0
				},
				transaction,
				lock: transaction.LOCK.UPDATE
			});

			await wallet.increment('points_balance', { by: pointsEarned, transaction });
			await LoyaltyTransaction.create({
				wallet_id: wallet.id,
				event_id: event.id,
				points_amount: pointsEarned,
				type: 'earn'
			}, { transaction });
		}

		const tickets = await createParticipations({
			transaction,
			event,
			accountId,
			buyerName,
			buyerEmail,
			quantity,
			paymentSessionId,
			ticketUnitPrice,
			pointsPerTicket
		});

		if (selectedTicketType) {
			await selectedTicketType.increment('sold_quantity', { by: quantity, transaction });
		}

		await event.increment('current_occupancy', { by: quantity, transaction });

		return {
			event,
			tickets,
			quantity,
			totalPrice: Number((quantity * (Number(event.price) || 0)).toFixed(2))
		};
	};

	if (existingTransaction) {
		return executePurchase(existingTransaction);
	}

	return sequelize.transaction(executePurchase);
};

const generateTicketQrUrl = (ticketCode, event) => {
	const payload = `ticket:${ticketCode}|event:${event.id}|title:${event.title}|date:${event.start_date}`;
	return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(payload)}`;

};

const sendPurchaseEmailSafely = async ({ event, buyerName, buyerEmail, tickets, quantity, totalPrice }) => {
	if (!buyerEmail || !tickets?.length) {
		return false;
	}

	try {
		const enrichedTickets = await enrichTicketsWithOrganizationName(tickets);

		const result = await sendTicketEmail({
			buyerEmail,
			buyerName: buyerName || 'Participant',
			eventTitle: event?.title || tickets[0]?.eventTitle || 'Eveniment',
			eventDate: event?.start_date || tickets[0]?.eventDate || new Date().toISOString(),
			eventLocation: event?.location || tickets[0]?.eventLocation || 'Locatie nespecificata',
			tickets: enrichedTickets,
			quantity: toPositiveInteger(quantity, tickets.length),
			totalPrice: Number(totalPrice || 0)
		});

		return Boolean(result?.success);
	} catch (error) {
		return false;
	}
};

export const sendTicketsByEmail = async (req, res) => {
	const { buyerEmail, buyerName, eventTitle, eventDate, eventLocation, tickets, quantity, totalPrice } = req.body;

	if (!buyerEmail || !buyerName || !eventTitle || !tickets || quantity === undefined) {
		return res.status(400).json({ message: 'Missing required fields' });
	}

	try {
		const enrichedTickets = await enrichTicketsWithOrganizationName(tickets);

		const result = await sendTicketEmail({
			buyerEmail,
			buyerName,
			eventTitle,
			eventDate: eventDate || new Date().toISOString(),
			eventLocation: eventLocation || 'Locatie nespecificata',
			tickets: enrichedTickets,
			quantity,
			totalPrice
		});

		if (result.success) {
			return res.status(200).json({
				message: 'Email sent successfully',
				messageId: result.messageId,
				accepted: result.accepted || [],
				rejected: result.rejected || []
			});
		} else {
			return res.status(500).json({
				message: 'Failed to send email',
				error: result.message
			});
		}
	} catch (error) {
		return res.status(500).json({
			message: 'Error sending email',
			error: error.message,
			details: process.env.NODE_ENV === 'development' ? error.stack : undefined
		});
	}
};

export const generateTicketsPdf = async (req, res) => {
	const { eventTitle, tickets, fileName, layoutMode } = req.body;

	if (!eventTitle || !Array.isArray(tickets) || tickets.length === 0) {
		return res.status(400).json({ message: 'Missing required fields' });
	}

	try {
		const enrichedTickets = await enrichTicketsWithOrganizationName(tickets);

		const pdfBuffer = await generateTicketsPdfBuffer({
			eventTitle,
			tickets: enrichedTickets,
			layoutMode: layoutMode === 'stack' ? 'stack' : 'single'
		});

		const safeFileName = sanitizePdfFilename(fileName || eventTitle);
		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.pdf"`);
		return res.status(200).send(pdfBuffer);
	} catch (error) {
		return res.status(500).json({
			message: 'Error generating PDF',
			error: error.message,
			details: process.env.NODE_ENV === 'development' ? error.stack : undefined
		});
	}
};
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const getPurchaseQuote = async (req, res) => {
	const eventId = req.query.event_id;
	const ticketTypeId = req.query.ticket_type_id;
	const quantity = clamp(toPositiveInteger(req.query.quantity, 1), 1, 20);
	const requestedPoints = toPositiveInteger(req.query.points_to_use, 0);
	const accountId = req.user?.id || null;

	if (!eventId) {
		return res.status(400).json({ message: 'event_id este obligatoriu' });
	}

	try {
		const event = await Event.findByPk(eventId);
		if (!event) {
			return res.status(404).json({ message: 'Evenimentul nu a fost găsit' });
		}

		let unitPrice = Number(event.price) || 0;
		if (ticketTypeId) {
			const ticketType = await TicketType.findByPk(ticketTypeId);
			if (!ticketType) {
				return res.status(404).json({ message: 'Tipul de bilet nu a fost găsit' });
			}
			unitPrice = Number(ticketType.price) || 0;
		}

		const availablePoints = await getWalletPoints(accountId, event.org_id);
		const pricing = computePricing({
			unitPrice,
			quantity,
			availablePoints,
			requestedPoints
		});

		return res.json({
			event: {
				id: event.id,
				title: event.title,
				price: unitPrice,
				orgId: event.org_id || null
			},
			pricing,
			loyalty: {
				pointsPerRon: POINTS_PER_RON,
				canUsePoints: Boolean(accountId && event.org_id)
			}
		});
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
};

const REFERRAL_BONUS_POINTS = 50;

const awardReferralBonus = async ({ referredBy, orgId, eventId }) => {
	if (!referredBy || !orgId) return;
	try {
		const [wallet] = await LoyaltyWallet.findOrCreate({
			where: { account_id: referredBy, org_id: orgId },
			defaults: { points_balance: 0 }
		});
		await sequelize.transaction(async (t) => {
			await wallet.increment('points_balance', { by: REFERRAL_BONUS_POINTS, transaction: t });
			await LoyaltyTransaction.create({
				wallet_id: wallet.id,
				event_id: eventId,
				points_amount: REFERRAL_BONUS_POINTS,
				type: 'referral'
			}, { transaction: t });
		});
	} catch (err) {
	}
};

export const createCheckoutSession = async (req, res) => {
	const {
		event_id,
		ticket_type_id,
		buyer_name,
		buyer_email,
		quantity = 1,
		use_points = false,
		points_to_use = 0,
		referred_by = null
	} = req.body;

	const accountId = req.user?.id || null;
	const parsedQuantity = clamp(toPositiveInteger(quantity, 1), 1, 20);

	if (!event_id || !buyer_name || !buyer_email) {
		return res.status(400).json({ message: 'event_id, buyer_name și buyer_email sunt obligatorii' });
	}

	if (!isValidEmail(buyer_email)) {
		return res.status(400).json({ message: 'Email invalid' });
	}

	try {
		const event = await Event.findByPk(event_id);
		if (!event) {
			return res.status(404).json({ message: 'Evenimentul nu a fost găsit' });
		}

		let unitPrice = Number(event.price) || 0;
		let selectedTicketType = null;

		if (ticket_type_id) {
			selectedTicketType = await TicketType.findByPk(ticket_type_id);
			if (!selectedTicketType) {
				return res.status(404).json({ message: 'Tipul de bilet nu a fost găsit' });
			}
			if (selectedTicketType.event_id !== event.id) {
				return res.status(400).json({ message: 'Tipul de bilet nu aparține acestui eveniment' });
			}
			unitPrice = Number(selectedTicketType.price) || 0;

			const typeCapacity = Number(selectedTicketType.quantity || 0);
			const typeSold = Number(selectedTicketType.sold_quantity || 0);
			if (typeSold + parsedQuantity > typeCapacity) {
				return res.status(400).json({ message: 'Nu mai sunt suficiente bilete disponibile pentru tipul selectat' });
			}
		}

		if (event.current_occupancy + parsedQuantity > event.max_capacity) {
			return res.status(400).json({ message: 'Eveniment sold out' });
		}

		const availablePoints = await getWalletPoints(accountId, event.org_id);
		const pricing = computePricing({
			unitPrice,
			quantity: parsedQuantity,
			availablePoints,
			requestedPoints: accountId && use_points ? points_to_use : 0
		});

		if (pricing.total <= 0) {
			const noChargeSessionId = `FREE-${crypto.randomBytes(8).toString('hex')}`;
			const purchase = await completePurchase({
				eventId: event.id,
				accountId,
				buyerName: buyer_name.trim(),
				buyerEmail: buyer_email.trim(),
				quantity: pricing.quantity,
				ticketTypeId: selectedTicketType?.id || null,
				pointsUsed: pricing.pointsUsed,
				paymentSessionId: noChargeSessionId
			});

			const emailSent = await sendPurchaseEmailSafely({
				event: purchase.event,
				buyerName: buyer_name.trim(),
				buyerEmail: buyer_email.trim(),
				tickets: purchase.tickets,
				quantity: purchase.quantity,
				totalPrice: pricing.total
			});

			if (referred_by && accountId && String(referred_by) !== String(accountId)) {
				await awardReferralBonus({ referredBy: referred_by, orgId: event.org_id, eventId: event.id });
			}

			return res.status(201).json({
				checkoutRequired: false,
				message: 'Bilet cumpărat cu succes',
				quantity: purchase.quantity,
				totalPrice: 0,
				tickets: purchase.tickets,
				emailSent,
				pricing
			});
		}

		if (!stripe) {
			return res.status(500).json({
				message: 'Stripe nu este configurat. Setează STRIPE_SECRET_KEY în backend.'
			});
		}

		const mode = accountId ? 'user' : 'guest';
		const successUrl = `${FRONTEND_URL}/purchase/${event.id}?mode=${mode}&payment=success&session_id={CHECKOUT_SESSION_ID}`;
		const cancelUrl = `${FRONTEND_URL}/purchase/${event.id}?mode=${mode}&payment=cancel`;

		const session = await stripe.checkout.sessions.create({
			mode: 'payment',
			success_url: successUrl,
			cancel_url: cancelUrl,
			customer_email: buyer_email.trim(),
			line_items: [
				{
					quantity: 1,
					price_data: {
						currency: 'ron',
						unit_amount: Math.round(pricing.total * 100),
						product_data: {
							name: `${event.title} (${pricing.quantity} bilet${pricing.quantity > 1 ? 'e' : ''})`,
							description: pricing.pointsUsed > 0
								? `Subtotal ${pricing.subtotal} RON, reducere puncte ${pricing.discount} RON`
								: `Subtotal ${pricing.subtotal} RON`
						}
					}
				}
			],
			metadata: {
				event_id: String(event.id),
				ticket_type_id: selectedTicketType?.id ? String(selectedTicketType.id) : '',
				account_id: accountId ? String(accountId) : '',
				buyer_name: buyer_name.trim(),
				buyer_email: buyer_email.trim(),
				quantity: String(pricing.quantity),
				points_used: String(pricing.pointsUsed),
				referred_by: referred_by ? String(referred_by) : ''
			}
		});

		return res.status(201).json({
			checkoutRequired: true,
			checkoutUrl: session.url,
			sessionId: session.id,
			pricing
		});
	} catch (error) {
		return res.status(500).json({
			message: 'Eroare la inițializarea plății',
			error: error.message,
			details: process.env.NODE_ENV === 'development' ? error.stack : undefined
		});
	}
};

export const confirmCheckoutSession = async (req, res) => {
	const { session_id } = req.body;

	if (!session_id) {
		return res.status(400).json({ message: 'session_id este obligatoriu' });
	}

	if (!stripe) {
		return res.status(500).json({ message: 'Stripe nu este configurat.' });
	}

	try {
		const session = await stripe.checkout.sessions.retrieve(session_id);

		if (session.payment_status !== 'paid') {
			return res.status(400).json({ message: 'Plata nu este confirmată.' });
		}

		const metadata = session.metadata || {};
		const eventId = metadata.event_id;

		if (!eventId) {
			return res.status(400).json({ message: 'Sesiune Stripe invalidă (fără event_id).' });
		}

		const accountId = metadata.account_id || null;
		const ticketTypeId = metadata.ticket_type_id || null;
		const pointsUsed = toPositiveInteger(metadata.points_used, 0);
		const quantity = clamp(toPositiveInteger(metadata.quantity, 1), 1, 20);

		const result = await sequelize.transaction(async (transaction) => {
			const event = await loadEventForUpdate({ eventId, transaction });

			if (!event) {
				throw new Error('Evenimentul nu a fost găsit');
			}

			const existingParticipations = await Participation.findAll({
				where: { payment_session_id: session.id },
				transaction
			});

			if (existingParticipations.length > 0) {
				const tickets = existingParticipations.map((participation) => buildTicketData({
					participation,
					event,
					buyerName: metadata.buyer_name,
					buyerEmail: metadata.buyer_email
				}));

				return {
					statusCode: 200,
					emailData: null,
					payload: {
						message: 'Bilet cumpărat cu succes',
						quantity: tickets.length,
						totalPrice: Number((session.amount_total || 0) / 100),
						tickets,
						emailSent: false
					}
				};
			}

			const purchase = await completePurchase({
				eventId: event.id,
				accountId: accountId || null,
				buyerName: metadata.buyer_name || session.customer_details?.name || 'Participant',
				buyerEmail: metadata.buyer_email || session.customer_details?.email || '',
				quantity,
				ticketTypeId: ticketTypeId || null,
				pointsUsed,
				paymentSessionId: session.id,
				transaction
			});

			return {
				statusCode: 201,
				metadata,
				eventOrgId: event.org_id,
				eventId: event.id,
				emailData: {
					event,
					buyerName: metadata.buyer_name || session.customer_details?.name || 'Participant',
					buyerEmail: metadata.buyer_email || session.customer_details?.email || '',
					tickets: purchase.tickets,
					quantity: purchase.quantity,
					totalPrice: Number((session.amount_total || 0) / 100)
				},
				payload: {
					message: 'Bilet cumpărat cu succes',
					quantity: purchase.quantity,
					totalPrice: Number((session.amount_total || 0) / 100),
					tickets: purchase.tickets,
					emailSent: false
				}
			};
		});

		if (result.emailData) {
			result.payload.emailSent = await sendPurchaseEmailSafely(result.emailData);
		}

		const referredBy = result.metadata?.referred_by || null;
		const purchasedAccountId = result.metadata?.account_id || null;
		if (referredBy && purchasedAccountId && referredBy !== purchasedAccountId && result.eventOrgId) {
			await awardReferralBonus({ referredBy, orgId: result.eventOrgId, eventId: result.eventId });
		}

		return res.status(result.statusCode).json(result.payload);
	} catch (error) {
		if (error.message === 'Evenimentul nu a fost găsit') {
			return res.status(404).json({ message: error.message });
		}
		return res.status(500).json({
			message: 'Eroare la confirmarea plății',
			error: error.message,
			details: process.env.NODE_ENV === 'development' ? error.stack : undefined
		});
	}
};

