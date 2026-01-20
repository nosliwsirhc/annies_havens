import type { RequestHandler } from 'express';
import { doubleCsrf } from 'csrf-csrf';
import rateLimit from 'express-rate-limit';

const { generateToken, doubleCsrfProtection } = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET || 'change-me-in-prod',
    cookieName: 'csrf-token',
    cookieOptions: {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    },
    size: 64
});

export const csrfProtection: RequestHandler = doubleCsrfProtection;
export const csrfTokenGenerator: RequestHandler = (req, res, next) => {
    res.locals.csrfToken = generateToken(res, req);
    next();
};

export const formRateLimiter: RequestHandler = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false
}) as RequestHandler;
