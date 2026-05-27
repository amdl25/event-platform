import dotenv from 'dotenv';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import '../models/relationships.js';
import { Event, LoyaltyTransaction, LoyaltyWallet, Participation } from '../models/relationships.js';

dotenv.config();

const toPositiveInteger = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
};

const parseCutoff = () => {
  const value = process.env.BACKFILL_BEFORE;
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('BACKFILL_BEFORE trebuie sa fie o data valida ISO (ex: 2026-04-14T00:00:00Z).');
  }

  return parsed;
};

const run = async () => {
  const cutoff = parseCutoff();

  await sequelize.authenticate();

  const where = {
    account_id: { [Op.ne]: null },
    status: { [Op.notIn]: ['canceled', 'rejected'] }
  };

  if (cutoff) {
    where.createdAt = { [Op.lt]: cutoff };
  }

  const participations = await Participation.findAll({
    where,
    include: [
      {
        model: Event,
        required: true,
        attributes: ['id', 'org_id', 'points_value'],
        where: {
          org_id: { [Op.ne]: null },
          points_value: { [Op.gt]: 0 }
        }
      }
    ],
    order: [['createdAt', 'ASC']]
  });

  let scanned = 0;
  let insertedTransactions = 0;
  let updatedWallets = 0;
  let skippedExisting = 0;

  for (const participation of participations) {
    scanned += 1;

    const accountId = participation.account_id;
    const event = participation.Event;
    const orgId = event?.org_id;
    const eventId = event?.id;
    const points = toPositiveInteger(event?.points_value, 0);

    if (!accountId || !orgId || !eventId || points <= 0) {
      continue;
    }

    await sequelize.transaction(async (transaction) => {
      const [wallet] = await LoyaltyWallet.findOrCreate({
        where: {
          account_id: accountId,
          org_id: orgId
        },
        defaults: {
          account_id: accountId,
          org_id: orgId,
          points_balance: 0
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      const existingTransaction = await LoyaltyTransaction.findOne({
        where: {
          wallet_id: wallet.id,
          event_id: eventId,
          type: 'earn',
          points_amount: points,
          createdAt: participation.createdAt
        },
        transaction
      });

      if (existingTransaction) {
        skippedExisting += 1;
        return;
      }

      await wallet.increment('points_balance', { by: points, transaction });
      updatedWallets += 1;

      await LoyaltyTransaction.create({
        wallet_id: wallet.id,
        event_id: eventId,
        points_amount: points,
        type: 'earn',
        createdAt: participation.createdAt,
        updatedAt: participation.createdAt
      }, { transaction });

      insertedTransactions += 1;
    });
  }

  console.log('Backfill loyalty finalizat.');
  console.log(`- participari scanate: ${scanned}`);
  console.log(`- tranzactii earn inserate: ${insertedTransactions}`);
  console.log(`- wallet-uri actualizate: ${updatedWallets}`);
  console.log(`- tranzactii deja existente (sarit): ${skippedExisting}`);
  if (cutoff) {
    console.log(`- cutoff folosit (BACKFILL_BEFORE): ${cutoff.toISOString()}`);
  }
};

run()
  .catch((error) => {
    console.error('Eroare backfill loyalty:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
