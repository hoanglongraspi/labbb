import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patient.routes';
import evaluationRoutes from './routes/evaluation.routes';
import audiogramRoutes from './routes/audiogram.routes';
import educationRoutes from './routes/education.routes';
import userRoutes from './routes/user.routes';
import engagementRoutes from './routes/engagement.routes';
import appointmentRoutes from './routes/appointment.routes';
import symptomRoutes from './routes/symptom.routes';
import goalRoutes from './routes/goal.routes';
import messageRoutes from './routes/message.routes';
import forumRoutes from './routes/forum.routes';
import mobileRoutes from './routes/mobile.routes';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/audiograms', audiogramRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/engagement', engagementRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/mobile', mobileRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
