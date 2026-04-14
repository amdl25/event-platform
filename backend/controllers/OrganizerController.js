import { Account, Event, Organization, Participation } from '../models/relationships.js';

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
      if (item.status !== 'checked-in') return sum;
      return sum + Number(item.event?.pointsValue || 0);
    }, 0);
    const activeEvents = eventCards.filter((item) => item.status.label !== 'Încheiat').length;
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
      participants
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

    const nextStatus = participation.status === 'checked-in' ? 'going' : 'checked-in';
    await participation.update({ status: nextStatus });

    const awardedPoints = nextStatus === 'checked-in' ? Number(participation.Event?.points_value || 0) : 0;

    return res.json({
      message: 'Status actualizat.',
      status: participation.status,
      points: awardedPoints
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
