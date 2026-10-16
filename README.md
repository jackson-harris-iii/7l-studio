# 7L Studio

Photography and films by Jackson Harris III. Independent portfolio for music, people, and places.

Contributors and coding agents: read [AGENTS.md](AGENTS.md) and the
[development/review workflow](docs/development-workflow.md). Greptile review
settings and context are versioned in `.greptile/`.

## Development

Node.js 22.13+ and Python 3 are required for all checks.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4173/ and keep the process running. The Node preview serves the portfolio endpoint as well as the site files.

## Checks and deployment

```sh
npm run check
npm test
npm run deploy:check
npm run deploy
```

Cloudflare Workers hosts the public HTML/CSS/JS and `/api/portfolio`. `build.mjs` copies exactly four approved assets into `dist/`; repository files and credentials are never deployed as static assets. `wrangler.jsonc` is the deployment configuration. GitHub Actions runs the checks on pushes and pull requests. Deployment requires a Cloudflare login; the checks do not.

The site retains `noindex,nofollow` during its initial public preview. It can be shared directly while the portfolio is refined.

## Hosting and domain ownership

- GitHub: `jackson-harris-iii/7l-studio`; production branch `main`.
- Cloudflare Worker: `7l-studio`, connected to that repository with Workers Builds.
- Build command: `npm run check && npm test && npm run build`.
- Deploy command: `npx wrangler deploy`. A push/merge to `main` publishes after
  these checks pass, so merging is a release action.
- Branch preview builds are currently disabled. The production fallback address is
  https://7l-studio.jackson-harris3.workers.dev.
- Production hostnames: `7lstudio.com` and `www.7lstudio.com`, recorded in
  `wrangler.jsonc` as Worker custom domains.
- Name.com retains the domain registration and renewal. Cloudflare handles DNS
  and HTTPS. Assigned nameservers: `gerald.ns.cloudflare.com` and
  `wanda.ns.cloudflare.com`.

The nameserver change was submitted October 2, 2026. DNS propagation and certificate
activation must be verified before treating the custom hostnames as live. Email Routing was subsequently enabled for free delivery to a verified destination.

## Media

`portfolio.json` holds an explicit selection of public SmugMug photographs and video clips. It includes Idyllwild Edited and Late Checkout Favorites photographs, plus the finished `fwb recap.MP4` film (`r9LGWxD`) from the public Idyllwild-1/Edited gallery. The film opens with a plane landing and runs approximately 48 seconds. Previous individual camera clips were removed. The Nora En Pure drone pullback and finished Bob Moses recap are hosted in the public 7L-Studio-Films gallery, exported from the user-selected Photos originals. The screen recording with player controls is not used. Nightshift and ADP material is excluded by source validation. No full-account crawling or mirroring occurs.

Video loads only on click and plays with its original soundtrack after the visitor presses Play. Other playing clips pause, and native controls let the visitor mute or adjust volume. Nothing plays automatically. Each film links to its source and full collection on SmugMug. The inquiry form requests a quote; it does not reserve a date or submit a booking. Instagram remains an alternative contact route.

Until a SmugMug application key is available, the endpoint serves curated public display URLs with `source: curated-preview`. These links may change. The API reader is implemented and covered by mocked tests but still requires live validation.

To enable live API reads, set `SMUGMUG_API_KEY` as a Cloudflare Worker secret:

```sh
npx wrangler secret put SMUGMUG_API_KEY
```

For Node preview, use a local `.env` based on `.env.example`, then `node --env-file=.env server.mjs`. For Wrangler local development use `.dev.vars`. Both are ignored by Git. Never paste keys into HTML, client JavaScript, or committed configuration.

The reader validates allowed source paths and public visibility, chooses web derivatives, and caches results for up to five minutes. Upstream errors return 503; unavailable content is omitted rather than restored from old URLs.

## Repository and content

This repository contains the portfolio source code. Photographs, films, branding, and music remain the property of their respective owners; public repository visibility does not grant reuse rights. No open-source license is granted by this repository.

Keep personal notes, raw media, screenshots, credentials, generated output, and dependencies outside version control. Make feature changes on branches and run the checks before deploying. Git commits preserve earlier versions; Cloudflare deployment history supports operational rollbacks.

## Packages and inquiries

The public starting prices are $450 photography (2 hours / 40 photographs), $750
recap film (2 hours / one 45–60 second film), and $1,050 photo + film (3 hours /
35 photographs and one 30–60 second film). Combined coverage is one creator
splitting time between capture formats. A written quote defines usage, delivery,
travel, extra coverage, revisions, and booking terms.

`inquiry-ui.js` submits JSON to `/api/inquiry`. `inquiry.mjs` validates field sizes,
origin, content type, honeypot, and a one-use Turnstile token (including action and
hostname) before sending plain-text email. The destination is fixed server-side;
visitor input can only set Reply-To. There is no email to arbitrary visitors,
subscriber list, database, or payment flow. Errors preserve entered details;
success means the email provider accepted the request, not a confirmed booking.
No form contents or provider error details are logged by application code.

### Free production setup

1. Enable Cloudflare Email Routing for `7lstudio.com` and its required DNS records.
2. Add and **verify** the owner's destination address. Sending only to verified
   destinations is free; do not enable paid arbitrary-recipient sending.
3. Create a non-interactive Turnstile widget for `7lstudio.com` (covers subdomains).
   Its public site key is in `index.html`; pre-clearance stays disabled.
4. Store `TURNSTILE_SECRET_KEY` and `INQUIRY_TO` as **runtime secrets** on Worker
   `7l-studio`, never build variables or committed files. `wrangler.jsonc` declares
   the `INQUIRY_EMAIL` send binding, using Cloudflare's default verified-recipient
   restriction. The sender is `inquiries@7lstudio.com`; Reply-To is the visitor.
5. Deploy and submit a clearly labeled test inquiry from the production site.
   Verify both the success UI and receipt in the destination inbox, including
   Reply-To. An automated mocked test cannot prove live email delivery.

The plain Node preview intentionally disables submission and labels it preview
only. Backend and frontend tests use injected providers, never real email. Missing
production configuration fails closed with a visible alternative contact route.
`inquiries@7lstudio.com` is a notification sender, not an advertised inbox or
forwarding alias. A branded receiving address can be added separately later.

Official setup: [verified-recipient pricing](https://developers.cloudflare.com/email-service/platform/pricing/),
[Workers email API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/),
and [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
