# E-book sales and delivery

Buy buttons on `ebooks.html`, `ebooks-es.html` and `ebooks-pt.html` are **Stripe Payment Links**.
After paying, Stripe sends the buyer to `thanks.html?session_id=...&book=<slug>`.

Two Vercel functions do the delivery:

| Function | What it does |
| --- | --- |
| `api/download.js` | `thanks.html` calls it with the session id. It asks Stripe whether that session is paid and which book it was, then streams the file from the private Blob store. The session id is the proof of purchase. |
| `api/stripe-webhook.js` | Stripe calls it when a checkout completes. It emails the buyer the e-book (attached if under 20 MB) plus the permanent download link. |

The catalog (slug, title, language) lives in `lib/ebooks.js`. Slugs must match the `slug` metadata on the Stripe products, prices and payment links.

## E-book files

The GitHub repo is public, so **never commit the e-book files**. They live in the project's private Vercel Blob store, named `ebooks/<slug>.pdf` (or `.epub`).

Upload or replace them from a folder outside the repo:

```
npm install
node scripts/upload-ebooks.mjs "C:\path\to\ebook-files"
```

Files must be named exactly `<slug>.pdf`, for example `la-esencia-de-criar.pdf`. The script needs `BLOB_READ_WRITE_TOKEN` in `.env.local` (copy `.env.example`).

## Environment variables (Vercel > Project > Settings > Environment Variables)

See `.env.example`. Email goes out over SMTP: a Gmail address with an App Password is the simplest option.

## Changing a price

Stripe prices cannot be edited and a Payment Link cannot swap its price. To change a price:
create a new price on the product, create a new payment link with it, deactivate the old link,
and paste the new link into the Buy button on the three `ebooks*.html` pages.

## Adding a new e-book

1. Create the product, price and payment link in Stripe, with `metadata.slug = <slug>` on the product, price and link, and the link's after-payment redirect set to `https://<site>/thanks.html?session_id={CHECKOUT_SESSION_ID}&book=<slug>`. The product needs the tax code `txcd_10302000` (digital books) because Managed Payments is on.
2. Add the slug to `EBOOKS` in `lib/ebooks.js` and to the `titles` map in `thanks.html`.
3. Upload `<slug>.pdf` with the upload script.
4. Add the card and Buy button to the three `ebooks*.html` pages.
