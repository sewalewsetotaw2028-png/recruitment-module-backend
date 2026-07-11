import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { CloudinaryService } from './cloudinary.service';

type DocumentType =
  | 'cv'
  | 'photo'
  | 'id_documents';

const appendDocument = (existing: string[], url: string, documentType: DocumentType) => {
  if (documentType === 'cv' || documentType === 'photo') {
    return [url];
  }

  return [...existing, url];
};

const removeDocument = (documents: string[], target: string) =>
  documents.filter((entry) => !entry.includes(target));

export const uploadDocument = async (
  candidateId: string,
  file: Express.Multer.File,
  documentType: DocumentType = 'cv',
) => {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
  });

  if (!candidate) {
    throw new AppError('Candidate not found', 404);
  }

  const uploadedUrl = await CloudinaryService.uploadFile(
    file.buffer,
    file.originalname,
    'candidates/documents',
    'raw',
  );

  const existing = await prisma.candidateDocument.findUnique({
    where: { candidate_id: candidateId },
  });

  const doc = await prisma.candidateDocument.upsert({
    where: { candidate_id: candidateId },
    create: {
      candidate_id: candidateId,
      company_id: candidate.company_id,
      cv: documentType === 'cv' ? [uploadedUrl] : [],
      photo: documentType === 'photo' ? [uploadedUrl] : [],
      id_documents: documentType === 'id_documents' ? [uploadedUrl] : [],
    },
    update: {
      cv: appendDocument(existing?.cv ?? [], uploadedUrl, documentType),
      photo: appendDocument(existing?.photo ?? [], uploadedUrl, documentType),
      id_documents: appendDocument(existing?.id_documents ?? [], uploadedUrl, documentType),
    },
  });

  return { document: doc, uploaded_url: uploadedUrl, document_type: documentType };
};

export const getCandidateDocuments = async (candidateId: string) => {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
  });

  if (!candidate) {
    throw new AppError('Candidate not found', 404);
  }

  return prisma.candidateDocument.findUnique({
    where: { candidate_id: candidateId },
  });
};

export const deleteDocument = async (candidateId: string, fileNameOrUrl: string) => {
  const doc = await prisma.candidateDocument.findUnique({
    where: { candidate_id: candidateId },
  });

  if (!doc) {
    throw new AppError('Document not found', 404);
  }

  const updated = await prisma.candidateDocument.update({
    where: { candidate_id: candidateId },
    data: {
      cv:           removeDocument(doc.cv, fileNameOrUrl),
      photo:        removeDocument(doc.photo, fileNameOrUrl),
      id_documents: removeDocument(doc.id_documents, fileNameOrUrl),
    },
  });

  if (fileNameOrUrl.startsWith('https://res.cloudinary.com')) {
    const publicId = CloudinaryService.extractPublicId(fileNameOrUrl);
    if (publicId) {
      try {
        await CloudinaryService.deleteFile(publicId, 'raw');
      } catch {
        // Keep database state consistent even if storage cleanup fails.
      }
    }
  }

  return updated;
};

export const downloadDocument = async (candidateId: string, fileNameOrUrl: string) => {
  const doc = await prisma.candidateDocument.findUnique({
    where: { candidate_id: candidateId },
  });

  if (!doc) {
    throw new AppError('Document not found', 404);
  }

  const allDocuments = [
    ...doc.cv,
    ...doc.photo,
    ...doc.id_documents,
  ];

  const match = allDocuments.find((entry) => entry.includes(fileNameOrUrl));
  if (!match) {
    throw new AppError('Document not found', 404);
  }

  return match;
};
