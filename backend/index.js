import express from 'express';
import cors from 'cors';
import sequelize from './config/database.js';

import './models/relationships.js';
import eventRoutes from './routes/eventRoutes.js';
import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/events', eventRoutes);
console.log("Rutele de Auth sunt încărcate la /auth");
app.use('/auth', authRoutes);
app.use('/categories', categoryRoutes);
app.use('/users', userRoutes);

if (!process.env.CLOUDINARY_URL && !process.env.CLOUDINARY_CLOUD_NAME) {
  app.use('/uploads', express.static('uploads'));
}

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

    
    app.listen(PORT, () => {
      console.log(`Serverul ruleaza pe port ${PORT}`);
    });
  } catch (error) {
    console.error('Eroare la conectare:', error);
  }
};

startServer();
