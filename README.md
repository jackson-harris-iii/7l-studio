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

Cloudflare Workers hosts the public HTML/CSS/JS and `/api/portfolio`. `build.mjs` copies exactly three approved assets into `dist/`; repository files and credentials are never deployed as static assets. `wrangler.jsonc` is the deployment configuration. GitHub Actions runs the checks on pushes and pull requests. Deployment requires a Cloudflare login; the checks do not.

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
activation must be verified before treating the custom hostnames as live. No email
service was configured on this domain during setup.

## Media

`portfolio.json` holds an explicit selection of public SmugMug photographs and video clips. It includes Idyllwild Edited and Drone/Video, Late Checkout Favorites, Eli & Fur + Le Youth video favorites, and Nora En Pure Favorites. Nightshift and ADP material is excluded by source validation. No full-account crawling or mirroring occurs.

Video loads only on click, starts muted, and pauses other playing clips. Source galleries remain on SmugMug. The inquiry link opens Instagram; no booking is submitted by this website.

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
