import { Account, Category, Event, LoyaltyTransaction, LoyaltyWallet, Organization } from '../models/relationships.js';
import { Op } from 'sequelize';

const hasAccountColumn = (columnName) => Boolean(Account.rawAttributes?.[columnName]);

export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    if (!requesterId) {
      return res.status(401).json({ message: 'Neautorizat' });
    }

    if (requesterRole !== 'admin' && requesterId !== id) {
      return res.status(403).json({ message: 'Nu ai acces la acest profil.' });
    }

    const user = await Account.findByPk(id, {
      attributes: ['id', 'email', 'first_name', 'last_name', 'role'],
      include: [
        {
          model: Category,
          as: 'interests',
          through: { attributes: [] } 
        }
      ]
    });

    if (!user) return res.status(404).json({ message: "User negăsit" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const setInterests = async (req, res) => {
  try {
    const { interests } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Neautorizat' });
    }

    const user = await Account.findByPk(userId);
    if (!user) return res.status(404).json({ message: "Utilizator negăsit" });

    await user.setInterests(interests);
    res.status(200).json({ message: "Interese salvate!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyLoyaltySummary = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Neautorizat' });
    }

    const [wallets, transactions] = await Promise.all([
      LoyaltyWallet.findAll({
        where: { account_id: userId },
        include: [{ model: Organization, attributes: ['id', 'name'] }]
      }),
      LoyaltyTransaction.findAll({
        where: { account_id: userId },
        order: [['createdAt', 'DESC']],
        limit: 20,
        include: [
          { model: Organization, attributes: ['id', 'name'] },
          { model: Event, attributes: ['id', 'title'] }
        ]
      })
    ]);

    const companies = wallets.map((wallet) => ({
      orgId: wallet.org_id,
      name: wallet.Organization?.name || 'Organizator',
      points: Number(wallet.points_balance || 0)
    }));

    const totalPoints = companies.reduce((sum, item) => sum + Number(item.points || 0), 0);

    return res.json({
      totalPoints,
      companies,
      transactions: transactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        points: Number(transaction.points_amount || 0),
        orgName: transaction.Organization?.name || 'Organizator',
        eventTitle: transaction.Event?.title || 'Eveniment',
        createdAt: transaction.createdAt
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Neautorizat' });
    }

    const account = await Account.findByPk(userId);
    if (!account) {
      return res.status(404).json({ message: 'Utilizator negăsit' });
    }

    const nextFirstName = String(req.body?.firstName || '').trim();
    const nextLastName = String(req.body?.lastName || '').trim();
    const nextEmail = String(req.body?.email || '').trim().toLowerCase();
    const nextPhone = String(req.body?.phone || '').trim();
    const nextCity = String(req.body?.city || '').trim();

    if (!nextFirstName || !nextLastName || !nextEmail) {
      return res.status(400).json({ message: 'Prenumele, numele și email-ul sunt obligatorii.' });
    }

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail);
    if (!emailValid) {
      return res.status(400).json({ message: 'Email invalid.' });
    }

    const duplicateEmail = await Account.findOne({
      where: {
        email: nextEmail,
        id: { [Op.ne]: userId }
      }
    });

    if (duplicateEmail) {
      return res.status(409).json({ message: 'Există deja un cont cu acest email.' });
    }

    const updatePayload = {
      first_name: nextFirstName,
      last_name: nextLastName,
      email: nextEmail
    };

    if (nextPhone) {
      if (hasAccountColumn('phone')) updatePayload.phone = nextPhone;
      if (hasAccountColumn('phone_number')) updatePayload.phone_number = nextPhone;
    }

    if (nextCity) {
      if (hasAccountColumn('city')) updatePayload.city = nextCity;
      if (hasAccountColumn('location')) updatePayload.location = nextCity;
    }

    await account.update(updatePayload);

    const cityValue = hasAccountColumn('city')
      ? account.city
      : (hasAccountColumn('location') ? account.location : null);
    const phoneValue = hasAccountColumn('phone')
      ? account.phone
      : (hasAccountColumn('phone_number') ? account.phone_number : null);

    return res.status(200).json({
      message: 'Profil actualizat cu succes.',
      profile: {
        id: account.id,
        firstName: account.first_name,
        lastName: account.last_name,
        email: account.email,
        city: cityValue,
        phone: phoneValue
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};