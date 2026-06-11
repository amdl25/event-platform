import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import sequelize from './config/database.js';

import './models/relationships.js';
import eventRoutes from './routes/eventRoutes.js';
import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import organizerRoutes from './routes/organizerRoutes.js';

const serializeErrorMessage = (error) => {
  if (!error) return 'Eroare necunoscută.';
  if (typeof error === 'string') return error;
  if (error instanceof Error && typeof error.message === 'string') return error.message;
  if (typeof error.message === 'string') return error.message;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/events', eventRoutes);
app.use('/auth', authRoutes);
app.use('/categories', categoryRoutes);
app.use('/users', userRoutes);
app.use('/admin', adminRoutes);
app.use('/organizer', organizerRoutes);


app.use((error, req, res, next) => {
  console.error('Unhandled backend error:', error);
  if (res.headersSent) return next(error);
  return res.status(error?.status || 500).json({ message: serializeErrorMessage(error) });
});

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conectare reusita la baza de date');

  

    
    const [walletIdExists] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'loyalty_wallet' AND column_name = 'id' LIMIT 1;
    `);

    if (walletIdExists.length === 0) {
      console.log('Adding id column to loyalty_wallet');
      await sequelize.query(`ALTER TABLE loyalty_wallet ADD COLUMN id UUID DEFAULT gen_random_uuid();`);
      
      const [nullRows] = await sequelize.query(`SELECT account_id, org_id FROM loyalty_wallet WHERE id IS NULL;`);
      for (const row of nullRows) {
        await sequelize.query(
          `UPDATE loyalty_wallet SET id = gen_random_uuid() WHERE account_id = :account_id AND org_id = :org_id`,
          { replacements: { account_id: row.account_id, org_id: row.org_id } }
        );
      }
    }

    const [[pkDef]] = await sequelize.query(`
      SELECT conname FROM pg_constraint 
      WHERE conrelid = 'loyalty_wallet'::regclass AND contype = 'p';
    `);

    if (!pkDef || !pkDef.conname.includes('id')) {
      console.log('Setting id as primary key on loyalty_wallet');
      if (pkDef?.conname) {
        await sequelize.query(`ALTER TABLE loyalty_wallet DROP CONSTRAINT ${pkDef.conname} CASCADE;`);
      }
      await sequelize.query(`ALTER TABLE loyalty_wallet ALTER COLUMN id SET NOT NULL;`);
      await sequelize.query(`ALTER TABLE loyalty_wallet ADD PRIMARY KEY (id);`);
    }

    await sequelize.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename='loyalty_wallet' AND indexname='loyalty_wallet_account_org_unique'
      ) THEN
        CREATE UNIQUE INDEX loyalty_wallet_account_org_unique ON loyalty_wallet(account_id, org_id);
      END IF;
    END $$;`);

    await sequelize.sync(); 
    console.log('Tabelele au fost create sau actualizate');

    await sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'participation_account_id_event_id_key'
        ) THEN
          ALTER TABLE participation DROP CONSTRAINT participation_account_id_event_id_key;
        END IF;
      END $$;
    `);
    console.log('Constraint-ul unic participation_account_id_event_id_key a fost verificat/eliminat');

    await sequelize.query(`ALTER TABLE event ALTER COLUMN creator_id DROP NOT NULL;`);
    await sequelize.query(`UPDATE event SET creator_id = NULL WHERE org_id IS NOT NULL;`);

    const [txColumns] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'loyalty_transaction' AND column_name IN ('account_id', 'org_id');
    `);
    const hasLegacy = txColumns.length === 2;

    await sequelize.query(`ALTER TABLE loyalty_transaction ADD COLUMN IF NOT EXISTS wallet_id UUID;`);

    const [[{ nullCount }]] = await sequelize.query(`
      SELECT COUNT(*)::int AS nullCount FROM loyalty_transaction WHERE wallet_id IS NULL;
    `);

    if (nullCount === 0) {
      await sequelize.query(`ALTER TABLE loyalty_transaction ALTER COLUMN wallet_id SET NOT NULL;`);
      await sequelize.query(`ALTER TABLE loyalty_transaction DROP CONSTRAINT IF EXISTS loyalty_transaction_wallet_id_fkey;`);
      await sequelize.query(`ALTER TABLE loyalty_transaction ADD CONSTRAINT loyalty_transaction_wallet_id_fkey 
        FOREIGN KEY (wallet_id) REFERENCES loyalty_wallet(id) ON DELETE RESTRICT ON UPDATE CASCADE;`);
    } else {
      console.log(`Warning: ${nullCount} loyalty_transaction rows still have NULL wallet_id`);
    }

    if (hasLegacy) {
      await sequelize.query(`ALTER TABLE loyalty_transaction DROP COLUMN IF EXISTS account_id CASCADE;`);
      await sequelize.query(`ALTER TABLE loyalty_transaction DROP COLUMN IF EXISTS org_id CASCADE;`);
    }

    await sequelize.query(`ALTER TABLE loyalty_transaction DROP CONSTRAINT IF EXISTS loyalty_transaction_event_id_fkey;`);
    await sequelize.query(`ALTER TABLE loyalty_transaction ADD CONSTRAINT loyalty_transaction_event_id_fkey 
      FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE SET NULL ON UPDATE CASCADE;`);

    console.log('Schema relatională a fost normalizată pentru loyalty_wallet și loyalty_transaction');

    app.listen(PORT, () => {
      console.log(`Serverul ruleaza pe port ${PORT}`);
    });
  } catch (error) {
    console.error('Eroare la conectare:', error);
  }
};

startServer();
