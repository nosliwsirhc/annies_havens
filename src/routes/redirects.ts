import express, { Request, Response, Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router: Router = express.Router();

// Redirect from old site links
// router.get('/care-program', (req: Request, res: Response): void => {
//     res.redirect(301, '/care-programs');
// });

// router.get('/care-program/mission-statement', (req: Request, res: Response): void => {
//     res.redirect(301, '/care-programs#mission-statement');
// });

// router.get('/care-program/special-needs-homes', (req: Request, res: Response): void => {
//     res.redirect(301, '/care-programs#special-needs');
// });

// router.get('/care-program/trauma-focused/homes', (req: Request, res: Response): void => {
//     res.redirect(301, '/care-programs#trauma-focused');
// });

// router.get('/care-program/childrens-aid-service-partners', (req: Request, res: Response): void => {
//     res.redirect(301, '/referral-sources');
// });

// router.get('/care-program/service-regions', (req: Request, res: Response): void => {
//     res.redirect(301, '/service-area');
// });

// router.get('/becoming-foster-parent/faq', (req: Request, res: Response): void => {
//     res.redirect(301, '/foster-parenting/faq');
// });

// router.get('/becoming-foster-parent/do-i-qualify', (req: Request, res: Response): void => {
//     res.redirect(301, '/foster-parenting/foster-home-quiz');
// });

// router.get('/becoming-foster-parent/children-in-care', (req: Request, res: Response): void => {
//     res.redirect(301, '/foster-parenting/children-in-care');
// });

// router.get('/becoming-foster-parent/what-is-foster-parenting', (req: Request, res: Response): void => {
//     res.redirect(301, '/foster-parenting/what-is-foster-parenting');
// });

// router.get('/becoming-foster-parent/family-involvement', (req: Request, res: Response): void => {
//     res.redirect(301, '/foster-parenting/family-involvement');
// });

// router.get('/becoming-foster-parent/application-process', (req: Request, res: Response): void => {
//     res.redirect(301, '/foster-parenting/foster-parent-application-process');
// });

// router.get('/our-story', (req: Request, res: Response): void => {
//     res.redirect(301, '/about-us');
// });

// router.get('/contact', (req: Request, res: Response): void => {
//     res.redirect(301, '/contact-us');
// });

// router.get('/urgent-need-for-foster-parents', (req: Request, res: Response): void => {
//     res.redirect(301, '/news/urgent-need-for-foster-parents-in-ontario');
// });

// Sitemap route
router.get('/sitemap', (req: Request, res: Response): void => {
    res.status(200).sendFile(
        path.join(__dirname, '../../assets/sitemap'), 
        { root: process.cwd() }
    );
});

export { router as redirectRoutes };