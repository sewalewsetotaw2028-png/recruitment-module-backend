import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { PERMISSIONS } from '../config/rolePermissions';
import { CloudinaryService } from './cloudinary.service';
import { EmailService } from './email.service';
import { logger } from '../utils/logger';
import {
  CandidateRegisterDTO,
  CandidateLoginDTO,
  CandidateProfileUpdateDTO,
  ApplyVacancyDTO,
  CandidateExperienceDTO,
  CandidateExperienceUpdateDTO,
  CandidateEducationDTO,
  CandidateEducationUpdateDTO,
  CandidateCertificationDTO,
  CandidateCertificationUpdateDTO,
  CandidatePhoneDTO,
  CandidatePhoneUpdateDTO,
  CandidateAddressDTO,
  CandidateAddressUpdateDTO,
  CandidateChangePasswordDTO,
} from '../types/candidate.types';

type ScreeningCriterionRule = {
  field?: string;
  operator?: string;
  value?: unknown;
  weight?: number;
};

const flattenCandidateDocuments = (
  document:
    | {
        cv?: string[];
        certificates?: string[];
        photo?: string[];
        experience_letters?: string[];
        national_id?: string[];
      }
    | null
    | undefined,
) => {
  if (!document) return [];

  const groups: Array<[string, string[] | undefined]> = [
    ['CV', document.cv],
    ['Certificate', document.certificates],
    ['Photo', document.photo],
    ['Experience Letter', document.experience_letters],
    ['National ID', document.national_id],
  ];

  return groups.flatMap(([label, urls]) =>
    (urls || []).map((url, index) => ({
      id: `${label.toLowerCase().replace(/\s+/g, '_')}-${index + 1}`,
      name: `${label} ${index + 1}`,
      type: label.toLowerCase().replace(/\s+/g, '_'),
      file_url: url,
    })),
  );
};

const calculateExperienceMonths = (
  experiences: Array<{ start_date: Date; end_date: Date | null }>,
) =>
  experiences.reduce((total, experience) => {
    const start = new Date(experience.start_date);
    const end = experience.end_date
      ? new Date(experience.end_date)
      : new Date();
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());
    return total + Math.max(0, months);
  }, 0);

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

/**
 * Normalize a degree string to a canonical form so that
 * "BACHELOR", "bachelor's degree", "Bachelor of Science" all match "Bachelor's Degree"
 */
const normalizeDegree = (raw: string): string => {
  const t = raw.trim().toLowerCase();
  if (t.startsWith('phd') || t.startsWith('doctor') || t === 'ph.d') return "phd";
  if (t.startsWith("master") || t === 'msc' || t === 'mba' || t === 'ma' || t === 'ms') return "master's degree";
  if (t.startsWith("bachelor") || t === 'bsc' || t === 'ba' || t === 'bs') return "bachelor's degree";
  if (t.startsWith("associate")) return "associate's degree";
  if (t.startsWith("high school") || t === 'diploma') return "high school";
  if (t.startsWith("professional cert")) return "professional certificate";
  return t;
};

/**
 * True if every token in `expectedTokens` is found in `actualTokens` (case-insensitive, trimmed).
 * Handles comma/space separated lists like "TypeScript, React" vs "TypeScript, Node.js, React"
 */
const isSubsetMatch = (expected: unknown, actual: string): boolean => {
  const expectedStr = normalizeText(expected);
  const actualStr = normalizeText(actual);
  if (!expectedStr) return actualStr.length > 0;
  const expectedTokens = expectedStr.split(',').map((v) => v.trim()).filter(Boolean);
  const actualTokens = actualStr.split(',').map((v) => v.trim()).filter(Boolean);
  if (expectedTokens.length === 0) return true;
  return expectedTokens.every((et) =>
    actualTokens.some((at) => at === et || at.includes(et) || et.includes(at)),
  );
};

const evaluateCriterion = (
  criterion: ScreeningCriterionRule,
  context: {
    candidate: {
      years_of_experience: number | null;
      skills: string[];
      languages: string[];
      preferred_location: string | null;
      current_address: string | null;
      expected_salary: unknown;
      availability_status: string;
      certifications: Array<{ name: string | null }>;
      educations: Array<{ degree: string; field_of_study: string }>;
      experiences: Array<{ start_date: Date; end_date: Date | null }>;
    };
    documents: Array<{ name: string; type: string }>;
  },
) => {
  const weight = Number(criterion.weight ?? 0);
  const field = normalizeText(criterion.field);
  const operator = normalizeText(criterion.operator || 'required');
  const expected = criterion.value;

  const totalMonths =
    context.candidate.years_of_experience != null
      ? Number(context.candidate.years_of_experience) * 12
      : calculateExperienceMonths(context.candidate.experiences);
  const totalYears = totalMonths / 12;
  const documentNames = context.documents
    .map((document) => document.name)
    .join(', ');
  const certifications = context.candidate.certifications
    .map((certification) => certification.name || '')
    .filter(Boolean)
    .join(', ');
  // Normalize degrees for comparison (e.g. BACHELOR → bachelor's degree)
  const normalizedDegrees = context.candidate.educations
    .map((edu) => normalizeDegree(edu.degree))
    .filter(Boolean);
  const educationDegrees = normalizedDegrees.join(', ');
  const educationSummary = context.candidate.educations
    .map((education) =>
      `${education.degree} ${education.field_of_study}`.trim(),
    )
    .filter(Boolean)
    .join(', ');
  const fieldOfStudy = context.candidate.educations
    .map((edu) => edu.field_of_study)
    .filter(Boolean)
    .join(', ');

  const actualValueByField: Record<string, string | number | boolean> = {
    'educational qualification': educationDegrees,
    'field of study': fieldOfStudy,
    'relevant work experience': totalYears,
    'professional certification': certifications,
    'technical skills': context.candidate.skills.join(', '),
    'language proficiency': context.candidate.languages.join(', '),
    'communication skills': '',
    availability: context.candidate.availability_status,
    'salary expectation':
      context.candidate.expected_salary == null
        ? ''
        : String(context.candidate.expected_salary),
    'location requirement':
      context.candidate.preferred_location ||
      context.candidate.current_address ||
      '',
    'document completeness': documentNames,
  };

  const actualValue =
    actualValueByField[field] ??
    actualValueByField[normalizeText(String(criterion.field ?? ''))] ??
    '';

  let met = false;
  if (operator === 'min_years') {
    met = Number(actualValue) >= Number(expected ?? 0);
  } else if (operator === 'max_salary') {
    // Candidate's expected_salary must be within budget (≤ configured max)
    const candidateSalary = Number(context.candidate.expected_salary ?? 0);
    const budgetMax = Number(expected ?? 0);
    met = budgetMax > 0 && candidateSalary > 0 && candidateSalary <= budgetMax;
  } else if (operator === 'equals') {
    // For educational qualification: normalize expected degree before comparing
    if (field === 'educational qualification') {
      const normalizedExpected = normalizeDegree(normalizeText(expected));
      const actualDegrees = String(actualValue)
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);
      met = actualDegrees.some(
        (d) => d === normalizedExpected || d.includes(normalizedExpected) || normalizedExpected.includes(d),
      );
    } else {
      // Subset match — works for comma-separated lists (skills, languages, etc.)
      met = isSubsetMatch(expected, String(actualValue));
    }
  } else if (operator === 'contains') {
    // Subset match — "TypeScript,React" is contained in "TypeScript, Node.js, React"
    met = isSubsetMatch(expected, String(actualValue));
  } else {
    // 'required' — just check non-empty; if a value is specified also subset-match it
    met = normalizeText(actualValue).length > 0;
    if (
      expected !== undefined &&
      expected !== null &&
      String(expected).trim() !== ''
    ) {
      met = met && isSubsetMatch(expected, String(actualValue));
    }
  }

  // For the displayed actual_value, use the full "degree field_of_study" format
  const displayActualValue = field === 'educational qualification'
    ? educationSummary || actualValue
    : actualValue;

  return {
    field: criterion.field || '',
    operator: criterion.operator || 'required',
    value: expected,
    weight,
    met,
    score: met ? weight : 0,
    actual_value: displayActualValue,
  };
};

