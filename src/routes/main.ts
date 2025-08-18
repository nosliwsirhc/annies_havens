import express, { Request, Response, Router } from 'express';
import { emailService } from '../services/email.js';
import { captchaService } from '../services/captcha.js';
import { getMetadata, getCanonicalUrl, getBaseRef } from '../utils/helpers.js';
import type { ContactFormData } from '../types/index.js';

const router: Router = express.Router();

// Main routes
router.get('/', (req: Request, res: Response): void => {
    res.render('home', {
        data: {
            baseRef: getBaseRef(),
            meta: getMetadata('home'),
            canonical: getCanonicalUrl(req)
        }
    });
});

router.get('/about-us', (req: Request, res: Response): void => {
    res.render('about-us', {
        data: {
            baseRef: getBaseRef(),
            meta: getMetadata('aboutUs'),
            canonical: getCanonicalUrl(req)
        }
    });
});

router.get('/care-programs', (req: Request, res: Response): void => {
    res.render('care-programs', {
        data: {
            baseRef: getBaseRef(),
            meta: getMetadata('carePrograms'),
            canonical: getCanonicalUrl(req)
        }
    });
});

router.get('/referral-sources', (req: Request, res: Response): void => {
    res.render('referral-sources', {
        data: {
            baseRef: getBaseRef(),
            meta: getMetadata('referralSources'),
            canonical: getCanonicalUrl(req)
        }
    });
});

router.get('/service-area', (req: Request, res: Response): void => {
    res.render('service-area', {
        data: {
            baseRef: getBaseRef(),
            meta: getMetadata('serviceArea'),
            canonical: getCanonicalUrl(req)
        }
    });
});

// Contact routes
router.get('/contact-us', (req: Request, res: Response): void => {
    res.render('contact-us', {
        data: {
            baseRef: getBaseRef(),
            meta: getMetadata('contactUs'),
            canonical: getCanonicalUrl(req)
        }
    });
});

router.post('/contact-us', async (req: Request, res: Response): Promise<void> => {
    try {
        const { token, email, firstName, lastName, subject, hasSpouse, stayAtHome, message }: ContactFormData & { token: string } = req.body;
        
        // Validate captcha
        const isCaptchaValid = await captchaService.verify(token, req.ip || '');
        if (!isCaptchaValid) {
            res.json({ success: false, message: 'Captcha verification failed' });
            return;
        }

        // Send emails
        await emailService.sendContactForm({
            email,
            firstName,
            lastName,
            subject,
            hasSpouse: Boolean(hasSpouse),
            stayAtHome: Boolean(stayAtHome),
            message
        });

        res.json({
            success: true,
            delivered: true,
            message: 'Your query has been submitted.'
        });

    } catch (error) {
        console.error('Contact form error:', error);
        res.json({
            success: false,
            message: 'We had some trouble processing your request.'
        });
    }
});

router.get('/contact-success', (req: Request, res: Response): void => {
    res.render('contact-success', {
        data: {
            baseRef: getBaseRef(),
            noFooter: true,
            canonical: getCanonicalUrl(req)
        }
    });
});

router.get('/privacy-policy', (req: Request, res: Response): void => {
    res.render('privacy-policy', {
        data: {
            baseRef: getBaseRef(),
            canonical: getCanonicalUrl(req)
        }
    });
});

export { router as mainRoutes };