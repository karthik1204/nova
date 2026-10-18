# Nova website administration

Project: **Nova Website**, `zbgjihikceowzkgwmisv`, organization **Nova**, us-east-1.
The public URL and publishable key are in `src/cms/config.json`. They are safe browser configuration, not server credentials. Never add a service-role key to this repository.

## Finish email sign-in setup

The approved administrator is configured privately in `private.website_admins`; the email is intentionally omitted from this public repository. The database requires a matching **verified** Auth email. No password or verified user was fabricated during setup. The public schema reference omits the private allowlist seed and must not be rerun on the existing project.

In the Supabase dashboard for this project:

1. Authentication → URL Configuration: add `http://127.0.0.1:4173/admin/` and the actual deployed site's `/admin/` URL to the redirect allowlist. Set the Site URL to the deployed site. Do not use a broad wildcard in production.
2. Authentication → Email: enable email sign-in and keep email confirmation enabled. Magic links are supported. Optionally put `{{ .Token }}` in the email template to allow manual code entry in the editor.
3. Authentication → SMTP: configure a transactional email provider for production. The default sender only delivers to organization team members; it is not a production delivery service. Do not invite an editor into the Supabase organization merely to bypass this restriction—organization access is broader than website editing.
4. Visit `/admin/`, enter the approved address, and complete email verification yourself. Test sign-in, upload, save draft, preview, publish, and restore on the deployed host before launch.

No SMTP credentials were supplied and no paid email service was purchased. Redirect configuration and real email sign-in must be verified before treating login as ready.

## Content workflow

- Choose any existing page, then search its text fields or click words in the private preview. Alt-click follows website links. Open a dialog/tab to include its text. New text edits affect matching phrases on that page only; header, mobile menu and footer edits are shared. Older global replacements remain supported. Replacements are literal plain text, never HTML.
- Website colors includes the shared palette, buttons, section backgrounds/text, and product slide backgrounds. Reset removes the override. No colors change until an editor chooses one. Check contrast before publishing.
- The image library shows current-page or all editable website assets, including hidden photos. Replace, hide or restore existing photos; add new photos through product galleries. The approved logo and calibrated hero frames remain protected.
- Product prices update cards, product details and bag calculations together. This does not enable checkout.
- Add, reorder, replace, or remove product gallery photos. At least one photo is required. Uploads accept PNG/JPEG/WebP up to 10 MB. **Uploaded image URLs are public immediately**, even before publishing. Do not upload confidential material.
- Save draft persists to Supabase; Publish atomically promotes the saved draft. A revision check prevents overwriting a draft changed by another session.
- Publishing updates visitors on their next page load without rebuilding. Already-open pages require refreshing. The frontend CMS integration must first be deployed with the existing site; local code changes alone do not update GitHub Pages.
- Previous published content is retained for recovery. Removing a photo hides it from the current gallery but does not destroy its storage file, so earlier versions remain recoverable.
- Links, checkout behavior, forms, layout, hero animation and logo are outside this editor's scope. This is a content editor, not a drag-and-drop page builder. Text baked into product photographs cannot be edited as website text.
- If the backend cannot be reached within 2.5 seconds, the storefront falls back to the approved content bundled with the website. Admin operations report errors instead of pretending they saved.

## Source and security

`src/cms/` contains the editor and public loader; `backend/schema.sql` is the applied setup SQL. `npm run build` bundles the SDK locally for the admin panel only. The public loader does not load the authentication SDK. Use Node 22+ for dependency installation (the current Supabase SDK requires it).

Tables use row-level security. Only published content is anonymous-readable; drafts, history and storage writes require the private verified-email allowlist. No client-side password or email check substitutes for database authorization. To change administrators, explicitly approve a new address and update `private.website_admins` through a trusted database administrator; do not grant table access to browsers. Changing the allowlist takes effect on subsequent protected database requests.

The image bucket has no browser deletion/update policy. Unique upload names keep cache entries immutable. Physical cleanup of unused files is a separate reviewed maintenance task; preserve any files referenced by draft, published or history content.
