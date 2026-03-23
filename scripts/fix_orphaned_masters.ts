import { pool } from '../services/db';

async function fixOrphans() {
    console.log('Linking orphaned MASTERs to the default SUPER_MASTER...');
    const client = await pool.connect();
    try {
        const smRes = await client.query(`SELECT id FROM users WHERE role = 'SUPER_MASTER' ORDER BY created_at ASC LIMIT 1`);
        if (smRes.rows.length === 0) {
            console.log('No Super Master found.');
            return;
        }
        const smId = smRes.rows[0].id;

        const updateRes = await client.query(
            `UPDATE users SET parent_user_id = $1 WHERE role = 'MASTER' AND parent_user_id IS NULL`,
            [smId]
        );
        console.log(`Successfully linked ${updateRes.rowCount} legacy MASTER accounts to SUPER_MASTER (${smId}).`);
    } catch (e: any) {
        console.error('Error:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fixOrphans();
