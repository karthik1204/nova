# Nova Health Synergy

Static herbal wellness storefront with a Three.js product hero, original Nova photographs and product content, botanical library, founder story, and an on-site shopping bag.

## Run

Serve this folder with any static HTTP server. Open index.html through that server. No frontend build or framework is required. Product images and label textures are embedded in index.html. Three.js r128 loads from cdnjs.

## Deployment

GitHub Pages: main branch, repository root. The .nojekyll file disables Jekyll. Hash-based navigation and relative legacy redirects support deployment under /nova/.

## Functionality and remaining integrations

- Product sizes, prices, image galleries, ingredient details, 3D previews, filters and the shopping bag run locally in the browser.
- The bag lasts for the current page session; no localStorage is used.
- Payments are not connected. Checkout is explicitly disabled; adding to the bag does not place an order.
- Contact forms and newsletter collection are not connected. These pages disclose this and do not collect personal information or simulate submissions.
- Navigation stays on this website. Facebook is a clearly labeled external link.
- Reduced-motion preferences disable autoplay and decorative motion.

## Authoring

Editable markup, styles and behavior are in site.template.html. tools/assemble_site.py combines that template with the local official-site content audit and prepared WebP assets. The delivered index.html needs no build step. The scraped audit files are deliberately excluded from publication.

## Verification

Run node tools/verify_site.cjs for static route, asset, syntax, and application rendering checks. These checks are not a substitute for WebGL and mobile visual verification.
