# Nova Health Synergy

Static storefront for Nova Health Synergy. Plain HTML, CSS and JavaScript; no frontend framework or server-side application is required.

## Preview

Serve the repository root with a static HTTP server, for example:

```sh
python -m http.server 4173
```

Open http://127.0.0.1:4173/. The root `index.html` and generated assets are checked in, so viewing the site does not require Node or a build. Use HTTP, not a double-clicked file, to preview all routes consistently.

## Edit and build

Use Node.js 22 or later (required by the admin panel's Supabase SDK).

```sh
npm ci
npm run build
npm test
```

Run `npm run format` for consistent formatting, then rebuild. The CMS uses esbuild to bundle its browser modules. The Supabase authentication SDK is bundled only into the admin panel, not the public storefront.

## Website administration

The local editor is at `http://127.0.0.1:4173/admin/`. It includes all existing page routes with searchable text fields, shared header/footer text, website/section colors, an image library, product galleries and prices. Save draft, preview, publish, and restore earlier published content are backed by Supabase, not local storage. Logo, hero image calibration, layout and functional behavior stay protected. See [the no-code editing and hosting guide](backend/PUBLISHING.md).

**Email setup is still required before sign-in is ready.** See [backend setup and security](backend/README.md) for redirect URLs, email delivery and the verified admin allowlist. The frontend changes also need deployment through the existing hosting workflow before the production website reads published content. No production deployment was performed.

### Where to make changes

| Location | Responsibility |
| --- | --- |
| `src/index.html` | Page markup, header, homepage, footer and dialogs |
| `src/styles/` | Base styles, layout, responsive rules, editorial sections, products, typography, hero and branding |
| `src/scripts/state.js` | Shared state and small DOM helpers |
| `src/scripts/gallery.js` | Product photographs and gallery navigation |
| `src/scripts/shop.js` | Product cards and shopping bag |
| `src/scripts/home.js` | Homepage content, tabs, ticker and reveal controls |
| `src/scripts/pages.js` | Product, shop, story, contact and other routes |
| `src/scripts/events.js` | User interaction and accessibility event handlers |
| `src/scripts/hero.js` | Product-photo rendering and the existing transition controller |
| `src/scripts/start.js` | Application startup |
| `src/content/site.json` | Product descriptions, prices, ingredients, story and image calibration |
| `src/cms/` | Admin interface, safe content handling, and public content loader |
| `backend/` | Applied database schema, rollback-only security tests, and setup instructions |
| `assets/branding/` | Approved logo and original reference |
| `assets/prepared/`, `assets/hero-oct14/`, `assets/hero-masters/` | Image files served without embedding them in HTML |

`src/build.json` specifies the stylesheet cascade and script execution order. Feature scripts share one private closure in the generated bundle, preserving the existing initialization order and avoiding global feature variables. They are source sections, not independent ES modules. Keep their order unless dependencies are deliberately refactored.

The builder writes `index.html`, `assets/site.css`, `assets/app.js`, `assets/site-data.js`, and legacy route redirects. Do not hand-edit those generated files. Images remain separate, cacheable files at relative URLs, including when deployed beneath a path such as `/nova/`.

The previous `tools/assemble_site.py` command delegates to the same Node builder for compatibility. The normal build no longer depends on the ignored source-site audit, Pillow or NumPy. Older image-preparation tools are retained for asset work and may still need those dependencies.

## Verification

`npm test` checks:
- Source and generated build consistency, local asset paths and JavaScript syntax.
- Pre-refactor application logic, CSS cascade, markup and content.
- Gallery image order, product matching and accessibility markup.
- Product cards, all ingredient dialogs and ticker content.
- 1,452 sampled hero transition frames across desktop/mobile sizes and both directions.

`tests/fixtures/refactor-baseline.json` records the version before the organization-only change. A deliberate future behavior, content or visual change must review and update the relevant baseline; do not regenerate it just to silence a failure. Visual browser checks remain necessary.

## Current functionality and limitations

- Product sizes, prices, galleries, ingredient dialogs, filters and the bag run locally.
- The bag lasts for the current page session; it is not persisted.
- Checkout, contact submission and newsletter signup are not connected. The UI discloses this.
- Reduced-motion preferences disable autoplay and decorative motion.
- The hero uses intact photograph layers, not a Three.js model. The current bottles retain their approved front appearance; the pouch can blend to its rear view. This cleanup does not change or resolve the previously discussed rotation limitations.
- New hero photographs require reviewed dimensions and alpha bounds in `src/content/site.json`; changing a file alone does not recalibrate it.

## Deployment and archive

The GitHub Pages workflow builds and tests, then packages only public browser files into `_site/` with `tools/package_site.cjs`. Database scripts, setup notes, source files and dependencies are excluded. No deployment is performed by the local build.

Unused files from the earlier design are retained in `archive/legacy-site/`. The old all-in-one template was replaced by `src/` and remains recoverable through Git history.
