#!/usr/bin/env tsx
/**
 * Migration Script: Make all decks public
 *
 * This script:
 * 1. Updates all existing decks to be public
 * 2. Changes the default value for new decks to public
 *
 * Usage: npm run migrate:public-decks
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting migration: Make decks public...\n');

    // Step 1: Count current state
    console.log('📊 Checking current state...');
    const beforeResult = await client.query(`
      SELECT
        COUNT(*) as total_decks,
        SUM(CASE WHEN is_public THEN 1 ELSE 0 END) as public_decks,
        SUM(CASE WHEN NOT is_public THEN 1 ELSE 0 END) as private_decks
      FROM decks
      WHERE deleted_at IS NULL
    `);

    const before = beforeResult.rows[0];
    console.log(`   Total decks: ${before.total_decks}`);
    console.log(`   Public decks: ${before.public_decks}`);
    console.log(`   Private decks: ${before.private_decks}\n`);

    // Step 2: Update existing decks
    console.log('🔄 Updating existing decks to public...');
    const updateResult = await client.query(`
      UPDATE decks
      SET is_public = true, updated_at = NOW()
      WHERE deleted_at IS NULL AND is_public = false
      RETURNING id, title
    `);

    console.log(`   ✓ Updated ${updateResult.rowCount} decks to public\n`);

    if (updateResult.rows.length > 0) {
      console.log('   Updated decks:');
      updateResult.rows.forEach((deck, i) => {
        if (i < 10) {
          // Show first 10
          console.log(`   - ${deck.title} (${deck.id})`);
        }
      });
      if (updateResult.rows.length > 10) {
        console.log(`   ... and ${updateResult.rows.length - 10} more\n`);
      } else {
        console.log('');
      }
    }

    // Step 3: Change default value
    console.log('🔧 Changing default value for new decks...');
    await client.query(`
      ALTER TABLE decks
      ALTER COLUMN is_public SET DEFAULT true
    `);
    console.log('   ✓ Default value changed to TRUE\n');

    // Step 4: Verify final state
    console.log('✅ Verifying final state...');
    const afterResult = await client.query(`
      SELECT
        COUNT(*) as total_decks,
        SUM(CASE WHEN is_public THEN 1 ELSE 0 END) as public_decks,
        SUM(CASE WHEN NOT is_public THEN 1 ELSE 0 END) as private_decks
      FROM decks
      WHERE deleted_at IS NULL
    `);

    const after = afterResult.rows[0];
    console.log(`   Total decks: ${after.total_decks}`);
    console.log(`   Public decks: ${after.public_decks}`);
    console.log(`   Private decks: ${after.private_decks}\n`);

    console.log('🎉 Migration completed successfully!');
    console.log('   All existing decks are now public.');
    console.log('   New decks will be public by default.\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('✓ Migration script finished');
    process.exit(0);
  })
  .catch(error => {
    console.error('✗ Migration script failed:', error);
    process.exit(1);
  });
