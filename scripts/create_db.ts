import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const createDatabase = async () => {
    const client = new Client({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'postgres', // Connect to default database
    });

    try {
        await client.connect();
        console.log("Connected to postgres default database.");

        // Check if database exists
        const res = await client.query(`SELECT datname FROM pg_database WHERE datname = 'trading_terminal'`);
        if (res.rowCount === 0) {
            console.log("Database 'trading_terminal' does not exist. Creating...");
            await client.query(`CREATE DATABASE trading_terminal`);
            console.log("✅ Database 'trading_terminal' created successfully!");
        } else {
            console.log("Database 'trading_terminal' already exists.");
        }
    } catch (error) {
        console.error("❌ Failed to create database:", error);
    } finally {
        await client.end();
    }
};

createDatabase();
