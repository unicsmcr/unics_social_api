// Room time limit is 5 minutes
export const ROOM_TIME_LIMIT = 60 * 5;

// Room time limit is 5 minutes, but converted milliseconds to seconds
export const ROOM_TIME_LIMIT_CONV = 60 * 5 * 1000;

// Allow JWTs to live for 10% longer than the room time limit
export const ROOM_TIME_LIMIT_TTL = Math.floor(ROOM_TIME_LIMIT * 1.10);
