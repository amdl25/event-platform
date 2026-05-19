import express from 'express';
import cors from 'cors';
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
console.log("Rutele de Auth sunt încărcate la /auth");
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

    await sequelize.sync({ alter: true }); 
    console.log('Tabelele au fost create sau actualizate');

    await sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'participation_account_id_event_id_key'
        ) THEN
          ALTER TABLE participation
          DROP CONSTRAINT participation_account_id_event_id_key;
        END IF;
      END $$;
    `);
    console.log('Constraint-ul unic participation_account_id_event_id_key a fost verificat/eliminat');

    await sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'loyalty_wallet_pkey'
        ) THEN
          ALTER TABLE loyalty_wallet DROP CONSTRAINT loyalty_wallet_pkey;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'loyalty_wallet_account_id_key'
        ) THEN
          ALTER TABLE loyalty_wallet DROP CONSTRAINT loyalty_wallet_account_id_key;
        END IF;

        ALTER TABLE loyalty_wallet
          ALTER COLUMN account_id SET NOT NULL,
          ALTER COLUMN org_id SET NOT NULL;

        ALTER TABLE loyalty_wallet
          ADD CONSTRAINT loyalty_wallet_pkey PRIMARY KEY (account_id, org_id);
      END $$;
    `);
    console.log('Constraint-ul loyalty_wallet_pkey a fost setat pe (account_id, org_id)');

    
    app.listen(PORT, () => {
      console.log(`Serverul ruleaza pe port ${PORT}`);
    });
  } catch (error) {
    console.error('Eroare la conectare:', error);
  }
};

startServer();
