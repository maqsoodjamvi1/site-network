import { defineCollection, z } from 'astro:content';

const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    keywords: z.array(z.string()).default([]),
    affiliateOfferId: z.string().optional(),
    draft: z.boolean().default(false)
  })
});

export const collections = { articles };
