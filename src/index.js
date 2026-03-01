import config from './config.js';
import { startBot } from './telegram/bot.js';

console.log('[talon] v1.0');
console.log('[talon] owner=%d model=%s', config.telegram.ownerId, config.groq.model);

startBot();
