# realpalestine.com

A single-page, self-contained explainer site (*Palestine: The Whole Truth / On the Record*).
No framework, no build step — one `index.html` with inline CSS/JS, a six-language engine
(EN, AR, HE, ES, FR, PT, with right-to-left support), interactive timeline and war
scrubbers, a flip-card carousel, lazy-loaded YouTube embeds, and a scroll-spy nav.

## Layout

```
public/                 ← everything served on the web (this is the deploy root)
  index.html            ← the site
  404.html              ← branded not-found page
  favicon.svg / .ico    ← icons (SVG for modern browsers, ICO fallback)
  apple-touch-icon.png
  icon-192.png / 512    ← PWA / manifest icons
  site.webmanifest
  robots.txt
  sitemap.xml
build-icons.js          ← regenerates the raster icons from the brand mark (Node, no deps)
.do/app.yaml            ← DigitalOcean App Platform spec (static site)
deploy.sh               ← one-shot: push to GitHub + create the DO app
```

## Local preview

```bash
cd public && python3 -m http.server 8080
# open http://localhost:8080
```

## Regenerate icons

The icons are drawn from a flat brand mark (navy field, gold square + underline),
matching `favicon.svg`. To re-render after a design change:

```bash
node build-icons.js
```

## Deploy — DigitalOcean App Platform (static site, free tier)

Prereqs: `doctl` authenticated (`doctl auth init`) and a GitHub account.
App Platform pulls from a Git URL, so the code lives in a public GitHub repo;
the spec uses a generic public-git source, so **no GitHub↔DO OAuth is required**.

```bash
# 1. Authenticate GitHub once (device flow, opens a browser):
gh auth login

# 2. Create the repo, push, and create the DO app:
./deploy.sh
```

`deploy.sh` is idempotent: re-running it pushes the latest commit and triggers a
new deployment. The first run prints the live `*.ondigitalocean.app` URL.

## Custom domain — realpalestine.com

App Platform needs an `ALIAS`-type record for an apex domain, which most registrars
don't support, so the cleanest path is to let DigitalOcean manage the DNS:

1. At your registrar, set the domain's **nameservers** to:
   `ns1.digitalocean.com`, `ns2.digitalocean.com`, `ns3.digitalocean.com`
2. Add the domain to DigitalOcean:
   ```bash
   doctl domains create realpalestine.com
   ```
3. Uncomment the `domains:` block in `.do/app.yaml`, then:
   ```bash
   doctl apps update <APP_ID> --spec .do/app.yaml
   ```

DigitalOcean creates the records and provisions a free Let's Encrypt certificate
automatically (allow a few minutes to an hour for DNS + cert).

## Notes before going live

- `index.html` SEO/social tags and `sitemap.xml`/`robots.txt` already point at
  `https://realpalestine.com/`.
- Casualty figures and legal-case status in the copy are time-sensitive — the page
  says so, but review before each share.
