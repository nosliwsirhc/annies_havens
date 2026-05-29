// src/utils/helpers.ts
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import type { Request } from 'express';
import type { SiteMetadata } from '../types/index.js';

const getMetadataPath = (): string => {
    return path.join(process.cwd(), 'views/site.metadata.json');
};

export const getBaseRef = (): string => 'https://annieshavens.ca/';

export const getMetadata = (key: string): SiteMetadata => {
    try {
        const metadataPath = getMetadataPath();
        if (existsSync(metadataPath)) {
            const metadataContent = readFileSync(metadataPath, 'utf8');
            const metadata = JSON.parse(metadataContent);
            return metadata[key] || {};
        }
    } catch (error) {
        console.error('Failed to load metadata:', error);
    }
    return {};
};

// Canonical URLs are pinned to the www host (matching og:url and the sitemap)
// and exclude the query string so paginated/UTM variants don't fragment ranking.
const CANONICAL_ORIGIN = 'https://www.annieshavens.ca';

export const getCanonicalUrl = (req: Request): string =>
    req.path === '/' ? CANONICAL_ORIGIN : `${CANONICAL_ORIGIN}${req.path}`;