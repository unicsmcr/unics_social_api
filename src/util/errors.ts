export class APIError extends Error {
	public httpCode: number;

	public constructor(httpCode: number, error: string) {
		super(error);
		this.httpCode = httpCode;
	}
}
