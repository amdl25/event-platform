import { Op } from 'sequelize';
import {
  Account,
  Organization,
  Event,
  Participation,
  Category,
  LoyaltyWallet,
  LoyaltyTransaction
} from '../models/relationships.js';
import {
  addAuditLogEntry,
  getAuditLogs,
  getPlatformSettings,
  updatePlatformSetting,
  setPlatformSettings
} from '../utils/fileStorage.js';

const DEFAULT_SETTINGS = {
  base_points_per_checkin: '10',
  points_expiry_months: '12',
  featured_events_limit: '6',
  max_pending_days: '3'
};

const createAuditEntry = async ({ actor, action, entityType, entityId = null, details = {} }) => {
  addAuditLogEntry({
    actor_id: actor?.id || null,
    actor_role: actor?.role || null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details
  });
};

const ensureSettings = async () => {
  let settings = getPlatformSettings();
  const map = new Map(Object.entries(settings || {}));
  const missing = Object.entries(DEFAULT_SETTINGS).filter(([key]) => !map.has(key));

  if (missing.length > 0 || !settings || Object.keys(settings).length === 0) {
    settings = { ...DEFAULT_SETTINGS, ...settings };
    setPlatformSettings(settings);
  }

  return settings;
};

const toRomanianMonthLabel = (date) => {
  const month = date.toLocaleDateString('ro-RO', { month: 'short', day: 'numeric' });
  return month.replace('.', '');
};

