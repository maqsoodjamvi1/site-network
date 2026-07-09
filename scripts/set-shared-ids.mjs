#!/usr/bin/env node
/**
 * set-shared-ids.mjs
 *
 * You have one AdSense account (and usually one GA property, one Meta
 * Pixel, etc.) covering all 50 sites - the same ID goes into every site's
 * site.config.json. Editing that by hand 50 times is exactly the kind of
 * busywork this project is trying to avoid, so this does it in one command.
 *
 * Each site is its own independent Cloudflare Pages project/domain, so each
 * one builds its own separate ads.txt at its own root automatically (see
 * src/pages/ads.txt.ts) - you just need the same publisher ID written into
 * every site's config once.
 *
 * Usage:
 *   node scripts/set-shared-ids.mjs --adsense ca-pub-1234567890123456
 *   node scripts/set-shared-ids.mjs --adsense ca-pub-123... --ga G-ABCDEF1234 --meta-pixel 123456789
 *   node scripts/set-shared-ids.mjs --medianet your-medianet-site-id
 *   node scripts/set-shared-ids.mjs --adsense ca-pub-123... --only zodiac-decoded,relationship-clarity
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const sitesDir = path.join(root, 'sites');

const args = parseArgs(process.argv.slice(2));
const only = args.only ? String(args.only).split(',').map((s) => s.trim()) : null;

const fieldMap = {
  adsense: ['ads', 'adsenseClientId'],
  'meta-pixel': ['ads', 'metaPixelId'],
  'google-ads': ['ads', 'googleAdsConversionId'],
  medianet: ['altAdNetworks', 'medianetSiteId'],
  ga: ['analytics', 'gaMeasurementId']
};

const updates = Object.entries(fieldMap).filter(([flag]) => args[flag] !== undefined);

if (!updates.length) {
  console.error(
    'Nothing to set. Pass at least one of: --adsense, --meta-pixel, --google-ads, --medianet, --ga\n' +
    'Example: node scripts/set-shared-ids.mjs --adsense ca-pub-1234567890123456'
  );
  process.exit(1);
}

if (!fs.existsSync(sitesDir)) {
  console.error('No ./sites directory found. Run scripts/scaffold-sites.mjs first.');
  process.exit(1);
}

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

const siteSlugs = fs
  .readdirSync(sitesDir)
  .filter((f) => fs.statSync(path.join(sitesDir, f)).isDirectory())
  .filter((slug) => !only || only.includes(slug));

if (!siteSlugs.length) {
  console.error(only ? `None of the --only slugs matched a directory in ./sites` : 'No sites found in ./sites');
  process.exit(1);
}

let changed = 0;
for (const slug of siteSlugs) {
  const configPath = path.join(sitesDir, slug, 'site.config.json');
  if (!fs.existsSync(configPath)) {
    console.warn(`  skip ${slug}: no site.config.json`);
    continue;
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  let touched = false;

  for (const [flag, [section, key]] of updates) {
    const value = args[flag];
    config[section] = config[section] || {};
    if (config[section][key] !== value) {
      config[section][key] = value;
      touched = true;
    }
  }

  if (touched) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
    console.log(`  updated ${slug}`);
    changed++;
  } else {
    console.log(`  unchanged ${slug} (already set)`);
  }
}

console.log(`\nDone. Updated ${changed}/${siteSlugs.length} site(s).`);
console.log('Commit and push - each site rebuilds with the new ID(s) baked in, including its own ads.txt.');
