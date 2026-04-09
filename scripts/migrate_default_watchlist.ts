import { pool } from '../services/db';

/**
 * NON-DESTRUCTIVE migration: Creates the default_watchlist table
 * and seeds it with initial default instruments IF the table is empty.
 * 
 * Safe for production AWS RDS — uses CREATE TABLE IF NOT EXISTS only.
 */
const migrateDefaultWatchlist = async () => {
    try {
        console.log('[MIGRATION] Starting default_watchlist table creation...');

        // 1. Create table (non-destructive)
        await pool.query(`
      CREATE TABLE IF NOT EXISTS default_watchlist (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(50) NOT NULL,
        token VARCHAR(50) NOT NULL,
        tradingsymbol VARCHAR(100) NOT NULL,
        exchange VARCHAR(20) NOT NULL,
        expiry VARCHAR(50),
        instrument_type VARCHAR(20) NOT NULL DEFAULT 'FUTIDX',
        is_default BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('[MIGRATION] ✅ default_watchlist table ensured.');

        // 2. Check if table already has data — do NOT overwrite existing data
        const countResult = await pool.query('SELECT COUNT(*) FROM default_watchlist');
        const rowCount = parseInt(countResult.rows[0].count, 10);

        if (rowCount > 0) {
            console.log(`[MIGRATION] Table already has ${rowCount} row(s). Skipping seed.`);
        } else {
            console.log('[MIGRATION] Table is empty. Seeding default instruments...');

            // 3. Seed with nearest FUT for each default symbol
            const defaultSymbols = ['NIFTY', 'BANKNIFTY', 'SENSEX'];
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

            for (const symbol of defaultSymbols) {
                const result = await pool.query(`
          SELECT token, tradingsymbol, exchange, expiry, instrument_type
          FROM instruments
          WHERE tradingsymbol LIKE $1
            AND instrument_type LIKE 'FUT%'
            AND expiry > $2
          ORDER BY expiry ASC
          LIMIT 1
        `, [`${symbol}%FUT`, today]);

                if (result.rows.length > 0) {
                    const inst = result.rows[0];
                    await pool.query(`
            INSERT INTO default_watchlist (symbol, token, tradingsymbol, exchange, expiry, instrument_type, is_default)
            VALUES ($1, $2, $3, $4, $5, $6, TRUE)
          `, [symbol, inst.token, inst.tradingsymbol, inst.exchange, inst.expiry, inst.instrument_type]);
                    console.log(`[MIGRATION] ✅ Seeded: ${symbol} → ${inst.tradingsymbol} (token: ${inst.token})`);
                } else {
                    console.log(`[MIGRATION] ⚠️ No active FUT contract found for ${symbol}. Skipping.`);
                }
            }
        }

        console.log('[MIGRATION] ✅ Migration complete.');
    } catch (error) {
        console.error('[MIGRATION] ❌ Failed:', error);
    } finally {
        pool.end();
    }
};

migrateDefaultWatchlist();