export const getDashboardSummary = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 29);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const previousWeekStart = new Date(now);
    previousWeekStart.setDate(now.getDate() - 13);
    previousWeekStart.setHours(0, 0, 0, 0);

    const previousWeekEnd = new Date(weekStart);
    previousWeekEnd.setDate(weekStart.getDate() - 1);
    previousWeekEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(monthStart);
    previousMonthEnd.setMilliseconds(-1);

    const [accounts, organizations, events, participations, categories, wallets, transactions] = await Promise.all([
      Account.findAll({ attributes: ['id', 'createdAt', 'role', 'first_name', 'last_name'] }),
      Organization.findAll({
        include: [{ model: Account, as: 'owner', attributes: ['id', 'email', 'first_name', 'last_name'] }],
        order: [['updatedAt', 'DESC']]
      }),
      Event.findAll({
        include: [
          { model: Organization, as: 'organization', attributes: ['id', 'name', 'verification_status'] },
          { model: Category, as: 'categories', through: { attributes: [] } },
          { model: Participation, attributes: ['id', 'createdAt', 'status', 'invite_status'] }
        ],
        order: [['createdAt', 'DESC']]
      }),
      Participation.findAll({ attributes: ['id', 'createdAt', 'event_id', 'account_id', 'status', 'invite_status'] }),
      Category.findAll({ attributes: ['id', 'name'] }),
      LoyaltyWallet.findAll({ include: [{ model: Account, as: 'account', attributes: ['id', 'first_name', 'last_name', 'email'] }] }),
      LoyaltyTransaction.findAll({
        attributes: ['id', 'wallet_id', 'event_id', 'points_amount', 'type', 'createdAt'],
        include: [
          {
            model: LoyaltyWallet,
            as: 'wallet',
            include: [
              { model: Account, as: 'account', attributes: ['id', 'first_name', 'last_name', 'email'] },
              { model: Organization, as: 'organization', attributes: ['id', 'name'] }
            ]
          },
          { model: Event, as: 'event', attributes: ['id', 'title'] }
        ]
      })
    ]);
    const auditLogs = getAuditLogs(12);

    const userAccounts = accounts.filter((account) => account.role === 'user');
    const organizerAccounts = accounts.filter((account) => account.role === 'organizer');

    const newUsersThisWeek = userAccounts.filter((account) => new Date(account.createdAt) >= weekStart).length;
    const newUsersPreviousWeek = userAccounts.filter((account) => {
      const createdAt = new Date(account.createdAt);
      return createdAt >= previousWeekStart && createdAt <= previousWeekEnd;
    }).length;

    const newUsersThisMonth = userAccounts.filter((account) => new Date(account.createdAt) >= monthStart).length;
    const newUsersPreviousMonth = userAccounts.filter((account) => {
      const createdAt = new Date(account.createdAt);
      return createdAt >= previousMonthStart && createdAt <= previousMonthEnd;
    }).length;

    const organizersThisMonth = organizerAccounts.filter((account) => new Date(account.createdAt) >= monthStart).length;
    const organizersPreviousMonth = organizerAccounts.filter((account) => {
      const createdAt = new Date(account.createdAt);
      return createdAt >= previousMonthStart && createdAt <= previousMonthEnd;
    }).length;

    const activeOrganizers = organizations.filter((org) => org.verification_status === 'verified' && org.admin_status === 'active').length;
    const pendingRequests = organizations.filter((org) => org.verification_status === 'pending').length;

    const publicEvents = events.filter((event) => event.org_id !== null);
    
    const totalEvents = publicEvents.length;
    const activeEvents = publicEvents.filter((event) => event.moderation_status !== 'hidden').length;
    const activeEventsThisMonth = publicEvents.filter((event) => {
      const createdAt = new Date(event.createdAt);
      return event.moderation_status !== 'hidden' && createdAt >= monthStart;
    }).length;
    const activeEventsPreviousMonth = publicEvents.filter((event) => {
      const createdAt = new Date(event.createdAt);
      return event.moderation_status !== 'hidden' && createdAt >= previousMonthStart && createdAt <= previousMonthEnd;
    }).length;
    const blockedEvents = publicEvents.filter((event) => event.moderation_status === 'reported').length;
    const totalCapacity = publicEvents.reduce((sum, event) => sum + Number(event.max_capacity || 0), 0);
    const totalOccupancy = publicEvents.reduce((sum, event) => sum + Number(event.current_occupancy || 0), 0);
    const averageOccupancy = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;

    const latestRegistrationsByDay = [];
    const latestEventsByDay = [];
    for (let index = 29; index >= 0; index -= 1) {
      const day = new Date(now);
      day.setDate(now.getDate() - index);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      const dayCount = participations.filter((item) => {
        const createdAt = new Date(item.createdAt);
        return createdAt >= day && createdAt < nextDay;
      }).length;
      const dayEventCount = publicEvents.filter((item) => {
        const createdAt = new Date(item.createdAt);
        return createdAt >= day && createdAt < nextDay;
      }).length;

      latestRegistrationsByDay.push({
        key: day.toISOString().slice(0, 10),
        label: toRomanianMonthLabel(day),
        value: dayCount
      });

      latestEventsByDay.push({
        key: day.toISOString().slice(0, 10),
        label: toRomanianMonthLabel(day),
        value: dayEventCount
      });
    }

    const categoryCounts = categories.map((category) => {
      const count = publicEvents.reduce((sum, event) => {
        const hasCategory = (event.categories || []).some((item) => item.id === category.id);
        return sum + (hasCategory ? 1 : 0);
      }, 0);

      return {
        id: category.id,
        name: category.name,
        value: count,
        percent: totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0
      };
    }).sort((left, right) => right.value - left.value);

    const topEvents = [...publicEvents]
      .sort((left, right) => Number(right.current_occupancy || 0) - Number(left.current_occupancy || 0))
      .slice(0, 5)
      .map((event, index) => ({
        rank: index + 1,
        id: event.id,
        title: event.title,
        host: event.organization?.name || `${event.creator?.first_name || ''} ${event.creator?.last_name || ''}`.trim() || 'Organizator',
        occupancy: Number(event.current_occupancy || 0),
        capacity: Number(event.max_capacity || 0),
        status: event.moderation_status,
        categories: (event.categories || []).map((category) => category.name)
      }));

    const walletTotals = wallets
      .map((wallet) => Number(wallet.points_balance || 0))
      .reduce((sum, value) => sum + value, 0);

    const topParticipants = [...wallets]
      .sort((left, right) => Number(right.points_balance || 0) - Number(left.points_balance || 0))
      .slice(0, 5)
      .map((wallet, index) => ({
        rank: index + 1,
        id: wallet.account?.id || wallet.account_id,
        name: wallet.account ? `${wallet.account.first_name} ${wallet.account.last_name}` : 'Utilizator',
        email: wallet.account?.email || '',
        points: Number(wallet.points_balance || 0)
      }));

    const recentActivity = auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      actor: log.actor ? `${log.actor.first_name} ${log.actor.last_name}` : 'System',
      createdAt: log.createdAt,
      details: log.details || {}
    }));

    const notifications = organizations
      .filter((org) => org.verification_status === 'pending')
      .map((org) => ({
        id: `org-${org.id}`,
        type: 'organization',
        title: 'Cerere nouă de firmă',
        message: `${org.name} așteaptă aprobare`,
        createdAt: org.updatedAt
      }))
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

    const settings = await ensureSettings();

    const registrationDelta = newUsersPreviousWeek > 0
      ? Math.round(((newUsersThisWeek - newUsersPreviousWeek) / newUsersPreviousWeek) * 100)
      : newUsersThisWeek > 0 ? 100 : 0;

    const monthDelta = newUsersPreviousMonth > 0
      ? Math.round(((newUsersThisMonth - newUsersPreviousMonth) / newUsersPreviousMonth) * 100)
      : newUsersThisMonth > 0 ? 100 : 0;

    const pendingRequestsThisMonth = organizations.filter((org) => {
      const createdAt = new Date(org.createdAt);
      return org.verification_status === 'pending' && createdAt >= monthStart;
    }).length;
    const pendingRequestsPreviousMonth = organizations.filter((org) => {
      const createdAt = new Date(org.createdAt);
      return org.verification_status === 'pending' && createdAt >= previousMonthStart && createdAt <= previousMonthEnd;
    }).length;

    const usersDeltaCount = newUsersThisMonth - newUsersPreviousMonth;
    const organizersDeltaCount = organizersThisMonth - organizersPreviousMonth;
    const activeEventsDeltaCount = activeEventsThisMonth - activeEventsPreviousMonth;
    const pendingRequestsDeltaCount = pendingRequestsThisMonth - pendingRequestsPreviousMonth;

    return res.json({
      stats: {
        users: userAccounts.length,
        organizers: organizerAccounts.length,
        activeOrganizers,
        activeEvents,
        totalEvents,
        pendingRequests,
        averageOccupancy,
        blockedEvents,
        notificationsCount: notifications.length,
        newUsersThisWeek,
        newUsersThisMonth,
        registrationDelta,
        monthDelta,
        usersDeltaCount,
        organizersDeltaCount,
        activeEventsDeltaCount,
        pendingRequestsDeltaCount
      },
      charts: {
        registrations: latestRegistrationsByDay,
        eventsCreated: latestEventsByDay,
        categories: categoryCounts
      },
      topEvents,
      topParticipants,
      recentActivity,
      notifications,
      settings,
      categories: categories.map((category) => ({ id: category.id, name: category.name })),
      walletsTotal: walletTotals,
      totals: {
        users: userAccounts.length,
        organizers: organizerAccounts.length,
        events: totalEvents,
        participations: participations.length,
        transactions: transactions.length
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getOrganizationsAdmin = async (req, res) => {
  try {
    const organizations = await Organization.findAll({
      include: [{ model: Account, as: 'owner', attributes: ['id', 'email', 'first_name', 'last_name'] }],
      order: [['updatedAt', 'DESC']]
    });

    const events = await Event.findAll({ attributes: ['id', 'org_id', 'current_occupancy', 'max_capacity'] });
    const participationCounts = await Participation.findAll({ attributes: ['id', 'event_id'] });

    const payload = organizations.map((organization) => {
      const orgEvents = events.filter((event) => event.org_id === organization.id);
      const orgOccupancy = orgEvents.reduce((sum, event) => sum + Number(event.current_occupancy || 0), 0);
      const orgCapacity = orgEvents.reduce((sum, event) => sum + Number(event.max_capacity || 0), 0);
      const attendanceRate = orgCapacity > 0 ? Math.round((orgOccupancy / orgCapacity) * 100) : 0;

      return {
        id: organization.id,
        name: organization.name,
        description: organization.description,
        businessIdentifier: organization.business_identifier,
        registeredAddress: organization.registered_address,
        officialPhone: organization.official_phone,
        verificationStatus: organization.verification_status,
        adminStatus: organization.admin_status,
        verificationNotes: organization.verification_notes,
        verifiedAt: organization.verified_at,
        requestedAt: organization.updatedAt,
        owner: organization.owner ? {
          id: organization.owner.id,
          name: `${organization.owner.first_name} ${organization.owner.last_name}`.trim(),
          email: organization.owner.email
        } : null,
        totalEvents: orgEvents.length,
        totalParticipants: orgOccupancy,
        totalParticipationRecords: participationCounts.filter((item) => orgEvents.some((event) => event.id === item.event_id)).length,
        attendanceRate
      };
    });

    return res.json({ organizations: payload });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateOrganizationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminStatus } = req.body;

    if (!['active', 'suspended'].includes(adminStatus)) {
      return res.status(400).json({ message: 'Status invalid.' });
    }

    const organization = await Organization.findByPk(id);
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită.' });
    }

    await organization.update({ admin_status: adminStatus });
    await createAuditEntry({
      actor: req.user,
      action: adminStatus === 'active' ? 'organization_activated' : 'organization_suspended',
      entityType: 'organization',
      entityId: organization.id,
      details: { name: organization.name, adminStatus }
    });

    return res.json({
      message: 'Status actualizat.',
      id: organization.id,
      adminStatus: organization.admin_status
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getParticipantsAdmin = async (req, res) => {
  try {
    const accounts = await Account.findAll({
      where: { role: 'user' },
      include: [
        { model: Participation, attributes: ['id', 'createdAt', 'status', 'invite_status', 'event_id'] },
        { model: LoyaltyWallet, as: 'wallets', include: [{ model: Account, as: 'account', attributes: ['id', 'first_name', 'last_name', 'email'] }], attributes: ['id', 'account_id', 'org_id', 'points_balance'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const payload = accounts.map((account) => {
      const participations = account.Participations || [];
      const wallets = account.wallets || [];
      const points = wallets.reduce((sum, wallet) => sum + Number(wallet.points_balance || 0), 0);
      const lastActivity = participations.length > 0
        ? participations.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))[0].createdAt
        : account.createdAt;
      const active = new Date(lastActivity) >= new Date(Date.now() - 1000 * 60 * 60 * 24 * 90);

      return {
        id: account.id,
        name: `${account.first_name} ${account.last_name}`.trim(),
        email: account.email,
        joinedAt: account.createdAt,
        lastActivity,
        status: active ? 'active' : 'inactive',
        points,
        totalEvents: participations.length,
        futureEvents: participations.filter((item) => item.status === 'going').length,
        activityScore: participations.length + points,
        wallets: wallets.map((wallet) => ({
          orgId: wallet.org_id,
          points: Number(wallet.points_balance || 0)
        }))
      };
    });

    return res.json({ participants: payload });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getEventsAdmin = async (req, res) => {
  try {
    const events = await Event.findAll({
      where: { org_id: { [Op.ne]: null }, moderation_status: { [Op.ne]: 'hidden' } },
      include: [
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'verification_status', 'admin_status'] },
        { model: Account, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: Category, as: 'categories', through: { attributes: [] } },
        { model: Participation, attributes: ['id', 'createdAt', 'status', 'invite_status'] }
      ],
      order: [['start_date', 'ASC']]
    });

    const payload = events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      startDate: event.start_date,
      endDate: event.end_date,
      maxCapacity: Number(event.max_capacity || 0),
      currentOccupancy: Number(event.current_occupancy || 0),
      occupancyRate: Number(event.max_capacity || 0) > 0 ? Math.round((Number(event.current_occupancy || 0) / Number(event.max_capacity || 0)) * 100) : 0,
      price: Number(event.price || 0),
      pointsValue: Number(event.points_value || 0),
      imageUrl: event.image_url,
      moderationStatus: event.moderation_status,
      moderationNote: event.moderation_note,
      createdAt: event.createdAt,
      creator: event.creator ? {
        id: event.creator.id,
        name: `${event.creator.first_name} ${event.creator.last_name}`.trim(),
        email: event.creator.email
      } : null,
      organization: event.organization ? {
        id: event.organization.id,
        name: event.organization.name,
        verificationStatus: event.organization.verification_status,
        adminStatus: event.organization.admin_status
      } : null,
      categories: (event.categories || []).map((category) => category.name),
      participants: (event.Participations || []).length
    }));

    return res.json({ events: payload });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const moderateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { moderationStatus, moderationNote } = req.body;

    if (!['published', 'reported'].includes(moderationStatus)) {
      return res.status(400).json({ message: 'Status invalid.' });
    }

    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ message: 'Evenimentul nu a fost găsit.' });
    }

    await event.update({
      moderation_status: moderationStatus,
      moderation_note: moderationNote?.trim() || null,
    });

    await createAuditEntry({
      actor: req.user,
      action: `event_${moderationStatus}`,
      entityType: 'event',
      entityId: event.id,
      details: { title: event.title, moderationStatus, moderationNote }
    });

    return res.json({
      message: 'Eveniment actualizat.',
      id: event.id,
      moderationStatus: event.moderation_status,
      moderationNote: event.moderation_note
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


export const getSettingsAdmin = async (req, res) => {
  try {
    const [settings, categories] = await Promise.all([
      ensureSettings(),
      Category.findAll({ order: [['name', 'ASC']] })
    ]);

    return res.json({
      settings,
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateSettingsAdmin = async (req, res) => {
  try {
    const incomingSettings = req.body?.settings || {};
    const entries = Object.entries(incomingSettings).filter(([, value]) => value !== undefined && value !== null);

    if (entries.length === 0) {
      return res.status(400).json({ message: 'Nu au fost transmise setări.' });
    }

    for (const [key, value] of entries) {
      updatePlatformSetting(key, String(value));
    }

    await createAuditEntry({
      actor: req.user,
      action: 'settings_updated',
      entityType: 'platform_setting',
      entityId: 'global',
      details: incomingSettings
    });

    const settings = await ensureSettings();
    return res.json({ message: 'Setările au fost salvate.', settings });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createCategoryAdmin = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: 'Numele categoriei este obligatoriu.' });
    }

    const category = await Category.create({ name: name.trim() });
    await createAuditEntry({
      actor: req.user,
      action: 'category_created',
      entityType: 'category',
      entityId: category.id,
      details: { name: category.name }
    });

    return res.status(201).json({ id: category.id, name: category.name });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateCategoryAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Numele categoriei este obligatoriu.' });
    }

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ message: 'Categoria nu a fost găsită.' });
    }

    await category.update({ name: name.trim() });
    await createAuditEntry({
      actor: req.user,
      action: 'category_updated',
      entityType: 'category',
      entityId: category.id,
      details: { name: category.name }
    });

    return res.json({ id: category.id, name: category.name });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteCategoryAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ message: 'Categoria nu a fost găsită.' });
    }

    await category.destroy();
    await createAuditEntry({
      actor: req.user,
      action: 'category_deleted',
      entityType: 'category',
      entityId: id,
      details: { name: category.name }
    });

    return res.json({ message: 'Categoria a fost ștearsă.', id });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAuditLogAdmin = async (req, res) => {
  try {
    const logs = getAuditLogs(50);

    return res.json({
      auditLog: logs.map((log) => ({
        id: log.id,
        action: log.action,
        actor: log.actor_id ? `${log.actor?.first_name || ''} ${log.actor?.last_name || ''}`.trim() : 'System',
        actorEmail: log.actor?.email || '',
        entityType: log.entity_type,
        entityId: log.entity_id,
        createdAt: log.createdAt,
        details: log.details || {}
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
