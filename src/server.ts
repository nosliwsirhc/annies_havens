import app from './app.js';
import { emailService } from './services/email.js';
import { config } from './config/index.js';

const startServer = async (): Promise<void> => {
    try {
        // Initialize services before starting server
        await emailService.initialize();
        
        app.listen(config.port, () => {
            console.log(`🚀 Server started on port ${config.port}`);
            console.log(`📧 Email service: ${emailService.isConnected() ? 'Connected' : 'Disconnected'}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGTERM', (): void => {
    console.log('👋 SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', (): void => {
    console.log('👋 SIGINT received, shutting down gracefully');
    process.exit(0);
});

startServer();