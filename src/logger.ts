import { default as pino } from 'pino';
export const logger = pino({
	prettyPrint: true
});

/* const expressPino = require('express-pino-logger');
const myExpressLogger = expressPino({ myLogger }) */
