#!/usr/bin/env node
/**
 * daily-publish.mjs
 *
 * Orchestrator: for every site under ./sites/, generate today's batch of
 * articles, then (optionally) commit and push so the connected static host
 * (Cloudflare Pages / Netlify) auto-deploys. Intended to be run on a schedule
 * (see ../.github/workflows/daily-content.yml) so publishing needs zero
 * manual work once it's wired up.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/daily-publish.mjs
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/daily-publish.mjs --no-git
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const sitesDir = path.join(root, 'sites');
const skipGit = process.argv.includes('--no-git');

if (!fs.existsSync(sitesDir)) {
  console.error('No ./sites directory found. Run scripts/scaffold-sites.mjs first.');
  process.exit(1);
}

const siteSlugs = fs.readdirSync(sitesDir).filter((f) =>
  fs.statSync(path.join(sitesDir, f)).isDirectory()
);

console.log(`Publishing to ${siteSlugs.length} site(s): ${siteSlugs.join(', ')}`);

for (const slug of siteSlugs) {
  const siteDir = path.join(sitesDir, slug);
  console.log(`\n=== ${slug} ===`);
  try {
    execFileSync('node', [path.join(root, 'scripts', 'generate-content.mjs'), '--site', siteDir], {
      stdio: 'inherit',
      env: process.env
    });
  } catch (err) {
    console.error(`generation failed for ${slug}: ${err.message}`);
  }
}

if (!skipGit) {
  try {
    execFileSync('git', ['add', '.'], { cwd: root, stdio: 'inherit' });
    const message = `content: daily auto-publish ${new Date().toISOString().slice(0, 10)}`;
    execFileSync('git', ['commit', '-m', message], { cwd: root, stdio: 'inherit' });
    execFileSync('git', ['push'], { cwd: root, stdio: 'inherit' });
    console.log('\nCommitted and pushed - static host will auto-deploy.');
  } catch (err) {
    console.log(`\nNothing to commit or git step failed (${err.message}). If you deploy differently, run with --no-git.`);
  }
}
