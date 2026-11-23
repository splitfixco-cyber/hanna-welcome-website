# SEO

What each page tells search engines and social networks. Keep these tags when adding or copying a page.

## Every page

- `<title>` and `<meta name="description">` written with the words people search for (book name, "e-book", "crianza", "criação de filhos", "parenting").
- `<link rel="canonical">` with the page's full URL on `https://www.hannasuniverse.com/`. The home page's is `https://www.hannasuniverse.com/`.
- Open Graph tags (`og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:image`, `twitter:card`) so links show a preview on WhatsApp, Facebook and Pinterest. Book pages use the cover; pages without one use `assets/og/hannas-universe.jpg` (1200×630).

## Languages

- **Site pages** exist as `page.html` (English), `page-es.html` and `page-pt.html`. Each points to itself as canonical and lists all three with `<link rel="alternate" hreflang="en|es|pt|x-default">` (x-default is the English one). The list must be identical on the three pages.
- **Book pages with editions in several languages** (Equipa / Equip / Equipe, La esencia / The Essence / A Essência, the 101 books, the devotionals, Promesas / Promises): each edition has one **main page**, the one whose interface is in the book's own language, for example `product-la-esencia-de-criar-es.html`. The other two interface versions of that edition point their canonical to the main page and carry no hreflang or JSON-LD. The main pages of the translated editions list each other with hreflang.
- **Books with one edition and translated pages** (coloring book, trilingual volumes) treat the three versions as language versions: each is canonical to itself and they list each other with hreflang.

## Structured data (JSON-LD)

- Main book pages: a `Book` + `Product` block with name, author, language, cover, description and offers (the e-book sold here, the print book on Amazon). **When a price changes, change it in this block too.**
- Home pages: `Organization` + `WebSite`. About pages: `Person` (Rosalina Rangel).

## Sitemap and robots.txt

`sitemap.xml` lists every page that is not noindex and not canonical to another page. Regenerate it after adding, renaming or removing a page:

```
npm run sitemap
```

`robots.txt` points search engines to the sitemap and keeps them out of `/api/`. Submit the sitemap once in Google Search Console (Sitemaps > `https://www.hannasuniverse.com/sitemap.xml`).

## Images

Covers and photos are JPEG, at most about 1080 px wide. Book covers further down a page get `loading="lazy" decoding="async"`; the main cover on a book page does not. When an image is renamed, add a permanent redirect from the old path in `vercel.json` so links already shared keep working.

## Adding a book page

1. Copy the three pages of a similar book and change the content, title, description and Pinterest link.
2. Set the canonical and hreflang links as described above, and update the JSON-LD block (name, language, cover, description, prices, Amazon link).
3. If the e-book is sold here, show `$X <small>paperback</small> · $Y <small>e-book</small>` and the "Buy the e-book" button next to Amazon (see `docs/EBOOK-DELIVERY.md`).
4. Link the page from `books*.html` or `ebooks*.html`, then run `npm run sitemap`.
