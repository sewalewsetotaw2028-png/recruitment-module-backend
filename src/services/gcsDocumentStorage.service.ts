import { Readable } from 'stream';
import { Storage, type StorageOptions } from '@google-cloud/storage';
import { AppError } from '../utils/AppError';

const GCS_URI_PREFIX = 'gcs://';

const getBucketName = () => process.env.GCS_BUCKET_NAME?.trim() || '';

const buildStorageOptions = (): StorageOptions => {
  const projectId = process.env.GCS_PROJECT_ID?.trim() || undefined;
  const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() || undefined;
  const credentialsBase64 = process.env.GCS_CREDENTIALS_JSON_BASE64?.trim();

  if (!credentialsBase64) {
    return {
      projectId,
      keyFilename,
    };
  }

  try {
    const credentialsJson = Buffer.from(credentialsBase64, 'base64').toString('utf8');
    return {
      projectId,
      credentials: JSON.parse(credentialsJson),
      keyFilename,
    };
  } catch {
    throw new AppError(
      'Invalid Google Cloud Storage credentials configuration.',
      500,
    );
  }
};

const getStorage = () => new Storage(buildStorageOptions());

const sanitizeFileName = (name: string) =>
  name.replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, '_');

const parseGcsUri = (uri: string) => {
  if (!uri.startsWith(GCS_URI_PREFIX)) {
    throw new AppError('Invalid Google Cloud Storage document path.', 400);
  }

  const withoutPrefix = uri.slice(GCS_URI_PREFIX.length);
  const slashIndex = withoutPrefix.indexOf('/');

  if (slashIndex <= 0) {
    throw new AppError('Invalid Google Cloud Storage document path.', 400);
  }

  return {
    bucketName: withoutPrefix.slice(0, slashIndex),
    objectName: withoutPrefix.slice(slashIndex + 1),
  };
};

export class GcsDocumentStorageService {
  static assertConfigured() {
    if (!getBucketName()) {
      throw new AppError(
        'Google Cloud Storage is not configured. Set GCS_BUCKET_NAME and credentials before uploading supporting documents.',
        500,
      );
    }
  }

  static async uploadRecruitmentDocument(
    requestId: string,
    file: Express.Multer.File,
  ) {
    this.assertConfigured();

    const bucketName = getBucketName();
    const bucket = getStorage().bucket(bucketName);
    const safeName = sanitizeFileName(file.originalname);
    const objectName = `recruitment-requests/${requestId}/${Date.now()}-${safeName}`;
    const remoteFile = bucket.file(objectName);

    await remoteFile.save(file.buffer, {
      resumable: false,
      metadata: {
        contentType: file.mimetype || undefined,
        contentDisposition: `inline; filename="${encodeURIComponent(file.originalname)}"`,
      },
    });

    return {
      url: `${GCS_URI_PREFIX}${bucketName}/${objectName}`,
      name: file.originalname,
    };
  }

  static async getDocumentStream(uri: string): Promise<{
    stream: Readable;
    contentType?: string;
  }> {
    const { bucketName, objectName } = parseGcsUri(uri);
    const remoteFile = getStorage().bucket(bucketName).file(objectName);
    const [exists] = await remoteFile.exists();

    if (!exists) {
      throw new AppError('Supporting document file not found.', 404);
    }

    const [metadata] = await remoteFile.getMetadata();

    return {
      stream: remoteFile.createReadStream(),
      contentType: metadata.contentType,
    };
  }

  static isGcsUri(uri: string) {
    return uri.startsWith(GCS_URI_PREFIX);
  }
}
