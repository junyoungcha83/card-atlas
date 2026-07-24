# Architecture and migration boundary

## Runtime boundaries

- Static UI and assets: repository root (`index.html`, `assets/`, `manifest.webmanifest`, `sw.js`). These are public URLs and must remain unchanged.
- Data/build tools: `scripts/` (geo-map builders).
- Image API: `worker/` with `worker/wrangler.toml`; deploy from `worker/` and keep the Worker `name` unchanged.

## Safe migration rule

Do not move or rename root `assets/`, `index.html`, or `sw.js`; the service worker precache list contains relative asset paths. Internal build code may be reorganized only with compatibility entrypoints and a dry-run deployment.

## Agent boundary

Expose geo generation, asset lookup, and image persistence as explicit tools. Validate all generated asset paths before publishing.
