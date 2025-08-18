import 'dotenv/config';
import express, { Application } from 'express';
import { engine } from 'express-handlebars';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

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
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../assets')));

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

console.log('Views directory:', viewsPath); // Debug line

// Routes
app.use('/', mainRoutes);
app.use('/foster-parenting', fosterParentingRoutes);
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