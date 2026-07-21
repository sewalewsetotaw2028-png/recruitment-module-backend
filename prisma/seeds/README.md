# Modular Seed Files

This directory contains modular seed files for the recruitment management system. The original `seed.ts` file in the parent directory remains unchanged as a backup.

## Seed File Structure

The seed files are organized by data domain and must be run in the following order:

1. **01-base-data.ts** - Foundation data
   - Company
   - Permissions
   - App Roles
   - Role → Permission Assignments
   - Approval Workflows
   - Users
   - Departments

2. **02-master-data.ts** - Core business data
   - Job Templates
   - Workforce Plans (all 8 statuses)
   - Recruitment Requests (all 6 statuses)
   - Vacancies (all 7 statuses + browse vacancies)

3. **03-candidate-data.ts** - Candidate and application data
   - Background Candidates (10 with full profiles)
   - Portal Candidate Users (canduser1, canduser2, canduser3)
   - Applications (all 12 statuses)
   - Screening Logs
   - Shortlisted Candidates

4. **04-interview-data.ts** - Interview and evaluation data
   - Interview Categories
   - Evaluation Templates
   - Question Banks
   - Interviews (all 6 statuses)
   - Interview Evaluations

5. **05-hiring-data.ts** - Hiring and selection data
   - Talent Roster (all 4 statuses)
   - Hiring Minutes (APPROVED, PENDING, REJECTED)
   - Test Vacancy with 3 evaluated candidates for evaluation testing

6. **06-configuration-data.ts** - Configuration data
   - Recruitment Sources
   - Recruitment Channels
   - Job Postings

7. **07-offer-data.ts** - Offer management data
   - SELECTED applications ready for offer creation
   - Offers with different statuses (SENT, ACCEPTED, DECLINED, EXPIRED)
   - Additional SELECTED applications for testing

## Usage

### Run All Seed Files (Recommended)

```bash
npm run seed:all
```

This will execute all seed files in the correct order with progress indicators.

### Run Individual Seed Files

```bash
# Run specific seed file
npx ts-node prisma/seeds/01-base-data.ts
npx ts-node prisma/seeds/02-master-data.ts
# ... etc
```

### Use Original Seed File (Backup)

The original monolithic seed file remains available:

```bash
npm run seed
```

## Dependencies

Each seed file depends on data from previous files. They must be run in order:

- `02-master-data.ts` requires `01-base-data.ts`
- `03-candidate-data.ts` requires `01-base-data.ts` and `02-master-data.ts`
- `04-interview-data.ts` requires `01-base-data.ts` and `03-candidate-data.ts`
- `05-hiring-data.ts` requires `01-base-data.ts`, `02-master-data.ts`, `03-candidate-data.ts`, and `04-interview-data.ts`
- `06-configuration-data.ts` requires `01-base-data.ts` and `02-master-data.ts`
- `07-offer-data.ts` requires `01-base-data.ts`, `02-master-data.ts`, and `03-candidate-data.ts`

## Test Data Coverage

The seed files provide comprehensive test data for all 10 implementation prompts:

- **Workforce Plans**: 16 plans (2 per status × 8 statuses)
- **Recruitment Requests**: 12 requests (2 per status × 6 statuses)
- **Vacancies**: 20 total (14 status-coverage + 6 browse vacancies)
- **Applications**: All 12 statuses covered
- **Interviews**: All 6 statuses (SCHEDULED, RESCHEDULED, COMPLETED, CANCELLED, EVALUATION_PENDING, FINALIZED)
- **Hiring Minutes**: APPROVED, PENDING, REJECTED with full panels and signatories
- **Talent Roster**: All 4 statuses (ACTIVE, PLACED, INACTIVE, WITHDRAWN)
- **Test Vacancy**: VAC-TEST-001 with 3 evaluated candidates for evaluation testing
- **Offers**: 4 offers with different statuses (SENT, ACCEPTED, DECLINED, EXPIRED)
- **SELECTED Applications**: 6 applications ready for offer creation

## Test User Credentials

All test users use the default password: `Password`

| Role | Email |
|------|-------|
| CEO | ceo1@erms.com |
| HR Admin | hradmin1@erms.com |
| HR Specialist | hr1@erms.com |
| Recruiter | recruiter1@erms.com |
| Hiring Manager | hm1@erms.com |
| Dept Manager | dm1@erms.com |
| Interviewer | interviewer1@erms.com |
| Candidate | canduser1@erms.com |

## Benefits of Modular Seed Files

1. **Maintainability**: Each file focuses on a specific data domain
2. **Performance**: Can run only the seed files needed for specific testing
3. **Debugging**: Easier to isolate and fix issues in specific data domains
4. **Flexibility**: Can add new seed files without modifying existing ones
5. **Backup**: Original `seed.ts` remains unchanged as a fallback

## Adding New Seed Files

When adding a new seed file:

1. Name it with a numeric prefix indicating execution order (e.g., `07-new-feature.ts`)
2. Add it to the `seedFiles` array in `run-all-seeds.ts`
3. Document dependencies in this README
4. Ensure it uses `upsert` operations for idempotency
