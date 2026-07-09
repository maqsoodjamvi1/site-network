# Automated content site network (50 sites, zero budget, 3-month plan)

No WordPress. Astro (static site generator) + AI-generated original content + GitHub Actions for daily publishing. Two hosting tracks: 40 sites on free Cloudflare Pages `*.pages.dev` subdomains (instant, automated), 10 sites on free `*.eu.org` subdomains (manual, human-reviewed, slower). No domain purchases, no paid ads, and content generation now defaults to Google's free Gemini API tier - no card, no recurring cost under normal usage.

## What's in here

```
site-network/
  template/              Astro site template - layout, content collections, affiliate CTA, compliance pages
  scripts/
    generate-content.mjs   Writes original articles per site - Gemini (free) by default, Claude (paid) as fallback
    scaffold-sites.mjs     Clones template/ into sites/<slug>/ for each entry in sites.config.json, then auto-runs branding
    generate-branding.mjs  Generates each site's logo, favicon set, and social share (OG) image from its theme colors + name
    daily-publish.mjs      Runs generation for every site, then git commit + push
    set-shared-ids.mjs     Bulk-writes one AdSense/GA/etc ID into every site's site.config.json in one command
  sites.config.json      Master list of all 50 sites - first 10 are .eu.org, rest are .pages.dev
  sites/                  Generated per-site Astro projects (created by scaffold-sites.mjs)
  .github/workflows/daily-content.yml   Scheduled GitHub Action that runs daily-publish.mjs
  ad-templates/           Paid-ads bulk-upload CSVs - optional, phase 2, only once sites can self-fund traffic
```

## What is and isn't automated

Content creation, publishing, logo/social-image generation, and share-button wiring are all fully automated: topic selection, writing, formatting, branding, committing, and deploying run without manual work after setup.

Not automatable, because these require identity/account verification or human review only you can complete:

1. Creating a free GitHub account/repo
2. Creating a free Cloudflare Pages account and connecting each of the 40 `.pages.dev` sites (instant, no review)
3. Applying for each of the 10 `.eu.org` subdomains individually — this is a manual web form per domain, reviewed by a human volunteer, and can take several days per request (see the dedicated section below)
4. Creating a free Google AI Studio account for a Gemini API key (no card needed — see the free-provider note below)
5. Applying to AdSense (and, if you want them, alternate ad networks / affiliate programs), and getting approved
6. Google Search Console — free, but requires your own account per site

The 40 `.pages.dev` sites are ~5 minutes of setup each. The 10 `.eu.org` sites are slower and gated by someone else's review queue — plan for that difference; don't expect all 50 to go live on the same day.

## Important caveat on the 10 eu.org sites

EU.org's own policy says small commercial sites are accepted but "very strongly" asks that you use it only as a last resort, and it's really oriented toward non-profit/personal use. A batch of 10 monetized, AI-generated content sites registered at once is exactly the kind of usage that risks manual rejection or slower review. Practical implications:

- Register these 10 one at a time, not as an obvious bulk batch, and expect some may be rejected — have backup niche/slug ideas ready.
- Registration is DNS-first: create the Cloudflare Pages project for that site *before* applying, get the `.pages.dev` target it gives you, then submit the eu.org request pointing at that target, then wait for approval email (days, not minutes).
- Because it's a volunteer-run free service, don't treat these 10 domains as guaranteed-permanent — the same "traffic disappeared overnight" risk from platform dependency applies here too. Once any of these 10 sites earns anything, migrating it to a real ~$10-15/year domain removes that risk.

## Setup, in order

**1. Review `sites.config.json`.** Pre-filled with 50 evergreen lifestyle niches (astrology, relationships, personality, parenting, mindfulness, productivity, pet care, etc.) chosen because they rank organically for new, zero-authority sites much faster than finance/insurance content. Adjust seed keywords if you want to narrow focus. `affiliateOfferName`/`affiliateLink` can stay blank — these sites can run on AdSense alone.

**2. Generate the sites.**
```
node scripts/scaffold-sites.mjs
```
Creates `sites/<slug>/` for all 50 entries — independent Astro projects, domains pre-set per the `.eu.org` / `.pages.dev` split. This also auto-generates each site's logo, favicon, and social share image (see "Logos and social sharing" below) — no design step needed.

**3. Push to GitHub, then connect hosting:**
- For the 40 `.pages.dev` sites: create a Cloudflare Pages project per site, project name = slug, root directory = `sites/<slug>`, build command = `npm install && npm run build`, output directory = `dist`.
- For the 10 `.eu.org` sites: same Cloudflare Pages project setup first, then follow the eu.org registration flow above using the project's `.pages.dev` address as your DNS target, then wait for approval before that domain resolves.

**4. Get a free Gemini API key and add it as a GitHub secret.** Go to https://aistudio.google.com/apikey, sign in with any Google account, create a key — no credit card required. Then in your repo: Settings → Secrets → Actions → new secret `GEMINI_API_KEY`. (The scripts also support `ANTHROPIC_API_KEY` as a paid fallback if you ever want higher-quality output — the script auto-detects whichever key is present, preferring Gemini.)