const computeFallbackScore = (context: {
  candidate: {
    years_of_experience: number | null;
    skills: string[];
    educations: Array<unknown>;
  };
  documents: Array<unknown>;
}) => {
  const factors = [
    context.candidate.skills.length > 0,
    context.candidate.educations.length > 0,
    context.documents.length > 0,
    (context.candidate.years_of_experience ?? 0) > 0,
  ];
  const matched = factors.filter(Boolean).length;
  return Math.round((matched / factors.length) * 100);
};

export class CandidateService {
  // ─── Authentication ──────────────────────────────────────────────────────────

  static async register(data: CandidateRegisterDTO) {
    const existing = await prisma.candidate.findUnique({
      where: { email: data.email },
    });
    if (existing) throw new AppError('Email already registered', 400);

    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Resolve company: use provided company_id or find/create a default one
    let company_id: number;
    if (data.company_id) {
      company_id = Number(data.company_id);
    } else {
      const existingCompany = await prisma.company.findFirst({
        select: { id: true },
      });
      if (existingCompany) {
        company_id = existingCompany.id;
      } else {
        // Create a default company if none exists (same pattern as AuthService.register)
        const defaultCode = 'ACME' + Math.floor(1000 + Math.random() * 9000);
        const company = await prisma.company.create({
          data: {
            name: 'Acme Corp',
            email: 'admin@acme.com',
            company_code: defaultCode,
          },
        });
        company_id = company.id;
      }
    }

    // Generate email verification token
    const emailToken = crypto.randomBytes(32).toString('hex');
    const expiryHours = parseInt(
      process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS || '24',
      10,
    );
    const tokenExpires = new Date(
      Date.now() + expiryHours * 60 * 60 * 1000,
    );

    const candidate = await prisma.candidate.create({
      data: {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        password_hash: hashedPassword,
        company_id,
        terms_accepted: data.terms_accepted ?? false,
        email_verification_token: emailToken,
        email_verification_expires: tokenExpires,
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        email_verification_token: true,
      },
    });

    // Send verification email asynchronously (non-blocking)
    const frontendUrl =
      process.env.FRONTEND_URL || 'http://localhost:5173';
    const verificationUrl = `${frontendUrl}/verify-email/${emailToken}?type=candidate`;
    const appName = process.env.APP_NAME || 'Recruitment Portal';

    EmailService.sendEmail({
      to: candidate.email,
      subject: 'Verify your email address',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify your email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${candidate.first_name}</strong>,</p>
              <p>Thank you for creating an account with ${appName}. Please verify your email address by clicking the button below:</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="cta-button">Verify Email Address</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; font-size: 12px; color: #667eea;">${verificationUrl}</p>
              <p>This link will expire in ${expiryHours} hours.</p>
              <p>If you did not create this account, please ignore this email.</p>
              <p>Best regards,<br>${appName} Team</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    }).catch((err) => {
      // Log and swallow — registration succeeded regardless
      console.error('Failed to send verification email:', err);
    });

    return {
      id: candidate.id,
      email: candidate.email,
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      is_email_verified: false,
    };
  }

  static async login(data: CandidateLoginDTO) {
    const candidate = await prisma.candidate.findUnique({
      where: { email: data.email },
    });
    if (
      !candidate ||
      !(await bcrypt.compare(data.password, candidate.password_hash))
    ) {
      throw new AppError('Invalid credentials', 401);
    }

    const jwtSecret =
      process.env.JWT_SECRET ||
      (process.env.NODE_ENV === 'production' ? '' : 'dev-jwt-secret');
    if (!jwtSecret) throw new AppError('JWT secret is not configured.', 500);

    const token = jwt.sign(
      {
        id: candidate.id,
        company_id: candidate.company_id,
        role: 'candidate',
        candidate_id: candidate.id,
      },
      jwtSecret,
      { expiresIn: '7d' },
    );

    return {
      token,
      user: {
        id: candidate.id,
        email: candidate.email,
        company_id: candidate.company_id,
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        role: 'candidate',
        permissions: [PERMISSIONS.CANDIDATE_APPLICATION_READ],
        is_email_verified: candidate.is_email_verified,
      },
    };
  }

  // ─── Profile ─────────────────────────────────────────────────────────────────

