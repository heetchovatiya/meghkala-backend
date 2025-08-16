import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db';
import apiRoutes from './routes';
import { notFound, errorHandler } from './middleware/error.middleware';

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app: Application = express();

// Middleware
// app.use(cors()); // Enable Cross-Origin Resource Sharing
const allowedOrigins = [
  'http://localhost:3000', // For local development
  'https://testing.meghkala.in' ,// Your new testing domain
  'meghkala-frontend.vercel.app'

];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));
app.use(express.json()); // To parse JSON bodies

// API Routes
app.get('/', (req: Request, res: Response) => {
  res.send('API is running...');
});

app.use('/api', apiRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));