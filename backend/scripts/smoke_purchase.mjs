import sequelize from '../config/database.js';
import { Account, Organization, Event, LoyaltyWallet, LoyaltyTransaction, Participation } from '../models/relationships.js';

async function run() {
  console.log('Starting smoke purchase test');
  try {
    await sequelize.authenticate();

    const [account] = await Account.findOrCreate({ where: { email: 'smoke@test' }, defaults: { first_name: 'Smoke', last_name: 'Tester', role: 'user', password_hash: 'smokehash' } });

    const [org] = await Organization.findOrCreate({ where: { name: 'Smoke Org' }, defaults: { owner_id: account.id } });

    const event = await Event.create({
      title: 'Smoke Test Event',
      start_date: new Date(Date.now() + 3600 * 1000),
      end_date: new Date(Date.now() + 7200 * 1000),
      max_capacity: 100,
      price: 0,
      points_value: 10,
      org_id: org.id,
      creator_id: null
    });

    console.log('Created event', event.id);

    const quantity = 1;
    const pointsEarned = Number(event.points_value || 0) * quantity;

    await sequelize.transaction(async (t) => {
      const [wallet] = await LoyaltyWallet.findOrCreate({ where: { account_id: account.id, org_id: org.id }, defaults: { points_balance: 0 }, transaction: t });

      await wallet.increment('points_balance', { by: pointsEarned, transaction: t });

      await LoyaltyTransaction.create({ wallet_id: wallet.id, event_id: event.id, points_amount: pointsEarned, type: 'earn' }, { transaction: t });

      for (let i = 0; i < quantity; i++) {
        await Participation.create({ account_id: account.id, event_id: event.id, buyer_name: account.first_name, buyer_email: account.email, ticket_qr: 'SMOKE-QRCODE-' + Date.now(), payment_session_id: `SMOKE-${Date.now()}` }, { transaction: t });
      }
    });

    const wallets = await LoyaltyWallet.findAll({ where: { account_id: account.id } });
    const txs = await LoyaltyTransaction.findAll({ where: { event_id: event.id } });

    console.log('Wallets for account:', wallets.map(w => ({ id: w.id, org_id: w.org_id, points_balance: w.points_balance })));
    console.log('Transactions for event:', txs.map(tx => ({ id: tx.id, wallet_id: tx.wallet_id, points: tx.points_amount, type: tx.type })));

    console.log('Smoke purchase test completed successfully');
  } catch (err) {
    console.error('Smoke test failed:', err.message || err);
    process.exitCode = 2;
  } finally {
    await sequelize.close();
  }
}

run();
