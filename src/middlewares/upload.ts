import multer from 'multer';

// Candidate and config upload flows stream files straight to Cloudinary, so we
// keep the file in memory and pass the buffer downstream.
export const upload = multer({
  storage: multer.memoryStorage(),
});
