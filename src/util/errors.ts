import { ValidationError } from 'class-validator';

export enum HttpResponseCode {
	Ok = 200,
	Created = 201,
	NoContent = 204,
	Redirect = 302,
	BadRequest = 400,
	Unauthorized = 401,
	Forbidden = 403,
	NotFound = 404,
	InternalError = 500,
	NotImplemented = 501
}

export class APIError extends Error {
	public httpCode: number;

	public constructor(httpCode: number, error: string) {
		super(error);
		this.httpCode = httpCode;
	}
}

export function formatValidationErrors(errors: ValidationError|ValidationError[]): APIError {
	if (!Array.isArray(errors)) errors = [errors];
	const message = [];
	for (const error of errors) {
		if (error.constraints) {
			message.push(...[...Object.values(error.constraints)]);
		} else {
			message.push(`${error.property} failed validation`);
		}
	}
	// use Set to remove identical errors, e.g. email constraint on User
	return new APIError(HttpResponseCode.BadRequest, Array.from(new Set(message)).join('\n'));
}
