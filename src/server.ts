import app from './app';
import dotenv from 'dotenv';
// import { Pool } from 'pg'; // Optional: If verifying DB connection on start

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// Handle Uncaught Exceptions (Synchronous errors that crash the process)
process.on('uncaughtException', (err: Error) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    process.exit(1);
});

// Start the Server
const server = app.listen(PORT, () => {
    console.log(`✅ Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle Unhandled Rejections (Async promises that failed without catch)
process.on('unhandledRejection', (err: any) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    // Gracefully close server before exiting
    server.close(() => {
        process.exit(1);
    });
});

// Handle SIGTERM (e.g., Heroku/AWS shutting down the instance)
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    server.close(() => {
        console.log('💥 Process terminated!');
    });
});