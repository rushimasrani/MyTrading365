import { Pool } from "pg";
import dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config();

// Pool configuration supporting both individual variables or a single connection string
const isProduction = process.env.NODE_ENV === 'production';

const useSSL = process.env.DB_SSL === 'true' ||
    process.env.DATABASE_URL?.includes('sslmode=') ||
    process.env.DB_HOST?.includes('rds.amazonaws.com');

// Debugging (Safe): Log length and first/last char to detect truncation/quoting issues
if (process.env.DB_PASSWORD) {
    const p = process.env.DB_PASSWORD;
    console.log(`[DB DEBUG] Password loaded: Length=${p.length}, Starts with=${p[0]}, Ends with=${p[p.length - 1]}`);
} else {
    console.log(`[DB DEBUG] No password found in process.env.DB_PASSWORD`);
}

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DATABASE_URL ? undefined : process.env.DB_HOST,
    port: process.env.DATABASE_URL ? undefined : (Number(process.env.DB_PORT) || 5432),
    user: process.env.DATABASE_URL ? undefined : process.env.DB_USER,
    password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD,
    database: process.env.DATABASE_URL ? undefined : process.env.DB_NAME,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
});

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
