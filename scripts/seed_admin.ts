import { query } from '../services/db';
import bcrypt from 'bcryptjs';

const seedAdmin = async () => {
    try {
        console.log("Seeding default Administrator account...");
        // Check if admin exists
        const res = await query(`SELECT * FROM users WHERE username = 'admin'`);
        if (res.rows.length === 0) {
            const adminId = `admin-1`;
            const hashedPassword = await bcrypt.hash('admin', 10);

            await query(`
        INSERT INTO users (id, username, password_hash, role, status)
        VALUES ($1, $2, $3, $4, $5)
      `, [adminId, 'admin', hashedPassword, 'ADMIN', 'ACTIVE']);

            await query(`
        INSERT INTO capital (user_id, assigned_capital, available_capital, used_capital)
        VALUES ($1, $2, $3, $4)
      `, [adminId, 1000000000, 1000000000, 0]);

            console.log("✅ Default 'admin' account created alongside infinite default Capital.");
        } else {
            console.log("Admin account already exists.");
        }
    } catch (err) {
        console.error("Failed to seed admin:", err);
    } finally {
        process.exit(0);
    }
};

seedAdmin();