  static async getApplicationsForCompany(
    company_id: string,
    additionalFilters?: Record<string, unknown>,
  ) {
    const numericCompanyId = Number(company_id);
    const whereClause: Record<string, unknown> = {
      company_id: numericCompanyId,
      ...additionalFilters,
    };
    const applications = await prisma.application.findMany({
      where: whereClause,
      include: {
        candidate: {
          include: {
            candidate_document: true,
            experiences: true,
            educations: true,
            certifications: true,
          },
        },
        vacancy: {
          include: {
            department: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { submitted_at: 'desc' },
    });

    const vacancyIds = Array.from(
      new Set(applications.map((application) => application.vacancy_id)),
    );
    const candidateIds = Array.from(
      new Set(applications.map((application) => application.candidate_id)),
    );

    const [criteriaRows, screeningLogs] = await Promise.all([
      prisma.screeningCriteria.findMany({
        where: {
          company_id: numericCompanyId,
          is_active: true,
          OR: [{ vacancy_id: { in: vacancyIds } }, { vacancy_id: null }],
        },
        orderBy: { updated_at: 'desc' },
      }),
      prisma.screeningLog.findMany({
        where: {
          vacancy_id: { in: vacancyIds },
          candidate_id: { in: candidateIds },
        },
        orderBy: { screened_at: 'desc' },
      }),
    ]);

    const criteriaByVacancy = new Map<string, (typeof criteriaRows)[number]>();
    let sharedCriteria: (typeof criteriaRows)[number] | null = null;

    for (const criteria of criteriaRows) {
      if (!criteria.vacancy_id && !sharedCriteria) {
        sharedCriteria = criteria;
      }

      if (criteria.vacancy_id && !criteriaByVacancy.has(criteria.vacancy_id)) {
        criteriaByVacancy.set(criteria.vacancy_id, criteria);
      }
    }

    const latestLogByPair = new Map<string, (typeof screeningLogs)[number]>();
    for (const log of screeningLogs) {
      const key = `${log.candidate_id}:${log.vacancy_id}`;
      if (!latestLogByPair.has(key)) {
        latestLogByPair.set(key, log);
      }
    }

    return applications.map((application) => {
      const flattenedDocuments = flattenCandidateDocuments(
        application.candidate.candidate_document,
      );
      const activeCriteria =
        criteriaByVacancy.get(application.vacancy_id) || sharedCriteria;
      const criteriaJson = Array.isArray(activeCriteria?.criteria_json)
        ? (activeCriteria?.criteria_json as ScreeningCriterionRule[])
        : [];

      const evaluatedCriteria = criteriaJson.map((criterion) =>
        evaluateCriterion(criterion, {
          candidate: application.candidate,
          documents: flattenedDocuments,
        }),
      );

      const totalWeight = evaluatedCriteria.reduce(
        (sum, criterion) => sum + Number(criterion.weight || 0),
        0,
      );
      const earnedWeight = evaluatedCriteria.reduce(
        (sum, criterion) => sum + Number(criterion.score || 0),
        0,
      );

      const latestLog = latestLogByPair.get(
        `${application.candidate_id}:${application.vacancy_id}`,
      );

      const matchScore =
        totalWeight > 0
          ? Math.round((earnedWeight / totalWeight) * 100)
          : computeFallbackScore({
              candidate: application.candidate,
              documents: flattenedDocuments,
            });

      return {
        id: application.id,
        company_id: application.company_id,
        candidate_id: application.candidate_id,
        vacancy_id: application.vacancy_id,
        status: application.status,
        current_stage: application.current_stage,
        submitted_at: application.submitted_at,
        rejection_reason: application.rejection_reason,
        match_score: matchScore,
        screening_comments:
          application.status === 'REJECTED'
            ? undefined
            : latestLog?.reason || undefined,
        candidate: {
          id: application.candidate.id,
          first_name: application.candidate.first_name,
          last_name: application.candidate.last_name,
          email: application.candidate.email,
          phone: application.candidate.phone,
          current_position: application.candidate.current_position,
          years_of_experience: application.candidate.years_of_experience,
          skills: application.candidate.skills,
          languages: application.candidate.languages,
          experiences: application.candidate.experiences,
          educations: application.candidate.educations,
          documents: flattenedDocuments,
        },
        vacancy: {
          id: application.vacancy.id,
          title: application.vacancy.title,
          location: application.vacancy.location,
          employment_type: application.vacancy.employment_type,
          department_name: application.vacancy.department.name,
        },
        screening_criteria: evaluatedCriteria,
        screening_log: latestLog
          ? {
              id: latestLog.id,
              status: latestLog.status,
              reason: latestLog.reason,
              screened_at: latestLog.screened_at,
              scores_json: latestLog.scores_json,
            }
          : null,
      };
    });
  }

  // 5. Add Candidate Document
  static async addDocument(candidate_id: string, file: Express.Multer.File, documentType: 'cv' | 'photo' | 'id_documents') {
    // Verify candidate exists
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidate_id },
    });
    if (!candidate) {
      throw new AppError('Candidate not found', 404);
    }
    
    const fileUrl = `/uploads/${file.filename}`;
    
    // Update the appropriate document array
    const updateData: Record<string, unknown> = {
      candidate_id: candidate_id,
      company_id: candidate.company_id,
    };
    
    if (documentType === 'cv') {
      updateData.cv = { push: fileUrl };
    } else if (documentType === 'photo') {
      updateData.photo = { push: fileUrl };
    } else if (documentType === 'id_documents') {
      updateData.id_documents = { push: fileUrl };
    }
    
    return await prisma.candidateDocument.upsert({
      where: { candidate_id_company_id: { candidate_id, company_id: candidate.company_id } },
      update: updateData,
      create: {
        candidate_id: candidate_id,
        company_id: candidate.company_id,
        cv: documentType === 'cv' ? [fileUrl] : [],
        photo: documentType === 'photo' ? [fileUrl] : [],
        id_documents: documentType === 'id_documents' ? [fileUrl] : [],
      },
    });
  }

  // 7. Get Candidate Profile (including experiences, educations, documents)

