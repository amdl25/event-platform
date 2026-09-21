import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import sequelize from '../config/database.js';
import { Account } from '../models/relationships.js';

dotenv.config();

const EMAIL = 'admin@eventhub.ro';
const PASSWORD = 'Admin1234!';

const run = async () => {
  await sequelize.authenticate();

  const existing = await Account.findOne({ where: { email: EMAIL } });
  if (existing) {
    console.log(`Contul ${EMAIL} există deja (rol: ${existing.role}). Nu s-a modificat nimic.`);
    process.exit(0);
  }

  const hash = await bcrypt.hash(PASSWORD, 10);
  await Account.create({
    email: EMAIL,
    password_hash: hash,
    first_name: 'Admin',
    last_name: 'EventHub',
    role: 'admin'
  });

  console.log('Admin creat cu succes!');
  console.log(`  Email:   ${EMAIL}`);
  console.log(`  Parolă:  ${PASSWORD}`);
  process.exit(0);
};

run().catch((err) => {
  console.error('Eroare:', err.message);
  process.exit(1);
});
