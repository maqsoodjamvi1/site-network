import type { APIRoute } from 'astro';
import siteConfig from '../../site.config.json';

export const prerender = true;

export const GET: APIRoute = () => {
  const raw = siteConfig.ads?.adsenseClientId || '';
  // AdSense gives you the script tag ID as "ca-pub-XXXXXXXXXXXXXXXX" but
  // ads.txt needs just "pub-XXXXXXXXXXXXXXXX" - strip the "ca-" prefix.
  const pubId = raw.replace(/^ca-/, '');

  const lines = pubId
    ? [`google.com, ${pubId}, DIRECT, f08c47fec0942fa0`]
    : ['# Add ads.adsenseClientId in site.config.json once AdSense approves this site,', '# then this file will auto-populate the required ads.txt entry.'];

  return new Response(lines.join('\n') + '\n', {
    headers: { 'content-type': 'text/plain; charset=utf-8' }
  });
};
