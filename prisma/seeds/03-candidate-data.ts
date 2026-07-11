import 'dotenv/config';
import {
  Prisma,
  ApplicationStatus,
  ApplicationStage,
} from '@prisma/client';
import bcryptjs from 'bcryptjs';
import prisma from '../../src/config/database';

async function main() {
  try {
    const passwordHash = await bcryptjs.hash('Password', 12);

    // Get company
    const company = await prisma.company.findUnique({
      where: { company_code: 'ADIU' },
    });
    if (!company) {
      throw new Error('Company not found. Run 01-base-data.ts first.');
    }

    // Get users
    const users = await prisma.user.findMany({
      where: { company_id: company.id },
    });
    const userMap: Record<string, any> = users.reduce((map: Record<string, any>, user: any) => {
      map[user.email] = user;
      return map;
    }, {});

    // Get vacancies
    const vacancies = await prisma.vacancy.findMany({
      where: { company_id: company.id },
      orderBy: { vacancy_number: 'asc' },
    });
    const seededVacancies = vacancies.slice(0, 14); // Status-coverage vacancies
    const browseVacancies = vacancies.slice(14); // Browse vacancies

    // Get recruitment sources
    const sources = await prisma.recruitmentSource.findMany({
      where: { company_id: company.id },
    });
    const recruitmentSourceMap: Record<string, any> = sources.reduce((map: Record<string, any>, source: any) => {
      map[source.name] = source;
      return map;
    }, {});

    // ── 1. Background Candidates (anonymous 10) ─────────────────────────────────
    const candidateData = [
      {
        email: 'cand1@erms.com',
        first_name: 'Dawit',
        last_name: 'Abebe',
        expYears: 5,
        gender: 'MALE' as const,
      },
      {
        email: 'cand2@erms.com',
        first_name: 'Solomon',
        last_name: 'Kassa',
        expYears: 3,
        gender: 'MALE' as const,
      },
      {
        email: 'cand3@erms.com',
        first_name: 'Tigist',
        last_name: 'Bekele',
        expYears: 6,
        gender: 'FEMALE' as const,
      },
      {
        email: 'cand4@erms.com',
        first_name: 'Eleni',
        last_name: 'Tadesse',
        expYears: 2,
        gender: 'FEMALE' as const,
      },
      {
        email: 'cand5@erms.com',
        first_name: 'Yared',
        last_name: 'Getachew',
        expYears: 7,
        gender: 'MALE' as const,
      },
      {
        email: 'cand6@erms.com',
        first_name: 'Aster',
        last_name: 'Asefa',
        expYears: 4,
        gender: 'FEMALE' as const,
      },
      {
        email: 'cand7@erms.com',
        first_name: 'Mulu',
        last_name: 'Tesfaye',
        expYears: 8,
        gender: 'FEMALE' as const,
      },
      {
        email: 'cand8@erms.com',
        first_name: 'Zenebe',
        last_name: 'Negash',
        expYears: 1,
        gender: 'MALE' as const,
      },
      {
        email: 'cand9@erms.com',
        first_name: 'Fikre',
        last_name: 'Mariam',
        expYears: 10,
        gender: 'MALE' as const,
      },
      {
        email: 'cand10@erms.com',
        first_name: 'Tsige',
        last_name: 'Desta',
        expYears: 5,
        gender: 'FEMALE' as const,
      },
    ];

    const seededCandidates: any[] = [];
    for (const cand of candidateData) {
      const dbCand = await prisma.candidate.upsert({
        where: { email: cand.email },
        update: {},
        create: {
          company_id: company.id,
          first_name: cand.first_name,
          last_name: cand.last_name,
          email: cand.email,
          phone: '+251 912 000 000',
          password_hash: passwordHash,
          gender: cand.gender,
          nationality: 'Ethiopian',
          current_address: 'Addis Ababa, Ethiopia',
          years_of_experience: cand.expYears,
          current_employer: 'Tech Ethiopia PLC',
          current_position: 'Software Developer',
          skills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL', 'Docker'],
          languages: ['Amharic', 'English'],
          availability_status: 'IMMEDIATELY',
          expected_salary: new Prisma.Decimal(5000 + cand.expYears * 500),
          preferred_job_category: 'Software Engineering',
          preferred_location: 'Addis Ababa',
          is_email_verified: true,
          terms_accepted: true,
        },
      });
      seededCandidates.push(dbCand);

      await prisma.experience.upsert({
        where: { candidate_id_company_name: { candidate_id: dbCand.id, company_name: 'Tech Ethiopia PLC' } },
        update: {},
        create: {
          candidate_id: dbCand.id,
          company_name: 'Tech Ethiopia PLC',
          job_title: 'Software Developer',
          start_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000 * cand.expYears),
          end_date: new Date(),
          total_months: cand.expYears * 12,
          description: 'Designed API services and scaled databases.',
        },
      });
      await prisma.education.upsert({
        where: { candidate_id_institution_name: { candidate_id: dbCand.id, institution_name: 'Addis Ababa University' } },
        update: {},
        create: {
          candidate_id: dbCand.id,
          degree: 'BACHELOR',
          field_of_study: 'Software Engineering',
          graduation_year: 2021,
          institution_name: 'Addis Ababa University',
        },
      });
      await prisma.candidateCertification.upsert({
        where: { candidate_id_name_issuing_organization: { candidate_id: dbCand.id, name: 'AWS Certified Developer', issuing_organization: 'Amazon Web Services' } },
        update: {},
        create: {
          candidate_id: dbCand.id,
          name: 'AWS Certified Developer',
          issuing_organization: 'Amazon Web Services',
          issue_date: new Date('2023-01-15'),
          expiration_date: new Date('2026-01-15'),
        },
      });
      await prisma.candidateDocument.upsert({
        where: { candidate_id: { candidate_id: dbCand.id } },
        update: {},
        create: {
          candidate_id: dbCand.id,
          company_id: company.id,
          cv: ['https://storage.erms.com/cv/placeholder.pdf'],
        },
      });
      await prisma.phone.upsert({
        where: { candidate_id_phone_type: { candidate_id: dbCand.id, phone_type: 'PRIVATE' } },
        update: {},
        create: {
          company_id: company.id,
          candidate_id: dbCand.id,
          phone_number: '+251 912 000 000',
          phone_type: 'PRIVATE',
          is_primary: true,
        },
      });
      await prisma.address.upsert({
        where: { candidate_id: { candidate_id: dbCand.id } },
        update: {},
        create: {
          company_id: company.id,
          candidate_id: dbCand.id,
          region: 'Addis Ababa',
          city: 'Addis Ababa',
          sub_city: 'Bole',
        },
      });
    }
    console.log('✓ Background candidates created (10 with full profiles)');

    // ── 2. Candidate Portal Users ────────────────────────────────────────────────
    const candidatePortalDefs = [
      {
        email: 'canduser1@erms.com',
        nationality: 'Ethiopian',
        current_address: 'Bole, Addis Ababa',
        gender: 'FEMALE' as const,
        date_of_birth: new Date('1998-04-12'),
        years_of_experience: 4,
        current_employer: 'SoftSolutions Ltd',
        current_position: 'Junior Software Engineer',
        preferred_job_category: 'Software Engineering',
        preferred_location: 'Addis Ababa',
        expected_salary: 4500,
        skills: ['JavaScript', 'HTML5', 'CSS3', 'React', 'Git'],
        languages: ['Amharic', 'English'],
        phone_number: '+251 911 123 456',
        certifications: [
          { name: 'Google Cloud Associate', org: 'Google', issued: '2023-06-01', expires: '2026-06-01' },
          { name: 'React Developer Certificate', org: 'Meta', issued: '2022-09-01', expires: null },
        ],
        experiences: [
          { company: 'SoftSolutions Ltd', title: 'Junior Software Engineer', startYearsAgo: 4, desc: 'Built React web applications and REST APIs.' },
          { company: 'Startup ET', title: 'Intern Developer', startYearsAgo: 5, desc: 'Frontend development and bug fixing.' },
        ],
        educations: [
          { degree: 'BACHELOR' as const, field: 'Computer Science', year: 2021, institution: 'Addis Ababa University' },
        ],
      },
      {
        email: 'canduser2@erms.com',
        nationality: 'Kenyan',
        current_address: 'Kilimani, Nairobi',
        gender: 'MALE' as const,
        date_of_birth: new Date('1994-08-20'),
        years_of_experience: 6,
        current_employer: 'FinTech East Africa',
        current_position: 'Backend Developer',
        preferred_job_category: 'Backend Engineering',
        preferred_location: 'Nairobi',
        expected_salary: 6000,
        skills: ['TypeScript', 'Node.js', 'Express', 'PostgreSQL', 'Redis'],
        languages: ['English', 'Swahili'],
        phone_number: '+254 700 123 456',
        certifications: [
          { name: 'AWS Solutions Architect', org: 'Amazon Web Services', issued: '2022-03-01', expires: '2025-03-01' },
        ],
        experiences: [
          { company: 'FinTech East Africa', title: 'Backend Developer', startYearsAgo: 6, desc: 'Designed microservices and payment gateway integrations.' },
        ],
        educations: [
          { degree: 'BACHELOR' as const, field: 'Information Technology', year: 2019, institution: 'University of Nairobi' },
        ],
      },
      {
        email: 'canduser3@erms.com',
        nationality: 'American',
        current_address: 'Seattle, WA',
        gender: 'OTHER' as const,
        date_of_birth: new Date('1991-11-03'),
        years_of_experience: 8,
        current_employer: 'CloudScale Inc',
        current_position: 'Senior DevOps Engineer',
        preferred_job_category: 'DevOps & Infrastructure',
        preferred_location: 'Remote',
        expected_salary: 9500,
        skills: ['Kubernetes', 'AWS', 'Terraform', 'CI/CD', 'Python'],
        languages: ['English'],
        phone_number: '+1 206 555 0100',
        certifications: [
          { name: 'Certified Kubernetes Administrator', org: 'CNCF', issued: '2021-01-01', expires: '2024-01-01' },
          { name: 'AWS DevOps Professional', org: 'Amazon Web Services', issued: '2022-11-01', expires: '2025-11-01' },
        ],
        experiences: [
          { company: 'CloudScale Inc', title: 'Senior DevOps Engineer', startYearsAgo: 8, desc: 'Managed Kubernetes clusters and CI/CD pipelines at scale.' },
          { company: 'StartupX', title: 'DevOps Engineer', startYearsAgo: 11, desc: 'Set up infrastructure monitoring and deployment automation.' },
        ],
        educations: [
          { degree: 'MASTER' as const, field: 'Computer Science', year: 2016, institution: 'University of Washington' },
          { degree: 'BACHELOR' as const, field: 'Computer Engineering', year: 2014, institution: 'University of Washington' },
        ],
      },
    ];

    const seededPortalCandidates: Record<string, any> = {};
    for (const cpUser of candidatePortalDefs) {
      const user = userMap[cpUser.email];
      if (!user) continue;

      let candidate = await prisma.candidate.findUnique({
        where: { email: cpUser.email },
      });
      if (!candidate) {
        candidate = await prisma.candidate.upsert({
          where: { email: cpUser.email },
          update: {},
          create: {
            company_id: company.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: cpUser.email,
            password_hash: passwordHash,
            phone: cpUser.phone_number,
            is_email_verified: true,
            terms_accepted: true,
            nationality: cpUser.nationality,
            current_address: cpUser.current_address,
            gender: cpUser.gender,
            date_of_birth: cpUser.date_of_birth,
            years_of_experience: cpUser.years_of_experience,
            current_employer: cpUser.current_employer,
            current_position: cpUser.current_position,
            preferred_job_category: cpUser.preferred_job_category,
            preferred_location: cpUser.preferred_location,
            expected_salary: new Prisma.Decimal(cpUser.expected_salary),
            skills: cpUser.skills,
            languages: cpUser.languages,
            availability_status: 'IMMEDIATELY',
          },
        });
      }
      seededPortalCandidates[cpUser.email] = candidate;

      for (const exp of cpUser.experiences) {
        await prisma.experience.upsert({
          where: { candidate_id_company_name: { candidate_id: candidate.id, company_name: exp.company } },
          update: {},
          create: {
            candidate_id: candidate.id,
            company_name: exp.company,
            job_title: exp.title,
            start_date: new Date(Date.now() - exp.startYearsAgo * 365 * 24 * 60 * 60 * 1000),
            description: exp.desc,
            total_months: (exp.startYearsAgo - (cpUser.experiences.indexOf(exp) === 0 ? 0 : cpUser.experiences[0].startYearsAgo - cpUser.years_of_experience)) * 12,
          },
        });
      }

      for (const edu of cpUser.educations) {
        await prisma.education.upsert({
          where: { candidate_id_institution_name: { candidate_id: candidate.id, institution_name: edu.institution } },
          update: {},
          create: {
            candidate_id: candidate.id,
            degree: edu.degree,
            field_of_study: edu.field,
            graduation_year: edu.year,
            institution_name: edu.institution,
          },
        });
      }

      for (const cert of cpUser.certifications) {
        await prisma.candidateCertification.upsert({
          where: { candidate_id_name_issuing_organization: { candidate_id: candidate.id, name: cert.name, issuing_organization: cert.org } },
          update: {},
          create: {
            candidate_id: candidate.id,
            name: cert.name,
            issuing_organization: cert.org,
            issue_date: new Date(cert.issued),
            expiration_date: cert.expires ? new Date(cert.expires) : null,
          },
        });
      }

      await prisma.candidateDocument.upsert({
        where: { candidate_id: { candidate_id: candidate.id } },
        update: {},
        create: {
          candidate_id: candidate.id,
          company_id: company.id,
          cv: ['https://storage.erms.com/cv/portal-user.pdf'],
          id_documents: ['https://storage.erms.com/certs/gca.pdf'],
        },
      });

      await prisma.phone.upsert({
        where: { candidate_id_phone_type: { candidate_id: candidate.id, phone_type: 'PRIVATE' } },
        update: {},
        create: {
          company_id: company.id,
          candidate_id: candidate.id,
          phone_number: cpUser.phone_number,
          phone_type: 'PRIVATE',
          is_primary: true,
        },
      });

      await prisma.address.upsert({
        where: { candidate_id: { candidate_id: candidate.id } },
        update: {},
        create: {
          company_id: company.id,
          candidate_id: candidate.id,
          region: cpUser.nationality,
          city: cpUser.current_address.split(',')[0].trim(),
        },
      });
    }
    console.log('✓ Portal candidate profiles created (canduser1, canduser2, canduser3) with full profiles');

    // ── 3. Applications ───────────────────────────────────────────────────────────
    const seededApplications: any[] = [];

    async function createApp(
      candId: string,
      vacId: string,
      status: ApplicationStatus,
      stage: ApplicationStage,
      daysAgo = 0,
      sourceChannel?: string,
    ) {
      const app = await prisma.application.upsert({
        where: { id: `app-${candId}-${vacId}` },
        update: {},
        create: {
          id: `app-${candId}-${vacId}`,
          company_id: company.id,
          candidate_id: candId,
          vacancy_id: vacId,
          status,
          current_stage: stage,
          recruitment_source_id: sourceChannel ? (recruitmentSourceMap[sourceChannel] ?? null) : null,
          submitted_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        },
      });
      await prisma.applicationStageHistory.upsert({
        where: { id: `ash-${app.id}` },
        update: {},
        create: {
          id: `ash-${app.id}`,
          application_id: app.id,
          from_stage: null,
          to_stage: stage,
          notes: `Seeded at ${stage}`,
        },
      });
      seededApplications.push(app);
      return app;
    }

    // Background candidates — all statuses
    const appSubmitted1 = await createApp(seededCandidates[0].id, seededVacancies[4].id, 'SUBMITTED', 'SCREENING', 30, 'LinkedIn');
    const appSubmitted2 = await createApp(seededCandidates[1].id, seededVacancies[5].id, 'SUBMITTED', 'SCREENING', 28, 'Company Website');
    const appScreening1 = await createApp(seededCandidates[2].id, seededVacancies[4].id, 'UNDER_SCREENING', 'SCREENING', 25, 'Indeed');
    const appScreening2 = await createApp(seededCandidates[3].id, seededVacancies[5].id, 'UNDER_SCREENING', 'SCREENING', 23, 'Telegram');
    const appShort1 = await createApp(seededCandidates[4].id, seededVacancies[6].id, 'SHORTLISTED', 'SHORTLISTING', 20, 'Employee Referral');
    const appShort2 = await createApp(seededCandidates[5].id, seededVacancies[7].id, 'SHORTLISTED', 'SHORTLISTING', 18, 'LinkedIn');
    const appIntSched1 = await createApp(seededCandidates[6].id, seededVacancies[6].id, 'INTERVIEW_SCHEDULED', 'INTERVIEW', 15, 'Facebook');
    const appIntSched2 = await createApp(seededCandidates[7].id, seededVacancies[7].id, 'INTERVIEW_SCHEDULED', 'INTERVIEW', 14, 'Glassdoor');
    const appIntComp1 = await createApp(seededCandidates[8].id, seededVacancies[6].id, 'INTERVIEW_COMPLETED', 'EVALUATION', 10, 'LinkedIn');
    const appIntComp2 = await createApp(seededCandidates[9].id, seededVacancies[7].id, 'INTERVIEW_COMPLETED', 'EVALUATION', 9, 'Company Website');
    const appEval1 = await createApp(seededCandidates[0].id, seededVacancies[2].id, 'UNDER_EVALUATION', 'EVALUATION', 8, 'Indeed');
    const appEval2 = await createApp(seededCandidates[1].id, seededVacancies[3].id, 'UNDER_EVALUATION', 'EVALUATION', 7, 'Telegram');
    const appSelected1 = await createApp(seededCandidates[2].id, seededVacancies[8].id, 'SELECTED', 'OFFER', 6, 'Employee Referral');
    const appSelected2 = await createApp(seededCandidates[3].id, seededVacancies[9].id, 'SELECTED', 'OFFER', 5, 'LinkedIn');
    const appOfferIssued1 = await createApp(seededCandidates[4].id, seededVacancies[8].id, 'OFFER_ISSUED', 'OFFER', 4, 'Facebook');
    const appOfferIssued2 = await createApp(seededCandidates[5].id, seededVacancies[9].id, 'OFFER_ISSUED', 'OFFER', 3, 'Company Website');
    const appOfferAcc1 = await createApp(seededCandidates[6].id, seededVacancies[10].id, 'OFFER_ACCEPTED', 'ONBOARDING', 2, 'LinkedIn');
    const appOfferAcc2 = await createApp(seededCandidates[7].id, seededVacancies[11].id, 'OFFER_ACCEPTED', 'ONBOARDING', 2, 'Telegram');
    const appOfferDec1 = await createApp(seededCandidates[8].id, seededVacancies[10].id, 'OFFER_DECLINED', 'OFFER', 1, 'Glassdoor');
    const appOfferDec2 = await createApp(seededCandidates[9].id, seededVacancies[11].id, 'OFFER_DECLINED', 'OFFER', 1, 'Indeed');
    const appRej1 = await createApp(seededCandidates[0].id, seededVacancies[6].id, 'REJECTED', 'CLOSED', 12, 'Company Website');
    const appRej2 = await createApp(seededCandidates[1].id, seededVacancies[7].id, 'REJECTED', 'CLOSED', 11, 'LinkedIn');
    const appRoster1 = await createApp(seededCandidates[2].id, seededVacancies[6].id, 'MOVED_TO_TALENT_ROSTER', 'CLOSED', 5, 'Employee Referral');
    const appRoster2 = await createApp(seededCandidates[3].id, seededVacancies[7].id, 'MOVED_TO_TALENT_ROSTER', 'CLOSED', 4, 'Telegram');

    // canduser1 applications — 11 statuses, all visible in portal
    const cu1 = seededPortalCandidates['canduser1@erms.com'];
    const cu1AppSubmitted = await createApp(cu1.id, browseVacancies[0].id, 'SUBMITTED', 'SCREENING', 20, 'Company Website');
    const cu1AppScreening = await createApp(cu1.id, browseVacancies[1].id, 'UNDER_SCREENING', 'SCREENING', 18, 'LinkedIn');
    const cu1AppShort = await createApp(cu1.id, seededVacancies[4].id, 'SHORTLISTED', 'SHORTLISTING', 16, 'Indeed');
    const cu1AppIntSched = await createApp(cu1.id, seededVacancies[6].id, 'INTERVIEW_SCHEDULED', 'INTERVIEW', 14, 'Employee Referral');
    const cu1AppIntComp = await createApp(cu1.id, seededVacancies[7].id, 'INTERVIEW_COMPLETED', 'EVALUATION', 10, 'LinkedIn');
    const cu1AppEval = await createApp(cu1.id, seededVacancies[2].id, 'UNDER_EVALUATION', 'EVALUATION', 8, 'Facebook');
    const cu1AppSelected = await createApp(cu1.id, seededVacancies[3].id, 'SELECTED', 'OFFER', 6, 'Company Website');
    const cu1AppOffer1 = await createApp(cu1.id, browseVacancies[2].id, 'OFFER_ISSUED', 'OFFER', 3, 'LinkedIn');
    const cu1AppOffer2 = await createApp(cu1.id, browseVacancies[3].id, 'OFFER_ISSUED', 'OFFER', 5, 'Indeed');
    const cu1AppAccepted = await createApp(cu1.id, browseVacancies[4].id, 'OFFER_ACCEPTED', 'ONBOARDING', 1, 'Company Website');
    const cu1AppRejected = await createApp(cu1.id, seededVacancies[12].id, 'REJECTED', 'CLOSED', 5, 'Telegram');
    const cu1AppRoster = await createApp(cu1.id, seededVacancies[13].id, 'MOVED_TO_TALENT_ROSTER', 'CLOSED', 3, 'Employee Referral');

    // canduser2 applications
    const cu2 = seededPortalCandidates['canduser2@erms.com'];
    const cu2AppShort = await createApp(cu2.id, seededVacancies[4].id, 'SHORTLISTED', 'SHORTLISTING', 15, 'LinkedIn');
    const cu2AppIntSched = await createApp(cu2.id, browseVacancies[0].id, 'INTERVIEW_SCHEDULED', 'INTERVIEW', 12, 'Company Website');
    const cu2AppIntComp = await createApp(cu2.id, seededVacancies[6].id, 'INTERVIEW_COMPLETED', 'EVALUATION', 8, 'Indeed');
    const cu2AppOffer = await createApp(cu2.id, browseVacancies[5].id, 'OFFER_ISSUED', 'OFFER', 2, 'LinkedIn');
    const cu2AppDeclined = await createApp(cu2.id, seededVacancies[11].id, 'OFFER_DECLINED', 'OFFER', 1, 'Facebook');

    // canduser3 applications
    const cu3 = seededPortalCandidates['canduser3@erms.com'];
    const cu3AppIntSched = await createApp(cu3.id, seededVacancies[2].id, 'INTERVIEW_SCHEDULED', 'INTERVIEW', 10, 'Company Website');
    const cu3AppOffer = await createApp(cu3.id, browseVacancies[2].id, 'OFFER_ISSUED', 'OFFER', 3, 'LinkedIn');
    const cu3AppAccepted = await createApp(cu3.id, browseVacancies[3].id, 'OFFER_ACCEPTED', 'ONBOARDING', 1, 'Indeed');
    const cu3AppRejected = await createApp(cu3.id, seededVacancies[12].id, 'REJECTED', 'CLOSED', 5, 'Telegram');

    console.log(`✓ Applications created (${seededApplications.length} total, all statuses covered for all portal users)`);

    // ── 4. Screening Logs ─────────────────────────────────────────────────────────
    const screeningEntries = [
      { app: appScreening1, candId: seededCandidates[2].id, vacId: seededVacancies[4].id, status: 'QUALIFIED' as const, screenerId: 'hr1@erms.com' },
      { app: appScreening2, candId: seededCandidates[3].id, vacId: seededVacancies[5].id, status: 'PARTIALLY_QUALIFIED' as const, screenerId: 'hr2@erms.com' },
      { app: appRej1, candId: seededCandidates[0].id, vacId: seededVacancies[6].id, status: 'NOT_QUALIFIED' as const, screenerId: 'hr1@erms.com' },
      { app: appRoster1, candId: seededCandidates[2].id, vacId: seededVacancies[6].id, status: 'HOLD_FOR_REVIEW' as const, screenerId: 'hr3@erms.com' },
      { app: cu1AppScreening, candId: cu1.id, vacId: browseVacancies[1].id, status: 'QUALIFIED' as const, screenerId: 'hr1@erms.com' },
      { app: cu2AppShort, candId: cu2.id, vacId: seededVacancies[4].id, status: 'QUALIFIED' as const, screenerId: 'hr2@erms.com' },
    ];
    for (const s of screeningEntries) {
      await prisma.screeningLog.upsert({
        where: { id: `sl-${s.app.id}` },
        update: {},
        create: {
          id: `sl-${s.app.id}`,
          vacancy_id: s.vacId,
          candidate_id: s.candId,
          status: s.status,
          reason: s.status === 'NOT_QUALIFIED' ? 'Does not meet minimum educational requirements.' : null,
          screened_by_user_id: userMap[s.screenerId].id,
          scores_json: [
            { field: 'Educational Qualification', score: 4 },
            { field: 'Relevant Work Experience', score: 3 },
            { field: 'Technical Skills', score: 4 },
          ],
        },
      });
    }
    console.log('✓ Screening logs created');

    // ── 5. Shortlisted Candidates ───────────────────────────────────────────────────
    const shortlistEntries = [
      { vacId: seededVacancies[6].id, candId: seededCandidates[4].id, appId: appShort1.id },
      { vacId: seededVacancies[7].id, candId: seededCandidates[5].id, appId: appShort2.id },
      { vacId: seededVacancies[6].id, candId: seededCandidates[6].id, appId: appIntSched1.id },
      { vacId: seededVacancies[7].id, candId: seededCandidates[7].id, appId: appIntSched2.id },
      { vacId: seededVacancies[6].id, candId: seededCandidates[8].id, appId: appIntComp1.id },
      { vacId: seededVacancies[7].id, candId: seededCandidates[9].id, appId: appIntComp2.id },
      { vacId: seededVacancies[4].id, candId: cu1.id, appId: cu1AppShort.id },
      { vacId: seededVacancies[6].id, candId: cu1.id, appId: cu1AppIntSched.id },
      { vacId: seededVacancies[7].id, candId: cu1.id, appId: cu1AppIntComp.id },
      { vacId: seededVacancies[4].id, candId: cu2.id, appId: cu2AppShort.id },
      { vacId: browseVacancies[0].id, candId: cu2.id, appId: cu2AppIntSched.id },
      { vacId: seededVacancies[2].id, candId: cu3.id, appId: cu3AppIntSched.id },
    ];
    for (const sl of shortlistEntries) {
      await prisma.shortlistedCandidate.upsert({
        where: { vacancy_id_candidate_id: { vacancy_id: sl.vacId, candidate_id: sl.candId } },
        update: {},
        create: {
          vacancy_id: sl.vacId,
          candidate_id: sl.candId,
          application_id: sl.appId,
          shortlisted_by_user_id: userMap['recruiter1@erms.com'].id,
          notes: 'Shortlisted during seeding.',
        },
      });
    }
    console.log('✓ Shortlisted candidates created');

    console.log('\n✅ Candidate data seeded successfully!');
    console.log('─────────────────────────────────────────────────────────');
  } catch (error) {
    console.error('Error seeding candidate data:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
