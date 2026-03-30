import sequelize from '../config/database.js';

const run = async () => {
  try {
    await sequelize.authenticate();

    await sequelize.query(`
      ALTER TABLE "organization"
      ADD COLUMN IF NOT EXISTS "business_identifier" VARCHAR(255);
    `);

    await sequelize.query(`
      ALTER TABLE "organization"
      ADD COLUMN IF NOT EXISTS "registered_address" VARCHAR(255);
    `);

    await sequelize.query(`
      ALTER TABLE "organization"
      ADD COLUMN IF NOT EXISTS "official_phone" VARCHAR(255);
    `);

    await sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'organization' AND column_name = 'cui_cif'
        ) THEN
          UPDATE "organization"
          SET "business_identifier" = COALESCE("business_identifier", "cui_cif")
          WHERE "cui_cif" IS NOT NULL;

          ALTER TABLE "organization" DROP COLUMN "cui_cif";
        END IF;
      END $$;
    `);

    await sequelize.query(`
      UPDATE "organization"
      SET "business_identifier" = 'NECOMPLETAT'
      WHERE "business_identifier" IS NULL;
    `);

    await sequelize.query(`
      ALTER TABLE "organization"
      ALTER COLUMN "business_identifier" DROP NOT NULL;
    `);

    await sequelize.query(`
      ALTER TABLE "organization"
      ALTER COLUMN "registered_address" DROP NOT NULL;
    `);

    await sequelize.query(`
      ALTER TABLE "organization"
      ALTER COLUMN "official_phone" DROP NOT NULL;
    `);

    console.log('Organization business profile migration finished successfully.');
  } catch (error) {
    console.error('Organization migration failed:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

run();
