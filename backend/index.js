import express from 'express';
import cors from 'cors';
import sequelize from './config/database.js';

import './models/relationships.js';
import eventRoutes from './routes/eventRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/events', eventRoutes);

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conectare reusita la baza de date');

    await sequelize.sync({ alter: true }); 
    console.log('Tabelele au fost create sau actualizate');

    
    app.listen(PORT, () => {
      console.log(`Serverul ruleaza pe: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Eroare la conectare:', error);
  }
};

startServer();
