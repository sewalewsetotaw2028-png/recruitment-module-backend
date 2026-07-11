import path from 'path';
import { Readable } from 'stream';
import { v2 as cloudinary, type ConfigOptions, type UploadApiResponse } from 'cloudinary';
import { AppError } from '../utils/AppError';

const CLOUDINARY_URI_PREFIX = 'cloudinary://raw/private/';

type CloudinaryCredentials = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

const sanitizeFileName = (name: string) =>
  name.replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, '_');

const getCloudinaryCredentials = (): CloudinaryCredentials => {
  const cloudinaryUrl = process.env.CLOUDINARY_URL?.trim();

  if (cloudinaryUrl) {
    try {
      const parsed = new URL(cloudinaryUrl);
      const cloudName = parsed.hostname.trim();
      const apiKey = decodeURIComponent(parsed.username).trim();
      const apiSecret = decodeURIComponent(parsed.password).trim();

      if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Missing credentials');
      }

      return {
        cloudName,
        apiKey,
        apiSecret,
      };
    } catch {
      throw new AppError('Invalid Cloudinary configuration in CLOUDINARY_URL.', 500);
    }
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() || '';
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim() || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() || '';

  if (!cloudName || !apiKey || !apiSecret) {
    throw new AppError(
      'Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET before uploading supporting documents.',
      500,
    );
  }

  return {
    cloudName,
    apiKey,
    apiSecret,
  };
};

const configureCloudinary = () => {
  const credentials = getCloudinaryCredentials();
  const config: ConfigOptions = {
    cloud_name: credentials.cloudName,
    api_key: credentials.apiKey,
    api_secret: credentials.apiSecret,
    secure: true,
    urlAnalytics: false,
  };

  cloudinary.config(config);
  return credentials;
};

const buildPublicId = (requestId: string, originalName: string) => {
  const extension = path.extname(originalName);
  const fileNameWithoutExtension = path.basename(originalName, extension);
  const safeBaseName = sanitizeFileName(fileNameWithoutExtension) || 'document';
  const safeExtension = sanitizeFileName(extension);

  return `recruitment-requests/${requestId}/${Date.now()}-${safeBaseName}${safeExtension}`;
};

const buildCloudinaryUri = (
  publicId: string,
  options?: { format?: string; version?: string | number },
) => {
  const encodedPublicId = encodeURIComponent(publicId);
  const searchParams = new URLSearchParams();

  if (options?.format) {
    searchParams.set('format', options.format);
  }

  if (options?.version != null && String(options.version).trim()) {
    searchParams.set('version', String(options.version));
  }

  const queryString = searchParams.toString();
  return queryString
    ? `${CLOUDINARY_URI_PREFIX}${encodedPublicId}?${queryString}`
    : `${CLOUDINARY_URI_PREFIX}${encodedPublicId}`;
};

const parseCloudinaryUri = (uri: string) => {
  if (!uri.startsWith(CLOUDINARY_URI_PREFIX)) {
    throw new AppError('Invalid Cloudinary document path.', 400);
  }

  const [encodedPublicId, queryString = ''] = uri
    .slice(CLOUDINARY_URI_PREFIX.length)
    .split('?');
  const publicId = decodeURIComponent(encodedPublicId || '');
  const searchParams = new URLSearchParams(queryString);
  const format = decodeURIComponent(searchParams.get('format') || '');
  const version = searchParams.get('version') || undefined;

  if (!publicId) {
    throw new AppError('Invalid Cloudinary document path.', 400);
  }

  return {
    publicId,
    format,
    version,
  };
};

const uploadBuffer = async (
  file: Express.Multer.File,
  publicId: string,
): Promise<UploadApiResponse> =>
  await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        type: 'private',
        public_id: publicId,
        overwrite: false,
        use_filename: false,
        unique_filename: false,
        display_name: file.originalname,
        filename_override: file.originalname,
      },
      (error, result) => {
        if (error || !result) {
          reject(
            new AppError(
              error?.message || 'Cloudinary upload failed for supporting document.',
              500,
            ),
          );
          return;
        }

        resolve(result);
      },
    );

    stream.end(file.buffer);
  });

export class CloudinaryDocumentStorageService {
  static assertConfigured() {
    configureCloudinary();
  }

  static async uploadRecruitmentDocument(
    requestId: string,
    file: Express.Multer.File,
  ) {
    this.assertConfigured();

    const publicId = buildPublicId(requestId, file.originalname);
    const result = await uploadBuffer(file, publicId);

    return {
      url: buildCloudinaryUri(result.public_id, {
        format: result.format,
        version: result.version,
      }),
      name: file.originalname,
    };
  }

  static async getDocumentStream(uri: string): Promise<{
    stream: Readable;
    contentType?: string;
  }> {
    this.assertConfigured();

    const { publicId, version } = parseCloudinaryUri(uri);

    // Generate a signed download URL using Cloudinary's private download URL method
    const downloadUrl = cloudinary.utils.private_download_url(
      publicId,
      '', // no format override — use the one embedded in the publicId
      {
        resource_type: 'raw',
        type: 'private',
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        attachment: false,
      },
    );

    const response = await fetch(downloadUrl);

    if (!response.ok) {
      if (response.status === 404) {
        throw new AppError('Supporting document file not found.', 404);
      }

      throw new AppError('Unable to retrieve supporting document from Cloudinary.', 502);
    }

    if (!response.body) {
      throw new AppError('Cloudinary returned an empty supporting document response.', 502);
    }

    return {
      stream: Readable.fromWeb(response.body as never),
      contentType: response.headers.get('content-type') || undefined,
    };
  }

  static isCloudinaryUri(uri: string) {
    return uri.startsWith(CLOUDINARY_URI_PREFIX);
  }
}