**5. Submit each live site to Google Search Console** as it comes online (the 40 pages.dev sites immediately, the 10 eu.org sites once approved). Submit each site's `/sitemap-index.xml` — cuts indexing time from weeks to days.

**6. Run once manually to seed content**, then let the schedule take over:
```
GEMINI_API_KEY=... node scripts/daily-publish.mjs
```
The GitHub Action (`.github/workflows/daily-content.yml`) runs this daily on its own. Every push auto-deploys every connected site — no further manual work for content.

**7. Apply for AdSense** once each site has 15-20 published articles. One AdSense account covers all 50 sites — add each as a "site" inside the same account once approved.

*On "50 sites, same root": they aren't actually on the same root.* All 50 live together in one GitHub repo for convenience, but each one is deployed as its own separate Cloudflare Pages project (per step 3), so each builds independently and lands on its own domain — `zodiac-decoded.pages.dev`, `relationship-clarity.eu.org`, etc. Astro's static build puts `ads.txt` at the root of *that* site's own output, so it automatically ends up at that site's own domain root, not shared with the others. Since your AdSense publisher ID is the same across all 50 sites, though, you'd still need to paste it into 50 separate `site.config.json` files by hand — so use the bulk helper instead:

```
node scripts/set-shared-ids.mjs --adsense ca-pub-XXXXXXXXXXXXXXXX
```

This writes that ID into `ads.adsenseClientId` for every site under `sites/`, in one shot (also supports `--ga`, `--meta-pixel`, `--google-ads`, `--medianet`, and `--only site-a,site-b` to scope it to specific sites). Commit and push afterward — each site rebuilds with the ID baked in, and `template/src/pages/ads.txt.ts` auto-generates that site's own `/ads.txt` from it. If you'd rather manage `ads.txt` by hand instead, delete that file and drop a static `ads.txt` into `template/public/` per site — either approach works, just don't end up with neither (AdSense needs one or the other to serve reliably).

**8. Organic distribution (free, manual per-post effort — the trade-off for zero budget):** share new articles from a real personal/brand account on Pinterest/Reddit/etc. where allowed, no bots or automation tools; internal-link new articles to older ones; answer real questions on Quora/Reddit and link back only when genuinely the best answer.

## Logos and social sharing

Every site gets a logo, favicon set, and social preview image automatically — `scaffold-sites.mjs` runs this for you, or run it manually any time you change a site's name or colors:

```
node scripts/generate-branding.mjs --site ./sites/zodiac-decoded
node scripts/generate-branding.mjs --all
```

