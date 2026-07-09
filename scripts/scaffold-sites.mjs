#!/usr/bin/env node
/**
 * scaffold-sites.mjs
 *
 * Reads sites.config.json (the master list of 8-10 sites) and generates a
 * full, independent Astro site under ./sites/<slug>/ for each entry, cloned
 * from ./template/ with that site's config baked in.
 *
 * Usage:
 *   node scripts/scaffold-sites.mjs
 *   node scripts/scaffold-sites.mjs --only credit-score-basics
 *
 * Safe to re-run: it will refuse to overwrite a site directory that already
 * has generated articles in it, so re-running after editing sites.config.json
 * only affects sites you haven't started writing content for yet. Delete a
 * site's folder manually if you want to fully regenerate it from scratch.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const templateDir = path.join(root, 'template');
const sitesDir = path.join(root, 'sites');
const masterConfigPath = path.join(root, 'sites.config.json');

const args = process.argv.slice(2);
const onlyIdx = args.indexOf('--only');
const only = onlyIdx !== -1 ? args[onlyIdx + 1] : null;

const master = JSON.parse(fs.readFileSync(masterConfigPath, 'utf8'));
fs.mkdirSync(sitesDir, { recursive: true });

for (const site of master.sites) {
  if (only && site.slug !== only) continue;

  const targetDir = path.join(sitesDir, site.slug);
  const articlesDir = path.join(targetDir, 'src', 'content', 'articles');

  if (fs.existsSync(articlesDir) && fs.readdirSync(articlesDir).some((f) => f.endsWith('.md'))) {
    console.log(`skip ${site.slug}: already has generated articles, leaving it alone`);
    continue;
  }

  console.log(`scaffolding ${site.slug} -> ${targetDir}`);
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.cpSync(templateDir, targetDir, {
    recursive: true,
    filter: (src) => !src.includes(`${path.sep}node_modules`) && !src.includes(`${path.sep}dist`)
  });

  writeSiteConfig(targetDir, site);
  updateAstroConfigDomain(targetDir, site.domain);
  generateBranding(targetDir);
}

function writeSiteConfig(targetDir, site) {
  const configPath = path.join(targetDir, 'site.config.json');
  const base = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  base.siteName = site.siteName;
  base.domain = site.domain;
  base.niche = site.niche;
  base.tagline = site.tagline;
  base.affiliate.offers = [
    {
      id: 'offer-1',
      name: site.affiliateOfferName,
      link: site.affiliateLink,
      ctaText: base.affiliate.offers[0]?.ctaText || 'Learn More'
    }
  ];
  base.contentGeneration.seedKeywords = site.seedKeywords;

  fs.writeFileSync(configPath, JSON.stringify(base, null, 2) + '\n');
}

function updateAstroConfigDomain(targetDir, domain) {
  const configPath = path.join(targetDir, 'astro.config.mjs');
  let content = fs.readFileSync(configPath, 'utf8');
  content = content.replace(/site:\s*'https:\/\/[^']*'/, `site: 'https://${domain}'`);
  fs.writeFileSync(configPath, content);
}

function generateBranding(targetDir) {
  const brandingScript = path.join(root, 'scripts', 'generate-branding.mjs');
  try {
    execFileSync('node', [brandingScript, '--site', targetDir], { stdio: 'pipe' });
  } catch (err) {
    console.warn(
      `  (skipped auto-branding for ${path.basename(targetDir)} - ImageMagick ("convert") not available here. ` +
      `Run \`node scripts/generate-branding.mjs --all\` later on a machine that has it, e.g. in CI.)`
    );
  }
}

console.log('Done. Each site under ./sites/<slug>/ is an independent Astro project - review site.config.json for each before generating content or deploying.');
