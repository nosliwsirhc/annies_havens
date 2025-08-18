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

export const getCanonicalUrl = (req: Request): string => 
    `${req.protocol}://${req.get('host')}${req.originalUrl}`;