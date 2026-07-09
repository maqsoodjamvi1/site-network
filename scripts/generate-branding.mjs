#!/usr/bin/env node
/**
 * generate-branding.mjs
 *
 * Generates a simple logo, favicon set, and social share (Open Graph) image
 * for a site, entirely from its site.config.json (site name + theme colors)
 * - no design tool, no image-generation API, no manual work. Uses ImageMagick
 * (`convert`), which needs to be available on the machine running this - it
 * is on most Linux CI runners and can be installed with `apt-get install
 * imagemagick` if it's missing (GitHub Actions ubuntu-latest already has it).
 *
 * Usage:
 *   node scripts/generate-branding.mjs --site ./sites/zodiac-decoded
 *   node scripts/generate-branding.mjs --all        (regenerates for every site under ./sites)
 *
 * Output, written into that site's public/ folder:
 *   logo.svg              header lockup (icon + site name)
 *   favicon.svg           icon-only, modern browsers
 *   favicon-32.png        classic favicon size
 *   apple-touch-icon.png  180x180, iOS homescreen icon
 *   og-image.png          1200x630, used for Open Graph / Twitter Card previews
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const args = parseArgs(process.argv.slice(2));

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

function checkImageMagick() {
  try {
    execFileSync('convert', ['-version'], { stdio: 'ignore' });
  } catch {
    console.error('ImageMagick ("convert") not found. Install it (e.g. `apt-get install -y imagemagick`) and re-run.');
    process.exit(1);
  }
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function initialsFor(siteName) {
  const words = siteName.trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((w) => w[0].toUpperCase());
  return letters.join('') || 'S';
}

function iconSvg({ initials, bg, fg }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="${bg}"/>
  <text x="256" y="296" font-family="'Segoe UI', Arial, sans-serif" font-size="220" font-weight="700" fill="${fg}" text-anchor="middle">${escapeXml(initials)}</text>
</svg>`;
}

function logoSvg({ initials, siteName, bg, fg, text }) {
  const label = escapeXml(siteName);
  const width = 140 + label.length * 15;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="72" viewBox="0 0 ${width} 72">
  <rect x="0" y="4" width="64" height="64" rx="14" fill="${bg}"/>
  <text x="32" y="48" font-family="'Segoe UI', Arial, sans-serif" font-size="28" font-weight="700" fill="${fg}" text-anchor="middle">${escapeXml(initials)}</text>
  <text x="80" y="45" font-family="'Segoe UI', Arial, sans-serif" font-size="26" font-weight="700" fill="${text}">${label}</text>
</svg>`;
}

function ogImageSvg({ initials, siteName, tagline, primary, accent, fg, fgMuted }) {
  // Note: no `opacity` attribute here on purpose - if ImageMagick doesn't have
  // the real librsvg CLI (`rsvg-convert`) available and falls back to its
  // built-in minimal SVG renderer, `opacity` gets ignored/misrendered (shows
  // fully opaque). Using solid colors instead renders correctly everywhere.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${primary}"/>
  <rect x="90" y="90" width="150" height="150" rx="32" fill="${accent}"/>
  <text x="165" y="192" font-family="'Segoe UI', Arial, sans-serif" font-size="70" font-weight="700" fill="${fg}" text-anchor="middle">${escapeXml(initials)}</text>
  <text x="90" y="340" font-family="'Segoe UI', Arial, sans-serif" font-size="64" font-weight="700" fill="${fg}">${escapeXml(siteName)}</text>
  <text x="90" y="400" font-family="'Segoe UI', Arial, sans-serif" font-size="32" fill="${fgMuted}">${escapeXml(tagline).slice(0, 90)}</text>
</svg>`;
}

function generateForSite(siteDir) {
  const configPath = path.join(siteDir, 'site.config.json');
  if (!fs.existsSync(configPath)) {
    console.warn(`  skip ${siteDir}: no site.config.json`);
    return;
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const publicDir = path.join(siteDir, 'public');
  fs.mkdirSync(publicDir, { recursive: true });

  const primary = config.theme?.primaryColor || '#1f4b99';
  const accent = config.theme?.accentColor || '#ff7a1a';
  const fg = '#ffffff';
  const initials = initialsFor(config.siteName || 'Site');

  const files = {
    'favicon.svg': iconSvg({ initials, bg: accent, fg }),
    'logo.svg': logoSvg({ initials, siteName: config.siteName || 'Site', bg: accent, fg, text: primary }),
    'og-image.svg': ogImageSvg({
      initials,
      siteName: config.siteName || 'Site',
      tagline: config.tagline || '',
      primary,
      accent,
      fg,
      fgMuted: '#dfe7f7'
    })
  };

  for (const [name, svg] of Object.entries(files)) {
    fs.writeFileSync(path.join(publicDir, name), svg);
  }

  // Rasterize: favicon sizes + the OG image (Facebook/Pinterest/etc need a raster og:image, not SVG)
  const iconSvgPath = path.join(publicDir, 'favicon.svg');
  const ogSvgPath = path.join(publicDir, 'og-image.svg');
  convert(iconSvgPath, path.join(publicDir, 'favicon-32.png'), 32, 32);
  convert(iconSvgPath, path.join(publicDir, 'apple-touch-icon.png'), 180, 180);
  convert(ogSvgPath, path.join(publicDir, 'og-image.png'), 1200, 630);

  console.log(`  branded ${path.basename(siteDir)} (initials: ${initials})`);
}

function convert(srcSvg, destPng, w, h) {
  execFileSync('convert', ['-background', 'none', '-resize', `${w}x${h}`, srcSvg, destPng]);
}

checkImageMagick();

if (args.all) {
  const sitesDir = path.join(root, 'sites');
  if (!fs.existsSync(sitesDir)) {
    console.error('No ./sites directory found. Run scripts/scaffold-sites.mjs first.');
    process.exit(1);
  }
  const slugs = fs.readdirSync(sitesDir).filter((f) => fs.statSync(path.join(sitesDir, f)).isDirectory());
  console.log(`Generating branding for ${slugs.length} site(s)...`);
  for (const slug of slugs) generateForSite(path.join(sitesDir, slug));
} else if (args.site) {
  generateForSite(path.resolve(args.site));
} else {
  console.error('Usage: node generate-branding.mjs --site <path> | --all');
  process.exit(1);
}
