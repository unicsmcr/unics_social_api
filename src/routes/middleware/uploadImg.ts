import { NextFunction, Request, Response } from 'express';
import { APIError, HttpCode } from '../../util/errors';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({
	storage,
	limits: {
		fileSize: 2 ** 19 // 512 KB file limit
	}
});

export default function uploadImg(req: Request, res: Response, next: NextFunction) {
	upload.single('image')(req, res, (err?: any) => {
		if (err instanceof multer.MulterError) {
			return next(new APIError(HttpCode.BadRequest, err.message));
		} else if (err) {
			return next(err);
		}
		return next();
	});
}
