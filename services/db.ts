import { Pool, PoolConfig } from "pg";
import dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config();

const poolConfig: PoolConfig = {};

if (process.env.DATABASE_URL) {
    poolConfig.connectionString = process.env.DATABASE_URL;
} else {
    poolConfig.host = process.env.DB_HOST || 'localhost';
    poolConfig.port = parseInt(process.env.DB_PORT || '5432');
    poolConfig.user = process.env.DB_USER || 'postgres';
    poolConfig.password = process.env.DB_PASSWORD || '';
    poolConfig.database = process.env.DB_NAME || 'trading_terminal';
}

if (process.env.NODE_ENV === 'production' || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('rds.amazonaws.com'))) {
    poolConfig.ssl = {
        rejectUnauthorized: false
    };
}

export const pool = new Pool(poolConfig);

// Test the connection pool synchronously
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle pg client', err);
    process.exit(-1);
});

export const query = (text: string, params?: any[]) => {
    return pool.query(text, params);
};

export const getClient = () => {
    return pool.connect();
};
