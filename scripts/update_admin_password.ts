import { pool } from '../services/db';
import bcrypt from 'bcryptjs';

const newPassword = process.argv[2];

if (!newPassword) {
    console.error('\n❌ Please provide a new password.');
    console.log('Usage: npx tsx scripts/update_admin_password.ts <new_password>\n');
    process.exit(1);
}

const updatePassword = async () => {
    try {
        console.log(`\nGenerating secure hash for the new password...`);
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        console.log(`Updating 'admin' account password in database...`);

        // We update by username = 'admin' AND role = 'ADMIN' to be perfectly safe
        const res = await pool.query(`
      UPDATE users 
      SET password_hash = $1 
      WHERE username = 'admin' AND role = 'ADMIN'
      RETURNING id, username
    `, [hashedPassword]);

        if (res.rowCount === 0) {
            console.error('\n❌ Admin user not found. Checking if a user named admin exists...');
            const check = await pool.query(`SELECT username, role FROM users WHERE username = 'admin'`);
            if (check.rowCount > 0) {
                console.error(`User found but role is: ${check.rows[0].role}. Not updating.`);
            } else {
                console.error(`No user with username 'admin' exists.`);
            }
        } else {
            console.log(`\n✅ Password updated successfully for user: ${res.rows[0].username}`);
        }
    } catch (error) {
        console.error('\n❌ Failed to update password:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
};

updatePassword();
