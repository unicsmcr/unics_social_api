export function getEnvOptional(source: Record<string, string | undefined>, name: string): string|undefined {
	return source[name];
}

export function getEnvOrDefault(source: Record<string, string | undefined>, name: string, defaultValue: string) {
	return getEnvOptional(source, name) ?? defaultValue;
}

export function getEnv(source: Record<string, string | undefined>, name: string) {
	const value = getEnvOptional(source, name);
	if (typeof value === 'undefined') throw new Error(`Property ${name} is missing from source.`);
	return value;
}

export function intoNumber(str: string): number {
	if (!str.trim() || isNaN(Number(str))) throw new Error(`Value '${str}' is not a number.`);
	return Number(str);
}

export function intoBoolean(str: string): boolean {
	if (str.toLowerCase() === 'false' || str === '0') {
		return false;
	} else if (str.toLowerCase() === 'true' || str === '1') {
		return true;
	}
	throw new Error(`Value '${str}' is not a clear boolean value (should be true/false or 1/0)`);
}
