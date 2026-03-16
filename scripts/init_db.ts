import { pool } from '../services/db';

const initializeDatabase = async () => {
  try {
    console.log("Starting PostgreSQL schema initialization...");

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'CLIENT',
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create capital table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS capital (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_capital DECIMAL(15, 2) NOT NULL DEFAULT 0,
        available_capital DECIMAL(15, 2) NOT NULL DEFAULT 0,
        used_capital DECIMAL(15, 2) NOT NULL DEFAULT 0,
        allocated_m2m DECIMAL(15, 2) NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Force add allocated_m2m if table already exists
    await pool.query(`
      ALTER TABLE capital ADD COLUMN IF NOT EXISTS allocated_m2m DECIMAL(15, 2) NOT NULL DEFAULT 0;
    `);

    // Create instruments master table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS instruments (
        token VARCHAR(50) PRIMARY KEY,
        tradingsymbol VARCHAR(100) NOT NULL,
        exchange VARCHAR(20) NOT NULL,
        expiry VARCHAR(50),
        instrument_type VARCHAR(20),
        lot_size INT NOT NULL DEFAULT 1
      )
    `);

    // Create orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        instrument VARCHAR(100) NOT NULL,
        token VARCHAR(50) NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(15, 2) NOT NULL,
        execution_price DECIMAL(15, 2) NOT NULL,
        side VARCHAR(10) NOT NULL,
        order_type VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        exch VARCHAR(20),
        oid VARCHAR(50),
        tid VARCHAR(50),
        eTrdNum VARCHAR(50),
        eOrdNum VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create positions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS positions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        instrument VARCHAR(100) NOT NULL,
        token VARCHAR(50) NOT NULL,
        buy_qty INT NOT NULL DEFAULT 0,
        buy_avg DECIMAL(15, 4) NOT NULL DEFAULT 0,
        sell_qty INT NOT NULL DEFAULT 0,
        sell_avg DECIMAL(15, 4) NOT NULL DEFAULT 0,
        net_quantity INT NOT NULL DEFAULT 0,
        average_price DECIMAL(15, 4) NOT NULL DEFAULT 0,
        m2m DECIMAL(15, 2) NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create trade_history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trade_history (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        instrument VARCHAR(100) NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(15, 2) NOT NULL,
        side VARCHAR(10) NOT NULL,
        pnl DECIMAL(15, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create rms_limits table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rms_limits (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        instrument VARCHAR(100) NOT NULL,
        max_order_qty INT NOT NULL DEFAULT 0,
        max_net_qty INT NOT NULL DEFAULT 0,
        exchange VARCHAR(20) NOT NULL,
        trade_start TIME NOT NULL DEFAULT '00:00:00',
        trade_end TIME NOT NULL DEFAULT '23:59:59'
      )
    `);

    // Create indexes for performance
    console.log("Applying database indexes...");
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_username ON users(username)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_positions_user ON positions(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_positions_token ON positions(token)`);

    console.log("✅ Database schema initialized successfully!");
  } catch (error) {
    console.error("❌ Failed to initialize database:", error);
  } finally {
    pool.end();
  }
};

initializeDatabase();
