#!/usr/bin/env node
/**
 * generate-content.mjs
 *
 * Generates N original, non-plagiarized articles for a single site and
 * writes them as Markdown files into that site's src/content/articles/
 * folder in the exact frontmatter shape the Astro template expects.
 *
 * Supports two providers - picks whichever API key is set, Gemini first
 * because it's genuinely free on an ongoing basis (no card, daily quota):
 *
 *   GEMINI_API_KEY=...    (default/preferred - free tier, get a key at
 *                          https://aistudio.google.com/apikey, no card needed)
 *   ANTHROPIC_API_KEY=...  (fallback - paid, higher quality, a few cents/article)
 *
 * Usage:
 *   GEMINI_API_KEY=... node scripts/generate-content.mjs --site ./sites/zodiac-decoded --count 1
 *
 * Note on Gemini's free tier: it's rate-limited (roughly 250-1,000+
 * requests/day depending on model, no credit card, resets daily) and Google
 * may use free-tier inputs/outputs to improve their models - fine for this
 * use case, but don't route anything sensitive through it. At the default
 * cadence of 1 article/day/site across 50 sites (2 API calls per article =
 * ~100 calls/day total), this comfortably fits inside the free quota.
 */

import fs from 'node:fs';
import path from 'node:path';

const args = parseArgs(process.argv.slice(2));

if (!args.site) {
  console.error('Usage: node generate-content.mjs --site <path-to-site-dir> [--count N]');
  process.exit(1);
}

const geminiKey = process.env.GEMINI_API_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;
const provider = geminiKey ? 'gemini' : anthropicKey ? 'anthropic' : null;

if (!provider) {
  console.error(
    'No API key found. Set GEMINI_API_KEY (free - https://aistudio.google.com/apikey) ' +
    'or ANTHROPIC_API_KEY (paid - https://console.anthropic.com).'
  );
  process.exit(1);
}

const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

const siteDir = path.resolve(args.site);
const configPath = path.join(siteDir, 'site.config.json');
const articlesDir = path.join(siteDir, 'src', 'content', 'articles');

if (!fs.existsSync(configPath)) {
  console.error(`No site.config.json found at ${configPath}`);
  process.exit(1);
}

const siteConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const count = Number(args.count || siteConfig.contentGeneration?.articlesPerRun || 1);

fs.mkdirSync(articlesDir, { recursive: true });

const existingSlugs = new Set(
  fs.readdirSync(articlesDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      out[key] = val;
    }
  }
  return out;
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pickTopic() {
  const keywords = siteConfig.contentGeneration?.seedKeywords || [];
  const keyword = keywords.length
    ? keywords[Math.floor(Math.random() * keywords.length)]
    : siteConfig.niche;

  const prompt = `You are a topic strategist for a content site in the "${siteConfig.niche}" niche, audience: ${siteConfig.contentGeneration?.audience || 'general readers'}.

Suggest ONE specific, non-generic article topic related to the seed keyword/phrase "${keyword}" that a real reader would search for. Avoid anything already covered by these existing article slugs: ${[...existingSlugs].join(', ') || 'none yet'}.

Reply with ONLY a JSON object, no markdown fences, in this exact shape:
{"title": "...", "description": "..."}

The title should be specific and click-worthy but NOT misleading/clickbait about facts. The description is a 1-sentence SEO meta description (under 155 characters).`;

  const data = await callModel(prompt, 300);
  return JSON.parse(extractJson(data));
}

async function writeArticle(topic) {
  const offer = (siteConfig.affiliate?.offers || [])[0];
  const prompt = `Write an original, helpful, plain-language article for a content website.

Site niche: ${siteConfig.niche}
Audience: ${siteConfig.contentGeneration?.audience || 'general readers'}
Tone: ${siteConfig.contentGeneration?.tone || 'helpful, practical'}
Article title: ${topic.title}

Requirements (these matter for Google's actual ranking/spam policies, not just readability - generic AI filler at scale is what gets sites penalized, specificity is what protects them):
- 700-1000 words, original writing only - do not copy or closely paraphrase any specific existing source, article, or publication. Write it from scratch based on general knowledge.
- Format as Markdown with H2 (##) subheadings, short paragraphs, and at least one bullet list.
- Be concretely specific, not generic: include real scenarios, examples, or step-by-step detail a reader could actually act on today. Avoid vague filler sentences that could apply to any topic in this niche ("it's important to understand your feelings", "everyone is different") - say something a generic listicle wouldn't.
- Genuinely useful and accurate. No fabricated statistics, studies, quotes, or citations to specific research.
- Do not include a title heading (the page template renders the title separately) - start directly with the body.
- Naturally set up (but do not write the CTA itself) for a recommendation box about: "${offer?.name || 'a relevant product/service'}" - end the article with a short paragraph that transitions into "next steps," since a call-to-action box is inserted automatically after the article.
- Do not use the words "unleash", "delve", "in today's world", or other AI-cliche phrases.`;

  const body = await callModel(prompt, 2000);
  return body.trim();
}

async function callModel(prompt, maxTokens) {
  return provider === 'gemini' ? callGemini(prompt, maxTokens) : callClaude(prompt, maxTokens);
}

async function callGemini(prompt, maxTokens) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.9 }
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const candidate = json.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text).join('') || '';
  if (!text) throw new Error(`Gemini returned no text (finishReason: ${candidate?.finishReason || 'unknown'})`);
  return text;
}

async function callClaude(prompt, maxTokens) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: anthropicModel,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  return json.content.map((c) => c.text).join('');
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Could not find JSON in model output: ${text}`);
  return match[0];
}

function frontmatter(topic, offerId) {
  const today = new Date().toISOString().slice(0, 10);
  const esc = (s) => s.replace(/"/g, '\\"');
  return [
    '---',
    `title: "${esc(topic.title)}"`,
    `description: "${esc(topic.description)}"`,
    `pubDate: ${today}`,
    `keywords: ${JSON.stringify(siteConfig.contentGeneration?.seedKeywords || [])}`,
    `affiliateOfferId: "${offerId || ''}"`,
    'draft: false',
    '---',
    ''
  ].join('\n');
}

async function main() {
  console.log(`[${provider}] Generating ${count} article(s) for ${siteConfig.siteName} (${siteDir})`);
  const offer = (siteConfig.affiliate?.offers || [])[0];

  for (let i = 0; i < count; i++) {
    try {
      const topic = await pickTopic();
      if (provider === 'gemini') await sleep(1500); // stay well under free-tier RPM limits

      let slug = slugify(topic.title);
      if (existingSlugs.has(slug)) slug = `${slug}-${Date.now()}`;
      existingSlugs.add(slug);

      const body = await writeArticle(topic);
      if (provider === 'gemini') await sleep(1500);

      const filePath = path.join(articlesDir, `${slug}.md`);
      fs.writeFileSync(filePath, frontmatter(topic, offer?.id) + body + '\n');
      console.log(`  wrote ${slug}.md`);
    } catch (err) {
      console.error(`  failed on article ${i + 1}:`, err.message);
    }
  }
}

main();
