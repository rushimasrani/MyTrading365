/**
 * Database Migration Script — order_book schema stabilization
 * 
 * Run on BOTH local PostgreSQL and AWS RDS to ensure schema consistency.
 * All operations are idempotent (safe to run multiple times).
 * 
 * Usage:  npx tsx scripts/migrate_order_book.ts
 */
import { pool } from '../services/db';

const migrations: string[] = [
    // order_book columns
    `ALTER TABLE order_book ADD COLUMN IF NOT EXISTS executed_price DECIMAL(15, 2) NOT NULL DEFAULT 0`,
    `ALTER TABLE order_book ADD COLUMN IF NOT EXISTS exchange VARCHAR(20) NOT NULL DEFAULT 'NSE_FO'`,
    `ALTER TABLE order_book ADD COLUMN IF NOT EXISTS exch VARCHAR(20)`,
    `ALTER TABLE order_book ADD COLUMN IF NOT EXISTS tid VARCHAR(50)`,
    `ALTER TABLE order_book ADD COLUMN IF NOT EXISTS etrdnum VARCHAR(50)`,
    `ALTER TABLE order_book ADD COLUMN IF NOT EXISTS eordnum VARCHAR(50)`,
    `ALTER TABLE order_book ADD COLUMN IF NOT EXISTS sl_price DECIMAL(15, 2) NOT NULL DEFAULT 0`,
    `ALTER TABLE order_book ADD COLUMN IF NOT EXISTS disclosed_qty INT NOT NULL DEFAULT 0`,
    `ALTER TABLE order_book ADD COLUMN IF NOT EXISTS remaining_qty INT NOT NULL DEFAULT 0`,
    `ALTER TABLE order_book ADD COLUMN IF NOT EXISTS account_name VARCHAR(100)`,
    `ALTER TABLE order_book ADD COLUMN IF NOT EXISTS oid VARCHAR(50)`,
    `ALTER TABLE order_book ADD COLUMN IF NOT EXISTS blocked_margin DECIMAL(15, 2) NOT NULL DEFAULT 0`,
    `ALTER TABLE order_book ADD COLUMN IF NOT EXISTS reject_reason TEXT`,
    `ALTER TABLE order_book ADD COLUMN IF NOT EXISTS executed_at TIMESTAMP`,

    // capital table — ensure allocated_m2m exists
    `ALTER TABLE capital ADD COLUMN IF NOT EXISTS allocated_m2m DECIMAL(15, 2) NOT NULL DEFAULT 0`,
];

async function runMigrations() {
    console.log('=== Trading Terminal — Database Migration ===\n');
    let passed = 0;
    let failed = 0;

    for (const sql of migrations) {
        try {
            await pool.query(sql);
            // Extract a short description from the SQL
            const match = sql.match(/ADD COLUMN IF NOT EXISTS (\S+)/);
            const col = match ? match[1] : sql.substring(0, 60);
            console.log(`  ✅ ${col}`);
            passed++;
        } catch (e: any) {
            console.error(`  ❌ FAILED: ${sql}`);
            console.error(`     ${e.message}`);
            failed++;
        }
    }

    console.log(`\n=== Migration Complete: ${passed} passed, ${failed} failed ===`);

    if (failed > 0) {
        console.error('\n⚠️  Some migrations failed. Please review the errors above.');
    } else {
        console.log('\n✅ All migrations applied successfully. Schema is stable.');
    }

    await pool.end();
}

runMigrations();
