# Faroogh Yousefi Portfolio

Personal portfolio for Faroogh Yousefi, a Berlin-based IT Engineer with an Enterprise IT and Modern Workplace background, automation experience, and ongoing Cloud and DevOps training.

Live website:

[www.farooghyousefi.com](https://www.farooghyousefi.com/)

## Tech Stack

- Semantic HTML, responsive CSS and a small JavaScript language switcher.
- Pre-rendered English, German and Farsi pages, including RTL support.
- Node.js build script and one contact form function using standard libraries only. No framework or npm dependencies.
- GitHub and Vercel for reviewable deployments.

## Editing And Local Preview

Edit `src/page.html` for markup, the `translations` object in `script.js` for content, and `styles.css` for styling. All three languages must have the same translation keys.

After editing, regenerate the checked-in pages:

```sh
node scripts/build.mjs
open index.html
```

On other operating systems, open `index.html` with a browser. The generated pages and language switcher work without a server; `de/index.html` and `fa/index.html` also work without JavaScript. The contact form requires the published site.

Check that language switching, mobile navigation, contact form, CV links, keyboard focus and reduced-motion preferences still work before publishing. Run `node --test tests/contact.test.mjs` for the form handler.

## Contact Form Setup

The same-origin endpoint `/api/contact` sends messages through Resend. Set these Vercel environment variables for the intended deployment environment:

- `RESEND_API_KEY`: Resend server-side sending key.
- `CONTACT_TO_EMAIL`: destination inbox or forwarding address. It is never rendered on the site.
- `CONTACT_FROM_EMAIL`: sender address on a domain verified for sending in Resend.

Verify the sending domain in Resend and add its required DNS records. Keep existing incoming-mail MX records unless you are intentionally moving your inbox. Test a real submission and its delivery before publishing. If configuration or delivery fails, the form reports the failure and offers LinkedIn as another contact route.

## Deployment

The website is hosted on Vercel and connected to GitHub.

Vercel runs `node scripts/build.mjs --out-dir public`. Only the explicitly selected website files are copied to `public/`; source files, scratch directories and local documents are not part of the deployed site.

Push a feature branch and review its preview deployment. Merging into `main` triggers the production deployment. Do not bypass branch protection or force-push.

The root URL is English, `/de/` is German and `/fa/` is Farsi. Each has localized metadata, a canonical URL and reciprocal language links in the sitemap. Update the sitemap modification date in `scripts/build.mjs` when content changes substantially.

## Public Assets And Privacy

- Use only the reviewed public CV copies under `assets/`, not private source documents.
- Before replacing a CV, inspect extracted text, annotations, metadata and signature images as well as its visual appearance. A new file does not remove older versions from Git history.
- No email address is rendered in the page or current public CVs. The form recipient and sender are server-side environment variables.
- The site does not include analytics scripts or external fonts. The only application storage is an optional language preference.
- Hosting security headers are configured in `vercel.json`. Public CV responses request no indexing and no caching; these headers are not access control.
- Lucide icon licensing is retained in `assets/icons/LUCIDE-LICENSE`. Technology logos belong to their respective owners.

## Projects

- [CareerPilot](https://careerpilot-staging.vercel.app/): public beta for private, evidence-based career analysis and application preparation. The source repository remains private.
- [Flowdesk AWS portfolio](https://github.com/farooghyousefi/flowdesk-aws-portfolio)
- Azure SQL migration: completed IHK project, described on the website.
- [LifePilot](https://lifepilot.farooghyousefi.com/): MVP in development.
- [BudgetUp](https://budget.farooghyousefi.com/): personal local-first web application.
