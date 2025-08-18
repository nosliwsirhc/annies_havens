import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
    statusCode?: number;
}

export const errorHandler = (
    err: CustomError, 
    req: Request, 
    res: Response, 
    next: NextFunction
): void => {
    console.error('Error:', err);
    
    if (res.headersSent) {
        next(err);
        return;
    }

    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Something went wrong!' 
        : err.message;

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};