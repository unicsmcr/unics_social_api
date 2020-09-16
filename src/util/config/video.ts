// Room time limit is 5 minutes
export const ROOM_TIME_LIMIT_SECS = 60 * 5;

// Room time limit is 5 minutes, but converted seconds to milliseconds
export const ROOM_TIME_LIMIT_MS = 60 * 5 * 1000;

// Allow JWTs to live for 10% longer than the room time limit
export const ROOM_TIME_LIMIT_TTL = Math.floor(ROOM_TIME_LIMIT_SECS * 1.10);
