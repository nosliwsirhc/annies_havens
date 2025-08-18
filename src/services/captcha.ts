import type { CaptchaVerificationResponse } from '../types/index.js';
import { config } from '../config/index.js';

class CaptchaService {
    async verify(token: string, remoteIp: string): Promise<boolean> {
        if (!token) {
            return false;
        }

        try {
            const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${config.captcha.secret}&response=${token}&remoteip=${remoteIp}`;
            
            const response = await fetch(verificationUrl, { method: 'POST' });
            const data = await response.json() as CaptchaVerificationResponse;
            
            return data.success === true;
        } catch (error) {
            console.error('Captcha verification error:', error);
            return false;
        }
    }
}

export const captchaService = new CaptchaService();