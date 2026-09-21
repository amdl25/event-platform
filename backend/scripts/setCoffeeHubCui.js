import sequelize from '../config/database.js';
import Organization from '../models/Organization.js';

const CUI = 'RO38432516';

const run = async () => {
  try {
    await sequelize.authenticate();

    const organization = await Organization.findOne({ where: { name: 'The Coffee Hub' } });

    if (!organization) {
      console.error('Organizația "The Coffee Hub" nu a fost găsită.');
      process.exitCode = 1;
      return;
    }

    await organization.update({ business_identifier: CUI });

    console.log(`CUI setat pentru "${organization.name}": ${organization.business_identifier}`);
  } catch (error) {
    console.error('Eroare la setarea CUI:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

run();
