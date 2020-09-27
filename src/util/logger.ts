import pino from 'pino';

export const logger = pino(process.env.CI ? { level: 'silent' } : undefined);
