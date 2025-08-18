import type { AppConfig } from '../types/index.js';

export const config: AppConfig = {
    port: parseInt(process.env.PORT || '3000', 10),
    baseUrl: 'https://annieshavens.ca/',
    
    captcha: {
        secret: process.env.CAPTCHA_SECRET || ''
    },
    
    smtp: {
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        user: process.env.SMTP_AUTH_USER || '',
        password: process.env.SMTP_AUTH_PASSWORD || '',
        tlsCiphers: process.env.SMTP_TLS_CIPHERS || ''
    }
};