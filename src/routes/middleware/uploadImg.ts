import { NextFunction, Request, Response } from 'express';
import { APIError, HttpCode } from '../../util/errors';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({
	storage,
	limits: {
		fileSize: 2 ** 20 // 1 MB file limit
	}
});

export default function uploadImg(fileName: string) {
	return (req: Request, res: Response, next: NextFunction) => {
		upload.single(fileName)(req, res, (err?: any) => {
			if (err instanceof multer.MulterError) {
				const message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (1MB limit)' : err.message;
				return next(new APIError(HttpCode.BadRequest, message));
			} else if (err) {
				return next(err);
			}
			return next();
		});
	};
}
