import { pool } from '../services/db';

async function migrateMaxLoss() {
    console.log('=== Starting Migration: Max Loss Limit ===\n');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('[1/1] Adding max_loss_limit column to users table...');
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS max_loss_limit DECIMAL(15,2);`);
        console.log('  ✅ max_loss_limit column added or verified.');

        await client.query('COMMIT');
        console.log('\n=== ✅  MIGRATION COMPLETED SUCCESSFULLY ===\n');
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('\n❌ MIGRATION FAILED:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrateMaxLoss();
