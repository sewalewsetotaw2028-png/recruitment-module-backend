import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import { logger } from '../utils/logger';

// ─── Configure Cloudinary ────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key:    process.env.CLOUDINARY_API_KEY    || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
  secure: true,
});

export class CloudinaryService {

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private static getUploadsRoot() {
    return path.resolve(__dirname, '../../uploads');
  }

  private static getPublicUrl(filePath: string) {
    const base = (process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');
    return `${base}/uploads/${filePath.split(path.sep).join('/')}`;
  }

  // ─── Local Fallback ────────────────────────────────────────────────────────

  private static async saveLocalFallback(
    fileBuffer: Buffer,
    fileName: string,
    folder: string,
  ): Promise<string> {
    const safeFolder   = folder.split('/').filter(Boolean);
    const safeName     = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const uploadsRoot  = this.getUploadsRoot();
    const absoluteFolder = path.join(uploadsRoot, ...safeFolder);

    logger.step('LocalFallback', 'Creating directory', { path: absoluteFolder });
    await fs.mkdir(absoluteFolder, { recursive: true });

    const absolutePath = path.join(absoluteFolder, safeName);
    await fs.writeFile(absolutePath, fileBuffer);

    const relativePath = path.relative(uploadsRoot, absolutePath);
    const publicUrl    = this.getPublicUrl(relativePath);

    logger.success('LocalFallback', 'File saved to disk', {
      absolutePath,
      publicUrl,
      sizeBytes: fileBuffer.length,
    });

    return publicUrl;
  }

  // ─── Upload ────────────────────────────────────────────────────────────────

  /**
   * Upload a file to Cloudinary.
   * Falls back to local disk storage if Cloudinary is unreachable or returns an error.
   *
   * @param fileBuffer   Buffer of the file to upload
   * @param fileName     Original filename
   * @param folder       Cloudinary folder path  (e.g. 'candidates/documents')
   * @param resourceType 'image' | 'raw' | 'auto'
   * @returns Public URL of the stored file (Cloudinary or local fallback)
   */
  static async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    folder: string,
    resourceType: 'image' | 'raw' | 'auto' = 'auto',
  ): Promise<string> {

    logger.section(`UPLOAD REQUEST — ${fileName}`);
    logger.info('CloudinaryService', 'Upload initiated', {
      fileName,
      folder,
      resourceType,
      sizeBytes: fileBuffer.length,
      sizeMB: (fileBuffer.length / 1024 / 1024).toFixed(2),
    });

    // Config check
    const cloudName  = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey     = process.env.CLOUDINARY_API_KEY;
    const apiSecret  = process.env.CLOUDINARY_API_SECRET;

    logger.step('CloudinaryService', 'Verifying Cloudinary credentials', {
      CLOUDINARY_CLOUD_NAME:  cloudName  ? `SET (${cloudName})`  : '❌ NOT SET',
      CLOUDINARY_API_KEY:     apiKey     ? 'SET ✓'               : '❌ NOT SET',
      CLOUDINARY_API_SECRET:  apiSecret  ? 'SET ✓'               : '❌ NOT SET',
    });

    if (!cloudName || !apiKey || !apiSecret) {
      logger.warn(
        'CloudinaryService',
        'One or more Cloudinary env vars are missing — will use local fallback immediately',
      );
    }

    return new Promise((resolve, reject) => {
      const publicId = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      logger.step('CloudinaryService', 'Opening upload_stream', { folder, publicId, resourceType });

      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: resourceType, public_id: publicId, overwrite: true },
        async (error, result) => {
          if (error) {
            // ── Cloudinary failed ────────────────────────────────────────────
            logger.error(
              'CloudinaryService',
              'Cloudinary upload FAILED — attempting local disk fallback',
              error,
              {
                fileName,
                folder,
                resourceType,
                cloudinary_http_code: (error as any).http_code ?? 'n/a',
                cloudinary_message:   error.message,
              },
            );

            try {
              logger.step('LocalFallback', 'Saving file to local disk...');
              const fallbackUrl = await this.saveLocalFallback(fileBuffer, fileName, folder);
              logger.warn(
                'CloudinaryService',
                '⚠️  Stored via LOCAL FALLBACK — file lives on this server, not Cloudinary',
                { fallbackUrl },
              );
              resolve(fallbackUrl);
            } catch (fallbackError) {
              logger.error(
                'LocalFallback',
                'Local disk fallback ALSO failed — upload entirely unsuccessful',
                fallbackError,
                { fileName, folder },
              );
              reject(fallbackError || error);
            }
            return;
          }

          // ── Cloudinary succeeded ─────────────────────────────────────────
          logger.success('CloudinaryService', 'Upload to Cloudinary succeeded ✓', {
            secure_url:   result?.secure_url,
            public_id:    result?.public_id,
            format:       result?.format,
            resource_type: result?.resource_type,
            bytes:        result?.bytes,
            created_at:   result?.created_at,
          });
          resolve(result?.secure_url || '');
        },
      );

      const readable = new Readable();
      readable.push(fileBuffer);
      readable.push(null);
      readable.pipe(uploadStream);

      logger.step('CloudinaryService', 'Buffer piped to upload stream — waiting for Cloudinary response...');
    });
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  /**
   * Delete a stored file — handles both Cloudinary URLs and local disk fallback URLs.
   */
  static async deleteStoredFile(url: string): Promise<void> {
    if (!url) {
      logger.warn('CloudinaryService', 'deleteStoredFile called with empty URL — skipping');
      return;
    }

    logger.section(`DELETE REQUEST — ${url.split('/').pop()}`);
    logger.info('CloudinaryService', 'Delete initiated', { url });

    if (url.startsWith('https://res.cloudinary.com')) {
      const publicId = this.extractPublicId(url);
      const resType  = url.includes('/image/upload/') ? 'image' : 'raw';
      logger.step('CloudinaryService', 'Detected Cloudinary URL', { publicId, resType });

      if (!publicId) {
        logger.warn('CloudinaryService', 'Could not extract publicId from Cloudinary URL — skipping delete', { url });
        return;
      }

      await this.deleteFile(publicId, resType);
      return;
    }

    // Local file
    const uploadsRoot = this.getUploadsRoot();
    const marker  = '/uploads/';
    const index   = url.indexOf(marker);

    if (index === -1) {
      logger.warn('CloudinaryService', 'URL does not contain /uploads/ marker — cannot delete local file', { url });
      return;
    }

    const relativePath  = url.slice(index + marker.length).replace(/\//g, path.sep);
    const absolutePath  = path.join(uploadsRoot, relativePath);
    logger.step('LocalFallback', 'Deleting local file', { absolutePath });

    try {
      await fs.unlink(absolutePath);
      logger.success('LocalFallback', 'Local file deleted successfully', { absolutePath });
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        logger.warn('LocalFallback', 'Local file not found — already removed or path mismatch', { absolutePath });
      } else {
        logger.error('LocalFallback', 'Failed to delete local file', err, { absolutePath });
      }
    }
  }

  /**
   * Delete a file directly from Cloudinary by public ID.
   */
  static async deleteFile(publicId: string, resourceType: 'image' | 'raw' = 'raw'): Promise<void> {
    logger.step('CloudinaryService', 'Calling cloudinary.uploader.destroy', { publicId, resourceType });
    try {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      if (result?.result === 'ok' || result?.result === 'not found') {
        logger.success('CloudinaryService', `Cloudinary delete complete (result: ${result?.result})`, { publicId });
      } else {
        logger.warn('CloudinaryService', `Cloudinary delete returned unexpected result`, { publicId, result });
      }
    } catch (error) {
      logger.error('CloudinaryService', 'cloudinary.uploader.destroy threw an error', error, { publicId, resourceType });
      throw error;
    }
  }

  /**
   * Extract public ID from a Cloudinary URL.
   */
  static extractPublicId(url: string): string {
    const matches = url.match(/\/v\d+\/(.+?)\.(?:[a-zA-Z0-9]+)$/);
    return matches ? matches[1] : '';
  }
}
