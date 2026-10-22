# Editing and publishing Nova

## Three separate jobs

- **GitHub:** keeps the website source code and its history.
- **Website host:** serves the built website to visitors.
- **Supabase:** stores published text, colors, prices and image changes; stores uploaded pictures separately from Git.

Signing into Supabase with GitHub does not sign you into Nova's editor. At your website's `/admin/` address, use the approved admin email and its email sign-in link.

## Everyday editing — no code

1. Open your live website's `/admin/` address and sign in.
2. Choose a page. Search its text fields or click words/photos in the preview. Open Website colors, Website image library or Product prices for those controls.
3. Apply text changes to the draft. Check the preview. Save draft if you want to finish later.
4. Click **Publish changes**, then confirm. Unsaved draft changes are saved first.
5. Refresh the public website. Already-open visitor pages need a refresh; new page loads read the published content.

No Git push or website rebuild is needed for these content changes after this editor integration has been deployed once. Published content is not copied into Git automatically. Previous published versions can be loaded as drafts and republished.

Uploads are public by URL immediately, even before publishing. Do not upload confidential material. Removing a gallery photo hides it but keeps its stored file for version recovery.

## Hosting and automatic code updates

The production site is deployed on **Cloudflare Pages Free** at <https://nova-1qm.pages.dev/>. The editor is at <https://nova-1qm.pages.dev/admin/>. Cloudflare project `nova` builds the `main` branch of `karthik1204/nova` automatically after a Git push. Local folder edits alone do not deploy: commit and push code changes first.

The GitHub Pages workflow publishes a small redirect from the previous `https://karthik1204.github.io/nova/` address to Cloudflare, preserving page paths, queries and hash routes. It does not host a second copy of the storefront.

Deployment settings and remaining authentication verification:

1. In Cloudflare Pages, connect the existing GitHub `nova` repository and select its intended production branch.
2. Use no framework preset. Set the build command to `npm run build:deploy` and the output directory to `_site`. The `.node-version` file selects Node.js 22. The dependency install uses the checked-in package lock.
3. Deploy the updated source once. The packaging step includes only public website files, not backend scripts or setup notes. `_site` is generated and should not be committed.
4. In Supabase Authentication URL Configuration, set the live Site URL and allow the exact live `/admin/` redirect URL. Keep the local admin redirect if local editing is needed.
5. Verify email sign-in, draft preview, a reviewed publish, and a fresh public page load before considering setup complete. Production email delivery may need custom SMTP; do not upgrade or purchase a service without approval.

Cloudflare production builds, the public homepage, and the old-address homepage/admin redirects were verified successfully. The backend was migrated to the owner's new **NOVA Project** on October 19, 2026; live and local login redirect URLs are configured. Live admin email sign-in and a reviewed publish still need verification in the new project. Do not treat a successful public deployment as proof that admin sign-in has been verified.

The `pages.dev` address is free. A custom domain is optional and may cost separately.

References: [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [Cloudflare Pages](https://www.cloudflare.com/developer-platform/products/pages/), [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/).

## Customer reviews

### October 22 refinements

The reviews section uses tighter section/card spacing and responsive type without truncating customer messages. The storefront preloads its application script while published content is fetched, and image visibility checks use an indexed lookup. Published content is still fetched fresh on each load; there is no stale content cache.

Admin sign-in now exposes the email-code form directly, validates both email and code, and disables automatic account creation. The existing approved admin already has a verified account. Code verification is implemented, but **code email delivery is not enabled yet**: this project's default Supabase Free sender sends only a magic link. A custom SMTP sender and an email template containing `{{ .Token }}` are required. Do not mark OTP delivery complete until an actual email arrives and the owner verifies it on another device. Never put SMTP credentials in source control or browser code.

After deploying the reviews feature, open **Customer reviews — all three products** in the admin editor. Add a genuine customer's display name, rating and exact message; select Digestive Tonic, Immunity Tonic or Immunity Broth Kit. Enable **Show this review after publishing**, then Save draft or Publish changes. Reviews can be reordered, hidden or removed from the draft. The existing publishing history also restores reviews.

The homepage section appears below the product cards only when there are visible published reviews. With no reviews, the private editor shows clearly marked sample cards; these samples are never saved or published. For a local design preview, run `npm run build` and `npm run preview`, then open `http://127.0.0.1:4173/?reviews-demo=1`. The demo query is ignored on public hosts. The section inherits the current website palette; automatic scrolling pauses on hover, keyboard focus and touch, with a separate pause control and reduced-motion support.

Reviews use the existing protected content JSON and publishing permissions. No new database tables, credentials, authentication policies or public submission endpoint are needed. Publication changes appear on the next public page load.

## Other code-managed features

Page layout, new page creation, navigation destinations, forms, checkout, the logo and calibrated hero product frames are protected. Product-label wording inside photos is part of the photo, not editable website text. If Supabase cannot be reached promptly, the storefront falls back to the original bundled content.
