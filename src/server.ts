import app from './app';
import dotenv from 'dotenv';
import { CacheManager } from './shared';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5001;

/**
 * Application Bootstrap
 * 
 * Initializes all services and starts the HTTP server.
 */
async function bootstrap() {
    try {
        // Initialize cache (Redis or in-memory fallback)
        await CacheManager.initialize();
        console.log('✅ Cache initialized');

        // Start the Server
        const server = app.listen(PORT, () => {
            console.log(`✅ Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        });

        // Handle Uncaught Exceptions (Synchronous errors)
        process.on('uncaughtException', (err: Error) => {
            console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
            console.error(err.name, err.message);
            process.exit(1);
        });

        // Handle Unhandled Rejections (Async promises that failed)
        process.on('unhandledRejection', (err: Error) => {
            console.error('UNHANDLED REJECTION! 💥 Shutting down...');
            console.error(err.name, err.message);
            server.close(() => {
                process.exit(1);
            });
        });

        // Handle SIGTERM (e.g., Heroku/AWS shutting down)
        process.on('SIGTERM', async () => {
            console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
            await CacheManager.shutdown();
            server.close(() => {
                console.log('💥 Process terminated!');
            });
        });

        // Handle SIGINT (Ctrl+C)
        process.on('SIGINT', async () => {
            console.log('👋 SIGINT RECEIVED. Shutting down gracefully');
            await CacheManager.shutdown();
            server.close(() => {
                console.log('💥 Process terminated!');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the application
bootstrap();