It builds a simple monogram logo (site initials in a rounded badge, using that site's `theme.primaryColor`/`accentColor` from `site.config.json`) and writes: `logo.svg` (header), `favicon.svg` + `favicon-32.png` + `apple-touch-icon.png` (browser/homescreen icons), and `og-image.png` (1200×630, what shows up when a page is shared on Pinterest, Facebook, X/Twitter, Discord, iMessage, etc). This needs ImageMagick (`convert`) on whatever machine runs it — already present on GitHub Actions' `ubuntu-latest` runners, so it works automatically in CI even if it's not installed on your own machine; if it's missing locally, `scaffold-sites.mjs` just skips that step with a warning instead of failing.

`BaseLayout.astro` wires the generated logo and `og-image.png` into every page automatically: Open Graph tags (`og:title`, `og:image`, etc.), a Twitter/X Card, and proper favicon links. Every article also gets Pinterest/X/Facebook share buttons (`ShareButtons.astro`) that link readers straight to each platform's share dialog — no API keys, no accounts, just plain share URLs — which directly supports the organic-distribution step above by making it easy for actual readers to repost your content themselves.

If you want to link out to a real social profile for a site (once you make one), set it in that site's `site.config.json` → `social.pinterestUrl` / `.instagramUrl` / `.facebookUrl` / `.twitterUrl` / `.twitterHandle` and a small footer link (or Twitter Card attribution) appears automatically. All blank/optional by default — nothing breaks if you skip this.

## Avoiding a Google penalty on the AI content itself

Google's own public position (and what the March 2026 core update actually enforced) is that AI-generated content is not penalized for being AI-generated — Google has said this explicitly, and independent studies found the large majority of top-ranking pages already contain some AI-assisted content with no measurable ranking penalty from that alone. What gets hit is "scaled content abuse": mass-producing pages primarily to manipulate rankings with little real value, regardless of whether a human or a model typed it. The data on this is stark and directly relevant to a 50-site network: sites publishing a moderate volume of AI content with real editorial oversight saw traffic gains, while sites publishing thousands of unedited AI pages saw 40-90% traffic drops in enforcement waves.

There's a second, separate risk specific to running many sites from one owner: Google's doorway-page policy targets networks of similar sites built to capture overlapping search intent, especially when they interlink or otherwise look coordinated. This system is already structured to avoid the worst of both risks, and a few things are worth keeping that way rather than "optimizing" later:

- **Never interlink the 50 sites to each other.** Nothing in this codebase does that, and it should stay that way — a footprint of same-owner sites linking to one another is one of the clearest signals used to detect manipulative networks.
- **Keep the publish cadence conservative.** The default of 1 article/day/site (~90/site over 3 months) sits in the range the data above associates with quality signals, not the 1,000+ unedited dumps that get hit hardest. Resist the urge to raise `articlesPerRun` across all 50 sites at once.
- **Replace the placeholder About/editorial text per site** (flagged in `about.astro`) with something genuinely specific to that site rather than leaving 50 sites with structurally identical "About" boilerplate — generic, interchangeable About pages are themselves a low-effort/low-value signal.
- **Spot-check and lightly edit a sample of articles periodically**, even if you can't review all of them. The single biggest factor separating the sites that gained traffic from the sites that got penalized in the data above was some degree of human editorial judgment in the loop, not zero AI usage.
- **Stagger site launches and Search Console submissions** rather than pushing all 50 live and submitted on the same day — a burst of near-identical-structure new domains appearing simultaneously is a more visible pattern than a gradual rollout.
- The content prompts in `generate-content.mjs` already push toward specific, concretely useful writing rather than generic filler, and explicitly forbid fabricated stats/quotes — that's the actual lever that matters more than the AI-vs-human question itself.

None of this is a guarantee — nobody, including Google, publishes a guarantee — but "AI-written" and "penalized" are not the same category; "low-value at scale" is what to actually engineer against, and that's what the points above are aimed at.

## Other ways to earn, beyond AdSense

AdSense approval isn't guaranteed for every one of 50 sites, and relying on one income source is exactly the fragility that bit you in the Google-traffic-crash story. The template has config-driven, opt-in slots for a few more free-to-set-up options — all disabled by default, turn them on per site in that site's `site.config.json`:

- **Alternate/supplemental ad networks.** `altAdNetworks.medianetSiteId` wires in Media.net (contextual ads, no hard traffic minimum, works alongside or instead of AdSense) once you're approved. `altAdNetworks.ezoicSiteEnabled` is a checklist flag — Ezoic has no minimum traffic to apply, but their integration is usually a nameserver change rather than a script tag, so follow the exact steps in their dashboard once you sign up.
- **Email list.** `newsletter.enabled` + `newsletter.formAction` turns on a signup box (homepage and end of every article) that posts to whatever form action your email provider gives you — free tiers on Buttondown, Mailchimp, or ConvertKit all work. This is arguably the highest-value zero-cost addition: an email list is an asset you own, independent of any single platform's algorithm or policy changes — the opposite of what happened when Google traffic vanished overnight in your story.
- **A simple digital product.** `digitalProduct.enabled` + `.link` adds a CTA box (same placement pattern as the affiliate CTA) pointing at a paid guide/template/checklist related to the niche. Gumroad and Payhip both let you list a product for free with no upfront cost, they just take a cut per sale. The content generator can draft the guide's content too — it's just another Gemini call.
- **Tip jar.** `tipJar.enabled` + `.provider` (`kofi` or `buymeacoffee`) + `.username` adds a small "support this site" link in the footer. Both are free to set up. Realistic expectation: minimal on its own, but it's a zero-effort, zero-cost addition once it's wired in.

None of these are automatable sign-ups (same KYC-style reasoning as AdSense/affiliate networks), but once you've signed up once, flipping `enabled: true` and filling in the ID is a 30-second edit per site.

## Budget math at 50 sites (now actually ~$0 with Gemini)

Hosting is free. Domains are free. Content generation now defaults to the **Gemini API free tier** (Gemini 2.5 Flash-Lite) — no credit card, no expiration, resets daily. At 1 article/day/site × 50 sites, that's 2 API calls per article × 50 sites = ~100 calls/day, comfortably inside Gemini's free daily quota (roughly 1,000+ requests/day on Flash-Lite as of mid-2026, though Google has tightened free-tier limits before and could again). The script builds in small delays between Gemini calls to stay under the per-minute rate limit too, and if a call ever fails on quota, that one article is just skipped and retried the next day — nothing else breaks.

Two things worth knowing: Google's free-tier terms allow using your prompts/outputs to improve their models (a non-issue for this generic content use case), and if the free tier ever gets cut further, `ANTHROPIC_API_KEY` works as a drop-in paid fallback (roughly $30-75/month at this scale).

## Reality check for a 3-month, zero-budget timeline, at 50 sites

Fifty brand-new, zero-authority sites is a lot of surface area to maintain content quality and monitor across, and each one still needs 4-8+ weeks to get indexed and start showing up in search at all. Realistically expect a wide spread by month 3: some niches/sites will get real traction, many will still be near zero, and the 10 eu.org sites specifically carry extra uncertainty from the registration/review process itself. Treat this as a portfolio bet — the value of running 50 rather than 8 is that a few winners can carry the average, not that all 50 perform evenly. Reinvest early earnings from any winner into a real domain, an email list, and eventually the paid-traffic templates in `ad-templates/`.
