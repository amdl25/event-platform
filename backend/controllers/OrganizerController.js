import Stripe from 'stripe';
import { Account, Event, Organization, Participation } from '../models/relationships.js';
import { getNotificationsForAccount, markAllNotificationsRead, getOrgPlan, setOrgPlan } from '../utils/fileStorage.js';
import sequelize from '../config/database.js';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null;

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const PLAN_PRICES = { pro: 99, business: 249 };
const PLAN_NAMES = { pro: 'Pro', business: 'Business' };

const formatPersonName = (firstName, lastName, fallback = 'Utilizator') => `${firstName || ''} ${lastName || ''}`.trim() || fallback;

const getOrganizerOrganization = async (accountId) => {
  return Organization.findOne({
    where: { owner_id: accountId },
    include: [{ model: Account, as: 'owner', attributes: ['id', 'first_name', 'last_name', 'email'] }]
  });
};

const buildEventStatus = (event) => {
  const now = new Date();
  const start = event.start_date ? new Date(event.start_date) : null;
  const end = event.end_date ? new Date(event.end_date) : null;

  if (end && end < now) return { label: 'Încheiat', className: 'ended' };
  if ((Number(event.current_occupancy || 0) === 0) && start && start > now) return { label: 'Draft', className: 'draft' };
  return { label: 'Publicat', className: 'published' };
};

