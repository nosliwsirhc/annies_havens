import 'dotenv/config';
import express, { Application, Response } from 'express';
import helmet from 'helmet';
import { engine } from 'express-handlebars';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { minify } from 'html-minifier-terser';
import cookieParser from 'cookie-parser';
import { csrfTokenGenerator } from './middleware/security.js';

// Import route modules
import { mainRoutes } from './routes/main.js';
import { fosterParentingRoutes } from './routes/foster-parenting.js';
import { newsRoutes } from './routes/news.js';
import { redirectRoutes } from './routes/redirects.js';
import { errorHandler } from './middleware/errorHandler.js';

// ES6 module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Application = express();

// Middleware setup
app.disable('x-powered-by');
app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            defaultSrc: ["'self'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            objectSrc: ["'none'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://cdnjs.cloudflare.com',
                'https://cdn.callrail.com',
                'https://www.googletagmanager.com',
                'https://www.google-analytics.com',
                'https://connect.facebook.net',
                'https://platform.twitter.com',
                'https://www.google.com',
                'https://www.gstatic.com',
                'https://www.recaptcha.net'
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://fonts.googleapis.com',
                'https://cdnjs.cloudflare.com'
            ],
            fontSrc: [
                "'self'",
                'https://fonts.gstatic.com',
                'data:'
            ],
            imgSrc: [
                "'self'",
                'data:',
                'blob:',
                'https:'
            ],
            connectSrc: [
                "'self'",
                'https://www.google.com',
                'https://region1.google-analytics.com',
                'https://www.google-analytics.com',
                'https://www.googletagmanager.com',
                'https://stats.g.doubleclick.net',
                'https://cdn.callrail.com',
                'https://connect.facebook.net',
                'https://www.facebook.com',
                'https://platform.twitter.com',
                'https://syndication.twitter.com',
                'https://api.twitter.com'
            ],
            frameSrc: [
                "'self'",
                'https://www.google.com',
                'https://www.recaptcha.net',
                'https://www.facebook.com',
                'https://platform.twitter.com',
                'https://www.googletagmanager.com'
            ]
        }
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
if (process.env.NODE_ENV === 'production') {
    app.use(helmet.hsts({
        maxAge: 15552000,
        includeSubDomains: true,
        preload: true
    }));
}
app.set('trust proxy', 1);
app.use(compression());
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: false, limit: '200kb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../assets'), {
    maxAge: process.env.NODE_ENV === 'production' ? '30d' : 0
}));

// Handlebars setup
const viewsPath = path.join(__dirname, '../views');

app.engine('.hbs', engine({
    defaultLayout: 'main',
    extname: '.hbs',
    layoutsDir: `${viewsPath}/layouts`,
    partialsDir: `${viewsPath}/partials`,
    helpers: {
        section: function(this: any, name: string, options: any): null {
            if (!this._sections) this._sections = {};
            this._sections[name] = options.fn(this);
            return null;
        }
    }
}));

app.set('views', viewsPath);
app.set('view engine', '.hbs');

if (process.env.NODE_ENV !== 'production') {
    console.log('Views directory:', viewsPath); // Debug line
}

app.use((req, res, next) => {
    res.locals.stylesHref = process.env.NODE_ENV === 'production'
        ? '/css/styles.min.css'
        : '/css/styles.css';
    res.locals.scriptsSrc = process.env.NODE_ENV === 'production'
        ? '/js/scripts.min.js'
        : '/js/scripts.js';
    next();
});

app.use((req, res, next) => {
    if (req.method !== 'GET') {
        next();
        return;
    }

    const acceptHeader = req.headers.accept || '';
    if (!acceptHeader.includes('text/html')) {
        next();
        return;
    }

    csrfTokenGenerator(req, res, next);
});

const htmlCache = new Map<string, string>();
const htmlCacheMaxEntries = 100;

app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        next();
        return;
    }

    const originalSend = res.send.bind(res);
    res.send = (body: any): Response => {
        const contentType = res.get('Content-Type');
        if (contentType && contentType.includes('text/html')) {
            if (req.method === 'GET') {
                const cached = htmlCache.get(req.originalUrl);
                if (cached) {
                    return originalSend(cached);
                }
            }

            const minifyOptions = {
                collapseWhitespace: true,
                removeComments: true,
                removeRedundantAttributes: true,
                removeEmptyAttributes: true,
                minifyCSS: true,
                minifyJS: true
            };
            void (async () => {
                try {
                    const minified = await minify(String(body), minifyOptions);
                    if (req.method === 'GET') {
                        htmlCache.set(req.originalUrl, minified);
                        if (htmlCache.size > htmlCacheMaxEntries) {
                            const oldestKey = htmlCache.keys().next().value;
                            if (oldestKey) {
                                htmlCache.delete(oldestKey);
                            }
                        }
                    }
                    originalSend(minified);
                } catch {
                    originalSend(body);
                }
            })();
            return res;
        }

        return originalSend(body);
    };

    next();
});

// Routes
app.use('/', mainRoutes);
app.use('/', fosterParentingRoutes);
app.use('/news', newsRoutes);
app.use('/', redirectRoutes);

// 404 handler
app.get('*', (req, res) => {
    res.status(404).sendFile(
        path.join(__dirname, '../html_templates/page-not-found.html')
    );
});

// Error handling middleware
app.use(errorHandler);

export default app;