import express, { Request, Response, Router } from 'express';
import { emailService } from '../services/email.js';
import { captchaService } from '../services/captcha.js';
import { getMetadata, getCanonicalUrl, getBaseRef } from '../utils/helpers.js';
import { isValidEmail, validateText } from '../utils/sanitize.js';
import { csrfProtection, formRateLimiter } from '../middleware/security.js';
import type { FAQFormData } from '../types/index.js';

const router: Router = express.Router();

router.get('/foster-care-in-ontario', (req: Request, res: Response): void => {
    res.render('foster-care-in-ontario', {
        data: {
            baseRef: getBaseRef(),
            meta: getMetadata('fosterOntario'),
            canonical: getCanonicalUrl(req)
        }
    });
});

router.get('/what-is-foster-parenting', (req: Request, res: Response): void => {
    res.render('what-is-foster-parenting', {
        data: {
            baseRef: getBaseRef(),
            meta: getMetadata('whatIsFosterParenting'),
            canonical: getCanonicalUrl(req)
        }
    });
});

router.get('/faq', (req: Request, res: Response): void => {
    res.render('faq', {
        data: {
            baseRef: getBaseRef(),
            meta: getMetadata('faq'),
            canonical: getCanonicalUrl(req)
        }
    });
});

router.post(
    '/faq',
    formRateLimiter,
    csrfProtection,
    async (req: Request, res: Response): Promise<void> => {
    try {
        const { token, email } = req.body;

        if (!isValidEmail(email)) {
            res.json({ success: false, message: 'Please provide a valid email address.' });
            return;
        }

        const firstName = validateText(req.body.firstName, 100);
        const lastName = validateText(req.body.lastName, 100);
        const question = validateText(req.body.question, 5000);
        if (!firstName || !lastName || !question) {
            res.json({ success: false, message: 'Please complete all required fields.' });
            return;
        }

        // Validate captcha
        const isCaptchaValid = await captchaService.verify(token, req.ip || '');
        if (!isCaptchaValid) {
            res.json({ success: false, message: 'Captcha verification failed' });
            return;
        }

        // Send FAQ question
        await emailService.sendFAQQuestion({
            email,
            firstName,
            lastName,
            question
        });

        res.json({
            success: true,
            delivered: true,
            message: 'Your question has been submitted.'
        });

    } catch (error) {
        console.error('FAQ submission error:', error);
        res.json({
            success: false,
            message: 'We had some trouble delivering your question.'
        });
    }
    }
);

router.get('/children-in-care', (req: Request, res: Response): void => {
    res.render('children-in-care', {
        data: {
            baseRef: getBaseRef(),
            meta: getMetadata('childrenInCare'),
            canonical: getCanonicalUrl(req)
        }
    });
});

router.get('/family-involvement', (req: Request, res: Response): void => {
    res.render('family-involvement', {
        data: {
            baseRef: getBaseRef(),
            meta: getMetadata('familyInvolvement'),
            canonical: getCanonicalUrl(req)
        }
    });
});

router.get('/foster-parent-application-process', (req: Request, res: Response): void => {
    res.render('foster-parent-application-process', {
        data: {
            baseRef: getBaseRef(),
            meta: getMetadata('fosterParentApplicationProcess'),
            canonical: getCanonicalUrl(req)
        }
    });
});

router.get('/foster-home-quiz', (req: Request, res: Response): void => {
    res.render('foster-home-quiz', {
        data: {
            baseRef: getBaseRef(),
            meta: getMetadata('fosterHomeQuiz'),
            canonical: getCanonicalUrl(req)
        }
    });
});

router.get('/faq-submit-success', (req: Request, res: Response): void => {
    res.render('faq-submit-success', {
        data: {
            baseRef: getBaseRef(),
            noFooter: true,
            noindex: true,
            canonical: getCanonicalUrl(req)
        }
    });
});

router.get('/faq-success', (req: Request, res: Response): void => {
    res.redirect(301, '/faq-submit-success');
});

export { router as fosterParentingRoutes };