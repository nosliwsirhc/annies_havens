import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// News posts live as Markdown in src/content/news/. Adding a post = adding a file.
const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    author: z.string().default("Annie's Havens"),
    youtube: z.string().optional(), // YouTube video id
    // Optional hero image: path under /public WITHOUT extension, e.g.
    // "/images/special-needs-group". Responsive avif/webp/jpg variants
    // (-640/-1024/-1440/-1920) are used when present.
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    // Short kicker shown above the headline (defaults to "News").
    kicker: z.string().default('News'),
  }),
});

export const collections = { news };
