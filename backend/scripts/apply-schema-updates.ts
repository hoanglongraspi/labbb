/**
 * One-off helper to upsert new enum values and schema adjustments
 * for the Patient Portal database.
 *
 * Run: npx ts-node scripts/apply-schema-updates.ts
 */

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

dotenv.config();

const prisma = new PrismaClient();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function ensureEnumValue(enumName: string, value: string) {
  const client = await pool.connect();
  try {
    const exists = await client.query(
      `SELECT EXISTS (
         SELECT 1
         FROM pg_enum
         WHERE enumlabel = $1
           AND enumtypid = (SELECT oid FROM pg_type WHERE typname = $2)
       )`,
      [value, enumName]
    );

    if (!exists.rows[0].exists) {
      await client.query(`ALTER TYPE "${enumName}" ADD VALUE '${value}'`);
      console.log(`Added value '${value}' to enum ${enumName}`);
    }
  } finally {
    client.release();
  }
}

async function main() {
  await ensureEnumValue('PrimaryCondition', 'MISOPHONIA');
  await ensureEnumValue('PrimaryCondition', 'HYPERACUSIS');

  // Ensure the condition enums exist
  const client = await pool.connect();
  try {
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConditionCategory') THEN
          CREATE TYPE "ConditionCategory" AS ENUM ('GOOD_HEARING', 'HEARING_LOSS', 'TINNITUS', 'MISOPHONIA', 'HYPERACUSIS');
        END IF;
      END$$;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConditionSeverity') THEN
          CREATE TYPE "ConditionSeverity" AS ENUM ('NONE', 'MILD', 'MODERATE', 'SEVERE', 'CRITICAL');
        END IF;
      END$$;
    `);

    await client.query(`
      ALTER TABLE "evaluations"
        ADD COLUMN IF NOT EXISTS "condition_category" "ConditionCategory",
        ADD COLUMN IF NOT EXISTS "condition_severity" "ConditionSeverity";
    `);

    await client.query(`
      ALTER TABLE "audiograms"
        ADD COLUMN IF NOT EXISTS "summary" TEXT,
        ADD COLUMN IF NOT EXISTS "summary_prompt" TEXT,
        ADD COLUMN IF NOT EXISTS "summary_generated_at" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "summary_generated_by" TEXT;
    `);

    await client.query(`
      ALTER TABLE "audiograms"
        ADD CONSTRAINT IF NOT EXISTS "audiograms_summary_generated_by_fkey"
          FOREIGN KEY ("summary_generated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS "audiograms_summary_generated_by_idx" ON "audiograms" ("summary_generated_by");
    `);
  } finally {
    client.release();
  }

  console.log('Schema update script completed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
