import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { errorHandler } from './middlewares/errorHandler';
import authRoutes from './routes/auth.routes';
import workforceRoutes from './routes/workforce.routes';
import recruitmentRoutes from './routes/recruitment.routes';
import vacancyRoutes from './routes/vacancy.routes';
import hiringMinuteRoutes from './routes/hiringMinute.routes';
import candidateRoutes from './routes/candidate.routes';
import interviewRoutes from './routes/interview.routes';
import offerRoutes from './routes/offer.routes';
import roasterRoutes from './routes/roaster.routes';
import reportingRoutes from './routes/reporting.routes';
import configRoutes from './routes/config.routes';
import jobPostingRoutes from './routes/jobPosting.routes';
import usersRoutes from './routes/users.routes';
import { startVacancyExpiryScheduler } from './jobs/closeExpiredVacancies';

const app: Application = express();

// 1. GLOBAL MIDDLEWARES
app.use(helmet({
  crossOriginEmbedderPolicy: false,
})); // Security headers with relaxed CORS for images
app.use(cors()); // Enable CORS
app.use(morgan('dev')); // Request logging
app.use(express.json()); // Body parser
// Serve uploaded files — resolve correctly for both ts-node (src/) and compiled (dist/)
const uploadsPath = path.resolve(__dirname, '../uploads');
app.use('/uploads', cors(), express.static(uploadsPath));
// 2. HEALTH CHECK
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'ERMS API is running smoothly',
    timestamp: new Date().toISOString(),
  });
});

// authentication route
app.use('/api/v1/auth', authRoutes);

// workforce planning
app.use('/api/v1/workforce', workforceRoutes);

// recruitment request
app.use('/api/v1/recruitment', recruitmentRoutes);

// vacancy management
app.use('/api/v1/vacancies', vacancyRoutes);

// hiring minute management
app.use('/api/v1/hiring-minutes', hiringMinuteRoutes);

// candidate Routes
app.use('/api/v1/candidates', candidateRoutes);

// Interview Routes
app.use('/api/v1/interviews', interviewRoutes);

// offer Routes
app.use('/api/v1/offers', offerRoutes);

// talent roaster
app.use('/api/v1/roaster', roasterRoutes);

// reporting routes
app.use('/api/v1/reporting', reportingRoutes);

// configuration routes
app.use('/api/v1/config', configRoutes);

// job posting routes
app.use('/api/v1/job-postings', jobPostingRoutes);

// users listing
app.use('/api/v1/users', usersRoutes);

// Start background jobs
startVacancyExpiryScheduler();

// 4. GLOBAL ERROR HANDLER (Must be last)
app.use(errorHandler);

export default app;
