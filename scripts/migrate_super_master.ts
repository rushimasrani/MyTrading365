/**
 * Database Migration Script — Super Master Hierarchy
 * 
 * Safely introduces SUPER_MASTER -> MASTER -> CLIENT hierarchy on AWS RDS PostgreSQL.
 * Run via: npx tsx scripts/migrate_super_master.ts
 * 
 * Safe for Production Setup:
 * - Does not delete any tables or data
 * - Backward compatible via IF NOT EXISTS
 * - Maps existing clients securely to the first available Master
 */
import { pool } from '../services/db';
import bcrypt from 'bcryptjs';

async function runSuperMasterMigration() {
    console.log('=== Starting Super Master Hierarchy Migration ===\n');

    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Run inside transaction for safety

        // 1. Add parent_user_id safely
        console.log('[1/4] Augmenting users table...');
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_user_id VARCHAR(50);`);
        console.log('  ✅ parent_user_id column ensured.');

        // 2. Convert old 'ADMIN' roles to 'MASTER' securely
        console.log('[2/4] Migrating legacy ADMIN role to MASTER...');
        const roleUpdate = await client.query(`UPDATE users SET role = 'MASTER' WHERE role = 'ADMIN';`);
        console.log(`  ✅ Converted ${roleUpdate.rowCount} ADMIN users to MASTER.`);

        // 3. Backward Compatibility Mapping
        // Find the oldest existing MASTER account to map orphaned CLIENTs to
        console.log('[3/4] Running Backward Compatibility Mapping...');
        const masterRes = await client.query(`SELECT id FROM users WHERE role = 'MASTER' ORDER BY created_at ASC LIMIT 1`);

        if (masterRes.rows.length > 0) {
            const legacyMasterId = masterRes.rows[0].id;
            const clientUpdate = await client.query(
                `UPDATE users SET parent_user_id = $1 WHERE role = 'CLIENT' AND parent_user_id IS NULL`,
                [legacyMasterId]
            );
            console.log(`  ✅ Mapped ${clientUpdate.rowCount} existing orphaned CLIENT accounts to Master ID: ${legacyMasterId}`);
        } else {
            console.log('  ⚠️ No legacy MASTER accounts found. Skipping orphan mapping.');
        }

        // 4. Create initial SUPER_MASTER user
        console.log('[4/4] Ensuring initial SUPER_MASTER account...');
        const smRes = await client.query(`SELECT id FROM users WHERE role = 'SUPER_MASTER'`);

        if (smRes.rows.length === 0) {
            console.log('  ⚙️ Creating default Super Master: superadmin / superadmin123...');
            const smId = 'sm_' + Date.now();
            const smVal = await bcrypt.hash('superadmin123', 10);

            await client.query(`
                INSERT INTO users (id, username, password_hash, role, status, created_at, parent_user_id)
                VALUES ($1, $2, $3, 'SUPER_MASTER', 'ACTIVE', NOW(), NULL)
            `, [smId, 'superadmin', smVal]);

            await client.query(`
                INSERT INTO capital (user_id, assigned_capital, available_capital, used_capital, allocated_m2m)
                VALUES ($1, 0, 0, 0, 0)
            `, [smId]);
            console.log(`  ✅ Default SUPER_MASTER created successfully! (Username: superadmin)`);

            // Link legacy MASTERs to this new SUPER_MASTER
            const updateRes = await client.query(
                `UPDATE users SET parent_user_id = $1 WHERE role = 'MASTER' AND parent_user_id IS NULL`,
                [smId]
            );
            console.log(`  ✅ Linked ${updateRes.rowCount} legacy MASTER accounts to SUPER_MASTER (${smId}).`);
        } else {
            console.log(`  ✅ SUPER_MASTER already exists. Skipping creation.`);
        }

        await client.query('COMMIT');
        console.log('\n=== ✅  MIGRATION COMPLETED SUCCESSFULLY ===\n');

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('\n❌ MIGRATION FAILED: Transaction Rolled Back. System safely untouched.');
        console.error('Details:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

runSuperMasterMigration();