  static async getProfile(candidate_id: string) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidate_id },
      include: {
        candidate_document: true,
        educations: { orderBy: { graduation_year: 'desc' } },
        experiences: { orderBy: { start_date: 'desc' } },
        certifications: { orderBy: { created_at: 'desc' } },
        addresses: true,
        phones: true,
        talent_rosters: {
          select: {
            id: true,
            status: true,
            talent_category: true,
            added_at: true,
          },
          orderBy: { added_at: 'desc' },
          take: 1,
        },
      },
    });
    if (!candidate) throw new AppError('Candidate not found', 404);
    return candidate;
  }

  static async getCandidateById(candidate_id: string, company_id: number) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidate_id },
      include: {
        candidate_document: true,
        educations: { orderBy: { graduation_year: 'desc' } },
        experiences: { orderBy: { start_date: 'desc' } },
        certifications: { orderBy: { created_at: 'desc' } },
        addresses: true,
        phones: true,
        talent_rosters: {
          where: { company_id },
          select: {
            id: true,
            status: true,
            talent_category: true,
            added_at: true,
          },
          orderBy: { added_at: 'desc' },
          take: 1,
        },
      },
    });
    if (!candidate) throw new AppError('Candidate not found', 404);
    return candidate;
  }

  static async updateProfile(
    candidate_id: string,
    data: CandidateProfileUpdateDTO,
  ) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidate_id },
    });
    if (!candidate) throw new AppError('Candidate not found', 404);

    return await prisma.candidate.update({
      where: { id: candidate_id },
      data: {
        ...(data.first_name !== undefined && { first_name: data.first_name }),
        ...(data.last_name !== undefined && { last_name: data.last_name }),
        ...(data.gender !== undefined && { gender: data.gender }),
        ...(data.date_of_birth !== undefined && {
          date_of_birth: new Date(data.date_of_birth),
        }),
        ...(data.nationality !== undefined && {
          nationality: data.nationality,
        }),
        ...(data.years_of_experience !== undefined && {
          years_of_experience: data.years_of_experience,
        }),
        ...(data.current_employer !== undefined && {
          current_employer: data.current_employer,
        }),
        ...(data.current_position !== undefined && {
          current_position: data.current_position,
        }),
        ...(data.skills !== undefined && { skills: data.skills }),
        ...(data.languages !== undefined && { languages: data.languages }),
        ...(data.portfolio_url !== undefined && {
          portfolio_url: data.portfolio_url,
        }),
        ...(data.preferred_job_category !== undefined && {
          preferred_job_category: data.preferred_job_category,
        }),
        ...(data.preferred_location !== undefined && {
          preferred_location: data.preferred_location,
        }),
        ...(data.expected_salary !== undefined && {
          expected_salary: data.expected_salary,
        }),
        ...(data.availability_status !== undefined && {
          availability_status: data.availability_status,
        }),
        ...(data.remarks !== undefined && { remarks: data.remarks }),
      },
    });
  }

  /** Remove the candidate's profile picture entirely */
  static async deleteAvatar(candidate_id: string) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidate_id },
    });
    if (!candidate) throw new AppError('Candidate not found', 404);

    await prisma.candidateDocument.upsert({
      where: { candidate_id },
      create: {
        candidate_id,
        company_id: candidate.company_id,
        photo: [],
      },
      update: { photo: [] },
    });
    return { message: 'Profile photo removed successfully' };
  }

  /** Upload or update the candidate's profile picture */
  static async uploadAvatar(candidate_id: string, file: Express.Multer.File) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidate_id },
    });
    if (!candidate) throw new AppError('Candidate not found', 404);

    // Upload to Cloudinary with fallback to local storage
    let cloudinaryUrl: string;
    try {
      cloudinaryUrl = await CloudinaryService.uploadFile(
        file.buffer,
        file.originalname,
        'candidates/avatars',
        'image',
      );
    } catch (uploadError) {
      console.error(
        '[uploadAvatar] Cloudinary upload failed:',
        uploadError,
      );
      throw new AppError('Failed to upload avatar', 500);
    }

    // Store the URL on the CandidateDocument record for this candidate
    await prisma.candidateDocument.upsert({
      where: { candidate_id },
      create: {
        candidate_id,
        company_id: candidate.company_id,
        photo: [cloudinaryUrl],
      },
      update: { photo: [cloudinaryUrl] },
    });
    return { photo_url: cloudinaryUrl };
  }

  /** Change the candidate's password after verifying the current one */
  static async changePassword(
    candidate_id: string,
    data: CandidateChangePasswordDTO,
  ) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidate_id },
    });
    if (!candidate) throw new AppError('Candidate not found', 404);

    const valid = await bcrypt.compare(
      data.current_password,
      candidate.password_hash,
    );
    if (!valid) throw new AppError('Current password is incorrect', 400);

    const hashed = await bcrypt.hash(data.new_password, 12);
    await prisma.candidate.update({
      where: { id: candidate_id },
      data: { password_hash: hashed },
    });
    return { message: 'Password updated successfully' };
  }

  // ─── Profile Completeness ─────────────────────────────────────────────────────

  /**
   * Returns an overall percentage and per-section breakdown.
   * Sections are: personal info, experience, education, skills, languages, resume, certifications.
   */
  static async getProfileCompleteness(candidate_id: string) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidate_id },
      include: {
        candidate_document: true,
        educations: true,
        experiences: true,
        certifications: true,
        phones: true,
        addresses: true,
      },
    });
    if (!candidate) throw new AppError('Candidate not found', 404);

    const doc = candidate.candidate_document;

    const sections = [
      {
        key: 'photo',
        label: 'Profile photo',
        path: '/candidate/profile',
        complete: Boolean(doc?.photo && doc.photo.length > 0),
      },
      {
        key: 'contact',
        label: 'Primary contact',
        path: '/candidate/profile',
        complete: Boolean(candidate.phone || candidate.phones.length > 0),
      },
      {
        key: 'identity',
        label: 'Identity details',
        path: '/candidate/profile',
        complete: Boolean(
          candidate.gender || candidate.date_of_birth || candidate.nationality,
        ),
      },
      {
        key: 'location',
        label: 'Address',
        path: '/candidate/profile',
        complete: Boolean(
          candidate.current_address || candidate.addresses.length > 0,
        ),
      },
      {
        key: 'employment',
        label: 'Employment profile',
        path: '/candidate/profile',
        complete: Boolean(
          candidate.current_position ||
          candidate.current_employer ||
          candidate.years_of_experience,
        ),
      },
      {
        key: 'summary',
        label: 'Professional summary',
        path: '/candidate/profile',
        complete: Boolean(
          typeof candidate.remarks === 'string' &&
          candidate.remarks.trim().length > 0,
        ),
      },
      {
        key: 'experience',
        label: 'Work history',
        path: '/candidate/profile?tab=experience',
        complete: candidate.experiences.length > 0,
      },
      {
        key: 'education',
        label: 'Education',
        path: '/candidate/profile?tab=education',
        complete: candidate.educations.length > 0,
      },
      {
        key: 'skills',
        label: 'Skills',
        path: '/candidate/profile',
        complete: Array.isArray(candidate.skills)
          ? candidate.skills.length > 0
          : typeof candidate.skills === 'string' &&
            (candidate.skills as string).trim().length > 0,
      },
      {
        key: 'languages',
        label: 'Languages',
        path: '/candidate/profile',
        complete: Array.isArray(candidate.languages)
          ? candidate.languages.length > 0
          : typeof candidate.languages === 'string' &&
            (candidate.languages as string).trim().length > 0,
      },
      {
        key: 'documents',
        label: 'Documents',
        path: '/candidate/profile?tab=documents',
        complete: Boolean(
          doc &&
          (doc.cv.length > 0 ||
            doc.photo.length > 0 ||
            doc.id_documents.length > 0),
        ),
      },
      {
        key: 'certifications',
        label: 'Certifications',
        path: '/candidate/profile',
        complete: candidate.certifications.length > 0,
      },
      {
        key: 'preferences',
        label: 'Job preferences',
        path: '/candidate/profile',
        complete: Boolean(
          candidate.preferred_job_category ||
          candidate.preferred_location ||
          candidate.expected_salary ||
          candidate.availability_status,
        ),
      },
    ];

    const completedCount = sections.filter((s) => s.complete).length;
    const percentage =
      sections.length > 0
        ? Math.round((completedCount / sections.length) * 100)
        : 0;

    const missing = sections
      .filter((s) => !s.complete)
      .map((s) => ({
        key: s.key,
        label: s.label,
        path: s.path,
        optional: false,
      }));

    return { percentage, sections, missing };
  }

  // ─── Published Vacancies ──────────────────────────────────────────────────────

  /**
   * Returns only PUBLISHED vacancies visible to candidates.
   * Supports server-side keyword, department, and employment type filtering plus pagination.
   */
  static async getPublishedVacancies(
    company_id: number,
    params: {
      keyword?: string;
      department_id?: number;
      employment_type?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      company_id,
      posting_status: 'PUBLISHED',
      status: { in: ['OPEN', 'PUBLISHED', 'IN_PROGRESS'] },
    };
    if (params.keyword) {
      where.OR = [
        { title: { contains: params.keyword, mode: 'insensitive' } },
        { description: { contains: params.keyword, mode: 'insensitive' } },
      ];
    }
    if (params.department_id) where.department_id = params.department_id;
    if (params.employment_type) where.employment_type = params.employment_type;

    const [vacancies, total] = await Promise.all([
      prisma.vacancy.findMany({
        where,
        select: {
          id: true,
          title: true,
          location: true,
          employment_type: true,
          description: true,
          responsibilities: true,
          requirements: true,
          required_qualifications: true,
          required_experience: true,
          posting_status: true,
          posted_at: true,
          closing_date: true,
          department: { select: { id: true, name: true } },
        },
        orderBy: { posted_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.vacancy.count({ where }),
    ]);

    return {
      vacancies,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  /**
   * Returns a single published vacancy for candidates plus a `has_applied` flag.
   */
  static async getPublishedVacancyDetail(
    vacancy_id: string,
    candidate_id: string,
  ) {
    const vacancy = await prisma.vacancy.findUnique({
      where: { id: vacancy_id },
      include: {
        department: { select: { id: true, name: true } },
        job_description: { select: { summary: true, qualifications: true } },
      },
    });
    if (!vacancy || vacancy.posting_status !== 'PUBLISHED') {
      throw new AppError('Vacancy not found or not available', 404);
    }

    const existing = await prisma.application.findFirst({
      where: { vacancy_id, candidate_id },
      select: { id: true },
    });

    return { ...vacancy, has_applied: !!existing };
  }

  // ─── Applications ─────────────────────────────────────────────────────────────

  /** Submits a new application with full validation */
  static async submitApplication(
    candidate_id: string,
    company_id: number,
    data: ApplyVacancyDTO,
  ) {
    const vacancy = await prisma.vacancy.findUnique({
      where: { id: data.vacancy_id },
    });
    if (!vacancy) throw new AppError('Vacancy not found', 404);
    if (vacancy.posting_status !== 'PUBLISHED') {
      throw new AppError('This vacancy is not open for applications', 400);
    }
    if (vacancy.closing_date && new Date() > vacancy.closing_date) {
      throw new AppError(
        'The application deadline for this vacancy has passed',
        400,
      );
    }

    const existing = await prisma.application.findFirst({
      where: { candidate_id, vacancy_id: data.vacancy_id },
    });
    if (existing)
      throw new AppError('You have already applied for this position', 400);

    const application = await prisma.application.create({
      data: {
        company_id,
        candidate_id,
        vacancy_id: data.vacancy_id,
        cover_letter_url: data.cover_letter_url || null,
        cover_letter_text: data.cover_letter_text || null,
        expected_salary: data.expected_salary,
        recruitment_source_id: data.recruitment_source_id,
        status: 'SUBMITTED',
        current_stage: 'SCREENING',
      },
    });

    // Record the initial stage history entry
    await prisma.applicationStageHistory.create({
      data: {
        application_id: application.id,
        to_stage: 'SCREENING',
        notes: 'Application submitted',
      },
    });

    // Fire-and-forget notification to candidate
    setImmediate(async () => {
      try {
        const { notifyApplicationReceived, notifyNewApplicationToHR } = await import('../utils/notificationWiring');
        const candidate = await prisma.candidate.findUnique({ where: { id: candidate_id } });
        const candidateName = candidate ? `${candidate.first_name} ${candidate.last_name}`.trim() : 'Candidate';
        const company = await prisma.company.findUnique({ where: { id: company_id } });
        await notifyApplicationReceived(
          company_id,
          candidate_id,
          candidateName,
          vacancy.title,
          company?.name || 'Company',
          application.id,
        );
        // Notify HR/recruiter users with application:screen permission
        await notifyNewApplicationToHR(
          company_id,
          candidateName,
          vacancy.title,
          application.id,
        );
      } catch (e) { /* swallow */ }
    });

    return application;
  }

  /** Returns all applications for the authenticated candidate */
  static async getApplications(candidate_id: string) {
    return await prisma.application.findMany({
      where: { candidate_id },
      include: {
        vacancy: {
          select: {
            id: true,
            title: true,
            location: true,
            employment_type: true,
            department: { select: { id: true, name: true } },
          },
        },
        stage_histories: {
          orderBy: { changed_at: 'desc' },
          take: 1,
          select: { to_stage: true, changed_at: true },
        },
      },
      orderBy: { submitted_at: 'desc' },
    });
  }

  /** Returns single application detail with full stage history */
  static async getApplicationById(
    candidate_id: string,
    application_id: string,
  ) {
    const application = await prisma.application.findUnique({
      where: { id: application_id },
      include: {
        vacancy: {
          select: {
            id: true,
            title: true,
            location: true,
            employment_type: true,
            description: true,
            responsibilities: true,
            requirements: true,
            required_qualifications: true,
            department: { select: { id: true, name: true } },
          },
        },
        stage_histories: {
          orderBy: { changed_at: 'asc' },
        },
      },
    });
    if (!application || application.candidate_id !== candidate_id) {
      throw new AppError('Application not found or unauthorized', 404);
    }
    return application;
  }

  // ─── Interviews ───────────────────────────────────────────────────────────────

  /** Returns all interviews linked to this candidate's applications, ordered upcoming first */
  static async getCandidateInterviews(candidate_id: string) {
    const applications = await prisma.application.findMany({
      where: { candidate_id },
      select: { id: true },
    });
    const applicationIds = applications.map((a) => a.id);

    return await prisma.interview.findMany({
      where: { application_id: { in: applicationIds } },
      include: {
        application: {
          select: {
            vacancy: {
              select: { title: true, department: { select: { name: true } } },
            },
          },
        },
        interview_category: { select: { id: true, name: true } },
        interview_panels: {
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { start_time: 'asc' },
    });
  }

  // ─── Offers ──────────────────────────────────────────────────────────────────

  static async getCandidateOffers(candidate_id: string) {
    return await prisma.offer.findMany({
      where: { candidate_id },
      include: {
        application: {
          select: {
            vacancy: {
              select: {
                id: true,
                title: true,
                location: true,
                department: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /** Accept a SENT offer — validates ownership, not expired, not already responded */
  static async acceptOffer(candidate_id: string, offer_id: string) {
    const offer = await prisma.offer.findUnique({ where: { id: offer_id } });
    if (!offer || offer.candidate_id !== candidate_id) {
      throw new AppError('Offer not found or unauthorized', 404);
    }
    if (offer.status !== 'SENT') {
      throw new AppError(
        offer.status === 'EXPIRED'
          ? 'This offer has expired and can no longer be accepted'
          : 'This offer has already been responded to',
        400,
      );
    }
    if (new Date() > offer.expiry_date) {
      // Mark expired first
      await prisma.offer.update({
        where: { id: offer_id },
        data: { status: 'EXPIRED' },
      });
      throw new AppError('This offer has expired', 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.offer.update({
        where: { id: offer_id },
        data: { status: 'ACCEPTED', accepted_at: new Date() },
      });
      await tx.application.update({
        where: { id: offer.application_id },
        data: { status: 'OFFER_ACCEPTED' },
      });
      return upd;
    });

    // Fire-and-forget notification to HR
    setImmediate(async () => {
      try {
        const { notifyOfferAccepted } = await import('../utils/notificationWiring');
        const candidate = await prisma.candidate.findUnique({
          where: { id: candidate_id },
          select: { first_name: true, last_name: true },
        });
        const appWithVacancy = await prisma.application.findUnique({
          where: { id: offer.application_id },
          include: { vacancy: { select: { title: true } } },
        });
        const candidateName = candidate ? `${candidate.first_name} ${candidate.last_name}`.trim() : 'Candidate';
        const vacancyTitle = appWithVacancy?.vacancy?.title || 'a position';
        await notifyOfferAccepted(
          offer.company_id,
          offer.created_by_user_id,
          candidateName,
          vacancyTitle,
        );
      } catch (e) { /* swallow */ }
    });

    return updated;
  }

  /** Decline a SENT offer */
  static async declineOffer(
    candidate_id: string,
    offer_id: string,
    reason?: string,
  ) {
    const offer = await prisma.offer.findUnique({
      where: { id: offer_id },
      include: {
        application: {
          select: {
            id: true,
            vacancy_id: true,
          },
        },
      },
    });
    if (!offer || offer.candidate_id !== candidate_id) {
      throw new AppError('Offer not found or unauthorized', 404);
    }
    if (offer.status !== 'SENT') {
      throw new AppError(
        offer.status === 'EXPIRED'
          ? 'This offer has expired'
          : 'This offer has already been responded to',
        400,
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.offer.update({
        where: { id: offer_id },
        data: {
          status: 'DECLINED',
          rejected_at: new Date(),
          declined_reason: reason,
        },
      });
      await tx.application.update({
        where: { id: offer.application_id },
        data: { status: 'OFFER_DECLINED' },
      });

      const hiringMinute = await tx.hiringMinute.findUnique({
        where: { vacancy_id: offer.application.vacancy_id },
        select: { id: true },
      });

      if (hiringMinute) {
        await tx.hiringMinute.update({
          where: { id: hiringMinute.id },
          data: {
            final_decision: 'RETURNED_FOR_FURTHER_REVIEW',
            approved_by_id: null,
            approved_at: null,
            decision_remarks:
              reason?.trim() ||
              'An issued offer was declined. The hiring minute requires review before the next selection decision.',
          },
        });
        await tx.hiringMinuteSignatory.deleteMany({
          where: { hiring_minute_id: hiringMinute.id },
        });
      }

      await tx.vacancy.update({
        where: { id: offer.application.vacancy_id },
        data: {
          status: 'IN_PROGRESS',
        },
      });

      return upd;
    });

    // Fire-and-forget notification to HR
    setImmediate(async () => {
      try {
        const { notifyOfferDeclined } = await import('../utils/notificationWiring');
        const candidate = await prisma.candidate.findUnique({
          where: { id: candidate_id },
          select: { first_name: true, last_name: true },
        });
        const appWithVacancy = await prisma.application.findUnique({
          where: { id: offer.application_id },
          include: { vacancy: { select: { title: true } } },
        });
        const candidateName = candidate ? `${candidate.first_name} ${candidate.last_name}`.trim() : 'Candidate';
        const vacancyTitle = appWithVacancy?.vacancy?.title || 'a position';
        await notifyOfferDeclined(
          offer.company_id,
          offer.created_by_user_id,
          candidateName,
          vacancyTitle,
        );
      } catch (e) { /* swallow */ }
    });

    return updated;
  }

  // ─── Notifications ────────────────────────────────────────────────────────────

  static async getNotifications(candidate_id: string) {
    return await prisma.notification.findMany({
      where: { candidate_id },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  static async markNotificationRead(
    candidate_id: string,
    notification_id: string,
  ) {
    const notif = await prisma.notification.findUnique({
      where: { id: notification_id },
    });
    if (!notif || notif.candidate_id !== candidate_id) {
      throw new AppError('Notification not found or unauthorized', 404);
    }
    return await prisma.notification.update({
      where: { id: notification_id },
      data: { is_read: true, read_at: new Date() },
    });
  }

  static async markAllNotificationsRead(candidate_id: string) {
    await prisma.notification.updateMany({
      where: { candidate_id, is_read: false },
      data: { is_read: true, read_at: new Date() },
    });
    return { message: 'All notifications marked as read' };
  }

  // ─── Documents ────────────────────────────────────────────────────────────────

  /**
   * Upserts the CandidateDocument record and appends the uploaded file URL
   * to the appropriate array (cv, photo, id_documents) based on document_type.
   */
  static async uploadDocument(
    candidate_id: string,
    company_id: number,
    file: Express.Multer.File,
    document_type: string,
  ) {
    logger.info('CandidateService.uploadDocument', 'Starting document upload', {
      candidate_id,
      company_id,
      document_type,
      originalname: file.originalname,
      mimetype: file.mimetype,
      sizeBytes: file.size,
    });

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidate_id },
    });
    if (!candidate) {
      logger.error(
        'CandidateService.uploadDocument',
        'Candidate not found in database',
        undefined,
        { candidate_id },
      );
      throw new AppError('Candidate not found', 404);
    }
    logger.step('CandidateService.uploadDocument', 'Candidate verified in DB', {
      candidate_id,
    });

    // ── Upload to Cloudinary (with local fallback) ────────────────────────
    let cloudinaryUrl: string;
    try {
      logger.step(
        'CandidateService.uploadDocument',
        'Calling CloudinaryService.uploadFile...',
      );
      cloudinaryUrl = await CloudinaryService.uploadFile(
        file.buffer,
        file.originalname,
        'candidates/documents',
        'raw',
      );

      const isLocalFallback = cloudinaryUrl.includes('/uploads/');
      if (isLocalFallback) {
        logger.warn(
          'CandidateService.uploadDocument',
          'File stored via LOCAL FALLBACK (Cloudinary failed) — URL will only work while this server is running',
          { fallbackUrl: cloudinaryUrl },
        );
      } else {
        logger.success(
          'CandidateService.uploadDocument',
          'File successfully stored on Cloudinary',
          { cloudinaryUrl },
        );
      }
    } catch (uploadError) {
      logger.error(
        'CandidateService.uploadDocument',
        'Both Cloudinary and local fallback failed — aborting upload',
        uploadError,
        { candidate_id, file: file.originalname },
      );
      throw new AppError(
        `Failed to upload file: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`,
        500,
      );
    }

    // ── Fetch existing document record ────────────────────────────────────
    logger.step(
      'CandidateService.uploadDocument',
      'Fetching existing CandidateDocument record from DB',
      { candidate_id },
    );
    const existing = await prisma.candidateDocument.findUnique({
      where: { candidate_id },
    });
    logger.step(
      'CandidateService.uploadDocument',
      existing
        ? 'Existing record found — will update'
        : 'No existing record — will create',
      {
        existing_cv_count: existing?.cv?.length ?? 0,
        existing_photo_count: existing?.photo?.length ?? 0,
        existing_id_doc_count: existing?.id_documents?.length ?? 0,
      },
    );

    const cvUrls = existing?.cv ?? [];
    const photoUrls = existing?.photo ?? [];
    const idDocumentUrls = existing?.id_documents ?? [];

    // For CV/resume and photo, always replace with the new file (single active policy)
    const newCv = document_type === 'cv' ? [cloudinaryUrl] : cvUrls;
    const newPhoto = document_type === 'photo' ? [cloudinaryUrl] : photoUrls;
    const newIdDocs =
      document_type === 'id_documents'
        ? [...idDocumentUrls, cloudinaryUrl]
        : idDocumentUrls;

    logger.step(
      'CandidateService.uploadDocument',
      'Upserting CandidateDocument record',
      {
        document_type,
        new_cv_count: newCv.length,
        new_photo_count: newPhoto.length,
        new_id_doc_count: newIdDocs.length,
      },
    );

    const doc = await prisma.candidateDocument.upsert({
      where: { candidate_id },
      create: {
        candidate_id,
        company_id,
        cv: newCv,
        photo: newPhoto,
        id_documents: newIdDocs,
      },
      update: {
        cv: newCv,
        photo: newPhoto,
        id_documents: newIdDocs,
      },
    });

    logger.success(
      'CandidateService.uploadDocument',
      'CandidateDocument record upserted successfully',
      {
        candidate_id,
        document_type,
        uploaded_url: cloudinaryUrl,
        record_id: doc.id,
      },
    );
    return { document: doc, uploaded_url: cloudinaryUrl, document_type };
  }

  static async getDocuments(candidate_id: string) {
    logger.step('CandidateService.getDocuments', 'Looking up candidate', {
      candidate_id,
    });
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidate_id },
    });
    if (!candidate) {
      logger.error(
        'CandidateService.getDocuments',
        'Candidate not found',
        undefined,
        { candidate_id },
      );
      throw new AppError('Candidate not found', 404);
    }

    const doc = await prisma.candidateDocument.findUnique({
      where: { candidate_id },
    });
    if (!doc) {
      logger.warn(
        'CandidateService.getDocuments',
        'No CandidateDocument record in DB for this candidate',
        { candidate_id },
      );
    } else {
      logger.step('CandidateService.getDocuments', 'Document record found', {
        cv_count: doc.cv?.length ?? 0,
        photo_count: doc.photo?.length ?? 0,
        id_documents_count: doc.id_documents?.length ?? 0,
      });
    }
    return doc ?? null;
  }

  static async deleteDocument(candidate_id: string, file_name_or_url: string) {
    const doc = await prisma.candidateDocument.findUnique({
      where: { candidate_id },
    });
    if (!doc) throw new AppError('No documents found for this candidate', 404);

    // Delete the actual file (Cloudinary or local fallback)
    try {
      await CloudinaryService.deleteStoredFile(file_name_or_url);
    } catch (error) {
      console.error('Error deleting file:', error);
      // Continue with database deletion even if file deletion fails
    }

    const matchAndFilter = (arr: string[]) =>
      arr.filter((url) => !url.includes(file_name_or_url));

    await prisma.candidateDocument.update({
      where: { candidate_id },
      data: {
        cv: matchAndFilter(doc.cv),
        photo: matchAndFilter(doc.photo),
        id_documents: matchAndFilter(doc.id_documents),
      },
    });
  }

  // ─── Experience ───────────────────────────────────────────────────────────────

  static async addExperience(
    candidate_id: string,
    data: CandidateExperienceDTO,
    file?: Express.Multer.File,
  ) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidate_id },
    });
    if (!candidate) throw new AppError('Candidate not found', 404);

    let documentUrl = data.document_url;
    if (file) {
      try {
        documentUrl = await CloudinaryService.uploadFile(
          file.buffer,
          file.originalname,
          'candidates/experience',
          'raw',
        );
      } catch (uploadError) {
        console.error(
          '[addExperience] Cloudinary upload failed:',
          uploadError,
        );
        throw new AppError('Failed to upload experience document', 500);
      }
    }

    return await prisma.experience.create({
      data: {
        candidate_id,
        company_name: data.company_name,
        job_title: data.job_title,
        start_date: new Date(data.start_date),
        end_date: data.end_date ? new Date(data.end_date) : null,
        total_months: data.total_months,
        description: data.description,
        document_url: documentUrl,
      },
    });
  }

  static async getExperiences(candidate_id: string) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidate_id },
    });
    if (!candidate) throw new AppError('Candidate not found', 404);
    return await prisma.experience.findMany({
      where: { candidate_id },
      orderBy: { start_date: 'desc' },
    });
  }

  static async updateExperience(
    candidate_id: string,
    experience_id: string,
    data: CandidateExperienceUpdateDTO,
    file?: Express.Multer.File,
  ) {
    const experience = await prisma.experience.findUnique({
      where: { id: experience_id },
    });
    if (!experience || experience.candidate_id !== candidate_id) {
      throw new AppError('Experience not found or unauthorized', 404);
    }

    let documentUrl = data.document_url;
    if (file) {
      try {
        documentUrl = await CloudinaryService.uploadFile(
          file.buffer,
          file.originalname,
          'candidates/experience',
          'raw',
        );
      } catch (uploadError) {
        console.error(
          '[updateExperience] Cloudinary upload failed:',
          uploadError,
        );
        throw new AppError('Failed to upload experience document', 500);
      }
    }

    return await prisma.experience.update({
      where: { id: experience_id },
      data: {
        ...(data.company_name !== undefined && {
          company_name: data.company_name,
        }),
        ...(data.job_title !== undefined && { job_title: data.job_title }),
        ...(data.start_date !== undefined && {
          start_date: new Date(data.start_date),
        }),
        ...(data.end_date !== undefined && {
          end_date: data.end_date ? new Date(data.end_date) : null,
        }),
        ...(data.total_months !== undefined && {
          total_months: data.total_months,
        }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(documentUrl !== undefined && { document_url: documentUrl }),
      },
    });
  }

  static async deleteExperience(candidate_id: string, experience_id: string) {
    const experience = await prisma.experience.findUnique({
      where: { id: experience_id },
    });
    if (!experience || experience.candidate_id !== candidate_id) {
      throw new AppError('Experience not found or unauthorized', 404);
    }
    return await prisma.experience.delete({ where: { id: experience_id } });
  }

  // ─── Education ────────────────────────────────────────────────────────────────

  static async addEducation(
    candidate_id: string,
    data: CandidateEducationDTO,
    file?: Express.Multer.File,
  ) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidate_id },
    });
    if (!candidate) throw new AppError('Candidate not found', 404);

    let certificateUrl = data.certificate_url;
    if (file) {
      try {
        certificateUrl = await CloudinaryService.uploadFile(
          file.buffer,
          file.originalname,
          'candidates/education',
          'raw',
        );
      } catch (uploadError) {
        console.error(
          '[addEducation] Cloudinary upload failed:',
          uploadError,
        );
        throw new AppError('Failed to upload education document', 500);
      }
    }

    return await prisma.education.create({
      data: {
        candidate_id,
        institution_name: data.institution_name,
        degree: data.degree,
        field_of_study: data.field_of_study,
        graduation_year: data.graduation_year,
        certificate_url: certificateUrl,
      },
    });
  }

  static async getEducations(candidate_id: string) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidate_id },
    });
    if (!candidate) throw new AppError('Candidate not found', 404);
    return await prisma.education.findMany({
      where: { candidate_id },
      orderBy: { graduation_year: 'desc' },
    });
  }

  static async updateEducation(
    candidate_id: string,
    education_id: string,
    data: CandidateEducationUpdateDTO,
    file?: Express.Multer.File,
  ) {
    const education = await prisma.education.findUnique({
      where: { id: education_id },
    });
    if (!education || education.candidate_id !== candidate_id) {
      throw new AppError('Education not found or unauthorized', 404);
    }

    let certificateUrl = data.certificate_url;
    if (file) {
      try {
        certificateUrl = await CloudinaryService.uploadFile(
          file.buffer,
          file.originalname,
          'candidates/education',
          'raw',
        );
      } catch (uploadError) {
        console.error(
          '[updateEducation] Cloudinary upload failed:',
          uploadError,
        );
        throw new AppError('Failed to upload education document', 500);
      }
    }

    return await prisma.education.update({
      where: { id: education_id },
      data: {
        ...(data.institution_name !== undefined && {
          institution_name: data.institution_name,
        }),
        ...(data.degree !== undefined && { degree: data.degree }),
        ...(data.field_of_study !== undefined && {
          field_of_study: data.field_of_study,
        }),
        ...(data.graduation_year !== undefined && {
          graduation_year: data.graduation_year,
        }),
        ...(certificateUrl !== undefined && {
          certificate_url: certificateUrl,
        }),
      },
    });
  }

  static async deleteEducation(candidate_id: string, education_id: string) {
    const education = await prisma.education.findUnique({
      where: { id: education_id },
    });
    if (!education || education.candidate_id !== candidate_id) {
      throw new AppError('Education not found or unauthorized', 404);
    }
    return await prisma.education.delete({ where: { id: education_id } });
  }

  // ─── Certifications ───────────────────────────────────────────────────────────

  static async addCertification(
    candidate_id: string,
    data: CandidateCertificationDTO,
  ) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidate_id },
    });
    if (!candidate) throw new AppError('Candidate not found', 404);

    return await prisma.candidateCertification.create({
      data: {
        candidate_id,
        name: data.name,
        issuing_organization: data.issuing_organization,
        issue_date: data.issue_date ? new Date(data.issue_date) : undefined,
        expiration_date: data.expiration_date
          ? new Date(data.expiration_date)
          : undefined,
        credential_id: data.credential_id,
        credential_url: data.credential_url,
      },
    });
  }

  static async getCertifications(candidate_id: string) {
    return await prisma.candidateCertification.findMany({
      where: { candidate_id },
      orderBy: { created_at: 'desc' },
    });
  }

  static async updateCertification(
    candidate_id: string,
    certification_id: string,
    data: CandidateCertificationUpdateDTO,
  ) {
    const cert = await prisma.candidateCertification.findUnique({
      where: { id: certification_id },
    });
    if (!cert || cert.candidate_id !== candidate_id) {
      throw new AppError('Certification not found or unauthorized', 404);
    }
    return await prisma.candidateCertification.update({
      where: { id: certification_id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.issuing_organization !== undefined && {
          issuing_organization: data.issuing_organization,
        }),
        ...(data.issue_date !== undefined && {
          issue_date: data.issue_date ? new Date(data.issue_date) : null,
        }),
        ...(data.expiration_date !== undefined && {
          expiration_date: data.expiration_date
            ? new Date(data.expiration_date)
            : null,
        }),
        ...(data.credential_id !== undefined && {
          credential_id: data.credential_id,
        }),
        ...(data.credential_url !== undefined && {
          credential_url: data.credential_url,
        }),
      },
    });
  }

  static async deleteCertification(
    candidate_id: string,
    certification_id: string,
  ) {
    const cert = await prisma.candidateCertification.findUnique({
      where: { id: certification_id },
    });
    if (!cert || cert.candidate_id !== candidate_id) {
      throw new AppError('Certification not found or unauthorized', 404);
    }
    return await prisma.candidateCertification.delete({
      where: { id: certification_id },
    });
  }

  // ─── Phones ───────────────────────────────────────────────────────────────────

  static async addPhone(
    candidate_id: string,
    company_id: number,
    data: CandidatePhoneDTO,
  ) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidate_id },
    });
    if (!candidate) throw new AppError('Candidate not found', 404);

    return await prisma.phone.create({
      data: {
        candidate_id,
        company_id,
        phone_number: data.phone_number,
        phone_type: data.phone_type,
        is_primary: data.is_primary ?? false,
      },
    });
  }

  static async getPhones(candidate_id: string) {
    return await prisma.phone.findMany({ where: { candidate_id } });
  }

  static async updatePhone(
    candidate_id: string,
    phone_id: string,
    data: CandidatePhoneUpdateDTO,
  ) {
    const phone = await prisma.phone.findUnique({ where: { id: phone_id } });
    if (!phone || phone.candidate_id !== candidate_id) {
      throw new AppError('Phone not found or unauthorized', 404);
    }
    return await prisma.phone.update({
      where: { id: phone_id },
      data: {
        ...(data.phone_number !== undefined && {
          phone_number: data.phone_number,
        }),
        ...(data.phone_type !== undefined && { phone_type: data.phone_type }),
        ...(data.is_primary !== undefined && { is_primary: data.is_primary }),
      },
    });
  }

  static async deletePhone(candidate_id: string, phone_id: string) {
    const phone = await prisma.phone.findUnique({ where: { id: phone_id } });
    if (!phone || phone.candidate_id !== candidate_id) {
      throw new AppError('Phone not found or unauthorized', 404);
    }
    if (phone.is_primary) {
      throw new AppError('Cannot delete the primary phone number', 400);
    }
    return await prisma.phone.delete({ where: { id: phone_id } });
  }

  // ─── Addresses ────────────────────────────────────────────────────────────────

  static async addAddress(
    candidate_id: string,
    company_id: number,
    data: CandidateAddressDTO,
  ) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidate_id },
    });
    if (!candidate) throw new AppError('Candidate not found', 404);

    return await prisma.address.create({
      data: {
        candidate_id,
        company_id,
        region: data.region,
        city: data.city,
        sub_city: data.sub_city,
        woreda: data.woreda,
      },
    });
  }

  static async getAddresses(candidate_id: string) {
    return await prisma.address.findMany({ where: { candidate_id } });
  }

  static async updateAddress(
    candidate_id: string,
    address_id: string,
    data: CandidateAddressUpdateDTO,
  ) {
    const address = await prisma.address.findUnique({
      where: { id: address_id },
    });
    if (!address || address.candidate_id !== candidate_id) {
      throw new AppError('Address not found or unauthorized', 404);
    }
    return await prisma.address.update({
      where: { id: address_id },
      data: {
        ...(data.region !== undefined && { region: data.region }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.sub_city !== undefined && { sub_city: data.sub_city }),
        ...(data.woreda !== undefined && { woreda: data.woreda }),
      },
    });
  }

  static async deleteAddress(candidate_id: string, address_id: string) {
    const address = await prisma.address.findUnique({
      where: { id: address_id },
    });
    if (!address || address.candidate_id !== candidate_id) {
      throw new AppError('Address not found or unauthorized', 404);
    }
    return await prisma.address.delete({ where: { id: address_id } });
  }

  // ─── Talent Roster ────────────────────────────────────────────────────────────

  /** Returns the candidate's talent roster entry if they are in the pool */
  static async getTalentRosterStatus(candidate_id: string) {
    return await prisma.talentRoster.findFirst({
      where: { candidate_id },
      orderBy: { added_at: 'desc' },
    });
  }
}
