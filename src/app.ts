import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
// Initialize the app
const app: Application = express();

// --- Global Middlewares ---

// 1. Security Headers (OWASP recommendation)
app.use(helmet());

// 2. CORS (Allow requests from your Frontend/Mobile App)
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*", // Restrict this in production!
    credentials: true,
  })
);

// 3. Body Parsers
app.use(express.json()); // Parse JSON bodies (as sent by API clients)
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// --- Routes ---

// Health Check (Used by Load Balancers/AWS/Render)
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "UP", timestamp: new Date() });
});

// Import your routes here later
// app.use('/api/v1/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
// --- Global Error Handler ---
// This prevents the server from leaking stack traces to the user
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

export default app;
