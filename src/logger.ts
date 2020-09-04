import { default as pino } from 'pino';
export const logger = pino({
	prettyPrint: true,
	level: 'info' || 'error'
});

/* const expressPino = require('express-pino-logger');
const myExpressLogger = expressPino({ myLogger }) */
