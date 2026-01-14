import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";

// New DDD module routes
import { authRoutes } from './modules/auth';
import { profileRoutes } from './modules/profile';

// Shared middleware
import {
  errorHandler,
  notFoundHandler,
  requestSanitizer,
  CacheManager
} from './shared';
import path from "path";

// Initialize the app
const app: Application = express();

// --- Global Middlewares ---

// 1. Security Headers (OWASP recommendation)
// Enhanced Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding
}));

// 2. CORS (Allow requests from your Frontend/Mobile App)
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 3. Body Parsers
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Request Sanitization (XSS/Injection prevention)
app.use(requestSanitizer);

// --- Routes ---

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Welcome to the Matrimony API",
    version: "2.0.0",
    docs: "apidoc.html"
  });
});

// Health Check (Used by Load Balancers/AWS/Render)
app.get("/health", async (req: Request, res: Response) => {
  const cacheHealthy = await CacheManager.isHealthy();
  res.status(200).json({
    status: "UP",
    timestamp: new Date(),
    cache: cacheHealthy ? "connected" : "unavailable"
  });
});


app.get("/apidoc.html", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "..", "apidoc.html"));
})

// API Routes (DDD Modules)
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);

// --- 404 Handler ---
app.use(notFoundHandler);

// --- Global Error Handler ---
// Centralized error handling with consistent response format
app.use(errorHandler);

export default app;
