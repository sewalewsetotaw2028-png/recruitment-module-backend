import multer from 'multer';

export const recruitmentDocumentUpload = multer({
  storage: multer.memoryStorage(),
});
