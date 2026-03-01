import express from 'express';
import cors from 'cors';
import sequelize from './config/database.js';

const app = express();
app.use(cors());
app.use(express.json());

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conectare reusita la baza de date');

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Serverul ruleaza pe: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Eroare la conectare:', error);
  }
};

startServer();