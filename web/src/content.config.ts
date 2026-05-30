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
  }),
});

export const collections = { news };