export const getOrganizerDashboard = async (req, res) => {
  try {
    const accountId = req.user?.id;
    if (!accountId) {
      return res.status(401).json({ message: 'Neautorizat.' });
    }

    const organization = await getOrganizerOrganization(accountId);
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită.' });
    }

    const events = await Event.findAll({
      where: { org_id: organization.id },
      include: [
        { model: Participation, attributes: ['id', 'buyer_name', 'buyer_email', 'status', 'invite_status', 'createdAt', 'account_id'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const eventCards = events.map((event) => {
      const occupancy = Number(event.current_occupancy || 0);
      const capacity = Number(event.max_capacity || 0);
      const progress = capacity > 0 ? Math.min(100, Math.round((occupancy / capacity) * 100)) : 0;
      const status = buildEventStatus(event);

      return {
        id: event.id,
        title: event.title,
        startDate: event.start_date,
        location: event.location,
        occupancy,
        capacity,
        progress,
        price: Number(event.price || 0),
        status,
        categories: (event.categories || []).map((category) => category.name)
      };
    });

    const allParticipations = events.flatMap((event) => {
      const eventData = event.toJSON();
      return (eventData.Participations || []).map((participation) => ({
        ...participation,
        event: {
          id: eventData.id,
          title: eventData.title,
          price: Number(eventData.price || 0),
          pointsValue: Number(eventData.points_value || 0)
        }
      }));
    });

    const soldTickets = allParticipations.filter((item) => !['canceled', 'rejected'].includes(item.status)).length;
    const pendingReturns = allParticipations.filter((item) => ['canceled', 'pending'].includes(item.status) || item.invite_status === 'pending').length;
    const totalRevenue = allParticipations.reduce((sum, item) => {
      if (['canceled', 'rejected'].includes(item.status)) return sum;
      return sum + Number(item.event?.price || 0);
    }, 0);
    const pointsAwarded = allParticipations.reduce((sum, item) => {
      if (['canceled', 'rejected'].includes(item.status)) return sum;
      return sum + Number(item.event?.pointsValue || 0);
    }, 0);
    const activeEvents = eventCards.filter((item) => item.status.label !== 'Încheiat').length;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthlyEvents = events.filter((event) => {
      const startDate = new Date(event.start_date);
      return startDate >= startOfMonth && startDate <= endOfMonth && event.moderation_status !== 'hidden';
    }).length;
    const totalParticipants = allParticipations.length;

    const recentTransactions = [...allParticipations]
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
      .slice(0, 8)
      .map((item) => {
        const amount = Number(item.event?.price || 0);
        const isCancelled = ['canceled', 'rejected'].includes(item.status);

        return {
          id: item.id,
          participant: item.buyer_name || formatPersonName(item.Account?.first_name, item.Account?.last_name),
          email: item.buyer_email || item.Account?.email || '',
          eventTitle: item.event?.title || 'Eveniment',
          amount: isCancelled ? -amount : amount,
          status: isCancelled ? 'Returnat' : 'Finalizat',
          createdAt: item.createdAt
        };
      });

    const recentActivity = [...allParticipations]
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        name: item.buyer_name || formatPersonName(item.Account?.first_name, item.Account?.last_name),
        eventTitle: item.event?.title || 'Eveniment',
        status: item.status === 'canceled' ? 'return' : item.status === 'checked-in' ? 'checkin' : 'registered',
        createdAt: item.createdAt
      }));

    return res.json({
      organization: {
        id: organization.id,
        name: organization.name,
        verificationStatus: organization.verification_status,
        adminStatus: organization.admin_status,
        owner: organization.owner ? {
          id: organization.owner.id,
          name: formatPersonName(organization.owner.first_name, organization.owner.last_name),
          email: organization.owner.email
        } : null
      },
      stats: {
        totalRevenue,
        soldTickets,
        pointsAwarded,
        pendingReturns,
        activeEvents,
        monthlyEvents,
        totalParticipants,
        totalEvents: eventCards.length
      },
      events: eventCards,
      transactions: recentTransactions,
      recentActivity
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getOrganizerAnalytics = async (req, res) => {
  try {
    const accountId = req.user?.id;
    if (!accountId) return res.status(401).json({ message: 'Neautorizat.' });

    const organization = await getOrganizerOrganization(accountId);
    if (!organization) return res.status(404).json({ message: 'Organizația nu a fost găsită.' });

    const orgId = organization.id;

    const [monthlyRevenue] = await sequelize.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', p."createdAt"), 'YYYY-MM') AS month,
        SUM(e.price) AS revenue,
        COUNT(p.id) AS ticket_count
      FROM participation p
      JOIN event e ON p.event_id = e.id
      WHERE e.org_id = :orgId
        AND p.status NOT IN ('canceled', 'rejected')
        AND p."createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', p."createdAt")
      ORDER BY DATE_TRUNC('month', p."createdAt") ASC
    `, { replacements: { orgId } });

    const [topEvents] = await sequelize.query(`
      SELECT
        e.id,
        e.title,
        e.start_date,
        e.max_capacity,
        e.current_occupancy,
        COALESCE(SUM(CASE WHEN p.status NOT IN ('canceled','rejected') THEN e.price ELSE 0 END), 0) AS revenue,
        COUNT(CASE WHEN p.status NOT IN ('canceled','rejected') THEN 1 END)::int AS ticket_count,
        CASE WHEN e.max_capacity > 0
          THEN ROUND(e.current_occupancy::numeric / e.max_capacity * 100)
          ELSE 0 END AS fill_rate
      FROM event e
      LEFT JOIN participation p ON p.event_id = e.id
      WHERE e.org_id = :orgId
      GROUP BY e.id, e.title, e.start_date, e.max_capacity, e.current_occupancy
      ORDER BY revenue DESC
      LIMIT 5
    `, { replacements: { orgId } });

    const [salesByDow] = await sequelize.query(`
      SELECT
        EXTRACT(DOW FROM p."createdAt")::int AS dow,
        COUNT(p.id)::int AS count
      FROM participation p
      JOIN event e ON p.event_id = e.id
      WHERE e.org_id = :orgId
        AND p.status NOT IN ('canceled','rejected')
        AND p."createdAt" >= NOW() - INTERVAL '90 days'
      GROUP BY EXTRACT(DOW FROM p."createdAt")
      ORDER BY dow ASC
    `, { replacements: { orgId } });

    const [[fillStats]] = await sequelize.query(`
      SELECT
        COALESCE(ROUND(AVG(
          CASE WHEN max_capacity > 0
            THEN current_occupancy::numeric / max_capacity * 100
            ELSE NULL END
        )), 0) AS avg_fill_rate
      FROM event
      WHERE org_id = :orgId AND moderation_status != 'hidden'
    `, { replacements: { orgId } });

    const [ticketBreakdown] = await sequelize.query(`
      SELECT
        tt.name,
        tt.price::numeric AS price,
        tt.quantity AS total,
        tt.sold_quantity AS sold,
        (tt.sold_quantity * tt.price)::numeric AS revenue
      FROM ticket_type tt
      JOIN event e ON tt.event_id = e.id
      WHERE e.org_id = :orgId AND tt.is_active = true
      ORDER BY revenue DESC
    `, { replacements: { orgId } });

    return res.json({
      monthlyRevenue,
      topEvents,
      salesByDow,
      avgFillRate: Number(fillStats?.avg_fill_rate || 0),
      ticketBreakdown
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getOrganizerParticipants = async (req, res) => {
  try {
    const accountId = req.user?.id;
    if (!accountId) {
      return res.status(401).json({ message: 'Neautorizat.' });
    }

    const organization = await getOrganizerOrganization(accountId);
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită.' });
    }

    const events = await Event.findAll({
      where: { org_id: organization.id },
      attributes: ['id', 'title', 'start_date', 'points_value', 'current_occupancy', 'max_capacity']
    });

    const eventIds = events.map((event) => event.id);
    const participations = eventIds.length > 0
      ? await Participation.findAll({
          where: { event_id: eventIds },
          include: [
            { model: Event, attributes: ['id', 'title', 'start_date', 'points_value', 'price'] },
            { model: Account, attributes: ['id', 'first_name', 'last_name', 'email'] }
          ],
          order: [['createdAt', 'DESC']]
        })
      : [];

    const participants = participations.map((participation) => {
      const event = participation.Event;
      const isCheckedIn = participation.status === 'checked-in';
      const points = isCheckedIn ? Number(event?.points_value || 0) : 0;

      return {
        id: participation.id,
        eventId: event?.id,
        participantId: participation.account_id || participation.id,
        name: participation.buyer_name || formatPersonName(participation.Account?.first_name, participation.Account?.last_name),
        email: participation.buyer_email || participation.Account?.email || '',
        eventTitle: event?.title || 'Eveniment',
        eventDate: event?.start_date || null,
        registeredAt: participation.createdAt,
        checkIn: isCheckedIn,
        status: participation.status,
        points,
        ticketPrice: Number(event?.price || 0)
      };
    });

    const grouped = {};
    participants.forEach((p) => {
      const key = `${p.participantId}||${p.eventId || p.eventTitle}`;
      if (!grouped[key]) {
        grouped[key] = { ...p, ticketCount: 0, points: 0 };
      }
      grouped[key].ticketCount += 1;
      grouped[key].points = (grouped[key].points || 0) + Number(p.points || 0);
      grouped[key].checkIn = grouped[key].checkIn || p.checkIn;
      if (new Date(p.registeredAt) > new Date(grouped[key].registeredAt)) {
        grouped[key].registeredAt = p.registeredAt;
      }
    });

    const aggregatedParticipants = Object.values(grouped);

    const uniqueParticipants = new Set(
      participants.map((item) => item.participantId || item.email || item.id)
    );
    const totalParticipants = uniqueParticipants.size;
    const checkIns = participants.filter((item) => item.checkIn).length;
    const pointsAwarded = participants.reduce((sum, item) => sum + Number(item.points || 0), 0);
    const generatedRevenue = participants.reduce((sum, item) => {
      if (['canceled', 'rejected'].includes(item.status)) return sum;
      return sum + Number(item.ticketPrice || 0);
    }, 0);

    const eventCounts = participants.reduce((acc, item) => {
      const key = item.eventTitle || 'Eveniment';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const topEventTitle = Object.entries(eventCounts)
      .sort((left, right) => right[1] - left[1])[0]?.[0] || '-';

    return res.json({
      stats: {
        totalParticipants,
        checkIns,
        pointsAwarded,
        generatedRevenue,
        topEventTitle
      },
      participants: aggregatedParticipants
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const toggleParticipantCheckIn = async (req, res) => {
  try {
    const accountId = req.user?.id;
    const { participationId } = req.params;

    if (!accountId) {
      return res.status(401).json({ message: 'Neautorizat.' });
    }

    const organization = await getOrganizerOrganization(accountId);
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită.' });
    }

    const participation = await Participation.findByPk(participationId, {
      include: [{ model: Event, attributes: ['id', 'org_id'] }]
    });

    if (!participation || !participation.Event || participation.Event.org_id !== organization.id) {
      return res.status(404).json({ message: 'Participarea nu a fost găsită.' });
    }

    const previousStatus = participation.status;
    const nextStatus = previousStatus === 'checked-in' ? 'going' : 'checked-in';

    await participation.update({ status: nextStatus });

    return res.json({ message: 'Status actualizat.', status: participation.status });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getOrganizerNotifications = (req, res) => {
  try {
    const accountId = req.user?.id;
    const notifications = getNotificationsForAccount(accountId);
    return res.json({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const markNotificationsRead = (req, res) => {
  try {
    const accountId = req.user?.id;
    markAllNotificationsRead(accountId);
    return res.json({ message: 'Notificările au fost marcate ca citite.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getOrganizerEvents = async (req, res) => {
  try {
    const accountId = req.user?.id;
    if (!accountId) return res.status(401).json({ message: 'Neautorizat.' });

    const organization = await getOrganizerOrganization(accountId);
    if (!organization) return res.status(404).json({ message: 'Organizația nu a fost găsită.' });

    const { Category, TicketType } = await import('../models/relationships.js');

    const events = await Event.findAll({
      where: { org_id: organization.id },
      include: [
        { model: Category, as: 'categories', through: { attributes: [] } },
        {
          model: TicketType,
          as: 'ticketTypes',
          attributes: ['id', 'name', 'description', 'price', 'quantity', 'sold_quantity', 'points_reward', 'display_order', 'is_active']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const data = events.map((event) => ({
      ...event.toJSON(),
      isFull: event.current_occupancy >= event.max_capacity,
      availableSlots: event.max_capacity - event.current_occupancy
    }));

    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updatePlan = async (req, res) => {
  try {
    const accountId = req.user?.id;
    const { plan } = req.body;

    if (!['gratuit', 'pro', 'business'].includes(plan)) {
      return res.status(400).json({ message: 'Plan invalid.' });
    }

    const organization = await getOrganizerOrganization(accountId);
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită.' });
    }

    setOrgPlan(organization.id, plan);
    return res.json({ message: 'Planul a fost actualizat.', plan });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createPlanCheckoutSession = async (req, res) => {
  try {
    const accountId = req.user?.id;
    const { plan } = req.body;

    if (!['pro', 'business'].includes(plan)) {
      return res.status(400).json({ message: 'Doar planurile plătite necesită checkout Stripe.' });
    }

    if (!stripe) {
      return res.status(500).json({ message: 'Stripe nu este configurat. Setează STRIPE_SECRET_KEY în backend.' });
    }

    const organization = await getOrganizerOrganization(accountId);
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită.' });
    }

    const successUrl = `${FRONTEND_URL}/organizer/billing?payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${FRONTEND_URL}/organizer/billing?payment=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'ron',
          unit_amount: PLAN_PRICES[plan] * 100,
          product_data: {
            name: `EventHub ${PLAN_NAMES[plan]} — Abonament lunar`,
            description: `Abonament lunar plan ${PLAN_NAMES[plan]} pentru organizația ${organization.name}`
          }
        }
      }],
      metadata: {
        org_id: String(organization.id),
        account_id: String(accountId),
        plan
      }
    });

    return res.status(201).json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const confirmPlanCheckoutSession = async (req, res) => {
  try {
    const accountId = req.user?.id;
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ message: 'session_id este obligatoriu.' });
    }

    if (!stripe) {
      return res.status(500).json({ message: 'Stripe nu este configurat.' });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ message: 'Plata nu este confirmată.' });
    }

    const { plan, org_id, account_id } = session.metadata || {};

    if (!plan || !org_id) {
      return res.status(400).json({ message: 'Sesiune Stripe invalidă.' });
    }

    if (String(account_id) !== String(accountId)) {
      return res.status(403).json({ message: 'Sesiune Stripe nu aparține contului curent.' });
    }

    setOrgPlan(org_id, plan);
    return res.json({ message: 'Planul a fost activat cu succes.', plan });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
