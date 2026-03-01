import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const REQUIRED = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_OWNER_ID', 'GROQ_API_KEY'];

for (const key of REQUIRED) {
    if (!process.env[key]) {
        console.error(`[config] missing required env: ${key}`);
        process.exit(1);
    }
}

const config = Object.freeze({
    telegram: {
        token: process.env.TELEGRAM_BOT_TOKEN,
        ownerId: Number(process.env.TELEGRAM_OWNER_ID),
    },
    groq: {
        apiKey: process.env.GROQ_API_KEY,
        model: 'llama-3.1-8b-instant',
    },
    searchApi: {
        key: process.env.SEARCHAPI_KEY || '',
    },
    serpApi: {
        key: process.env.SERPAPI_API_KEY || '',
    },
    paths: {
        root: path.resolve(__dirname, '..'),
        data: path.resolve(__dirname, '..', 'data'),
    },
    grid: {
        cols: 16,
        rows: 18,
    },
});

export default config;
