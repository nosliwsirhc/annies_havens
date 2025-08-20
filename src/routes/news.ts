import express, { Request, Response, Router } from 'express';
import { getMetadata, getCanonicalUrl, getBaseRef } from '../utils/helpers.js';

const router: Router = express.Router();

router.get('/', (req: Request, res: Response): void => {
    res.render('news/index', {
        data: {
            baseRef: getBaseRef(),
            meta: getMetadata('news'),
            canonical: getCanonicalUrl(req)
        }
    });
});

router.get('/urgent-need-for-foster-parents-in-ontario', (req: Request, res: Response): void => {
    res.render('news/urgent-need-for-foster-parents-in-ontario', {
        data: {
            baseRef: getBaseRef(),
            meta: getMetadata('urgentNeedForFosterParentsInOntario'),
            canonical: getCanonicalUrl(req)
        }
    });
});

export { router as newsRoutes };