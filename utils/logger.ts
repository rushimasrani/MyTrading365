import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'logs', 'ticks.log');

if (!fs.existsSync(path.dirname(LOG_FILE))) {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
}

export const logTick = (data: any) => {
    const logEntry = `${new Date().toISOString()} - ${JSON.stringify(data)}\n`;
    fs.appendFile(LOG_FILE, logEntry, (err) => {
        if (err) console.error('Error writing to tick log:', err);
    });
};
