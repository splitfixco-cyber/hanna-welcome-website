// GET /api/download?session_id=cs_...&format=pdf   -> streams the purchased e-book (format: pdf | epub; default PDF, else EPUB)
// GET /api/download?session_id=cs_...&check=1      -> JSON: is this order paid, which book, which formats are available
// The session id is the proof of purchase: it is only known to the buyer (Stripe redirect + email).
import { resolveOrder, fetchEbookFile, availableFormats, isSessionId, json, FORMATS } from '../lib/ebooks.js';

export async function GET(request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id');
  const check = url.searchParams.has('check');
  const format = url.searchParams.get('format') || undefined;

  if (!isSessionId(sessionId)) return json({ ok: false, error: 'missing_session' }, 400);
  if (format && !FORMATS.includes(format)) return json({ ok: false, error: 'bad_format' }, 400);

  let order;
  try {
    order = await resolveOrder(sessionId);
  } catch (err) {
    console.error('stripe lookup failed', err);
    return json({ ok: false, error: 'stripe_error' }, 502);
  }
  if (!order) return json({ ok: false, error: 'not_found' }, 404);
  if (!order.paid) return json({ ok: false, error: 'unpaid' }, 402);
  if (!order.book) return json({ ok: false, error: 'unknown_book', slug: order.slug }, 404);

  if (check) {
    let formats = [];
    try {
      formats = await availableFormats(order.slug);
    } catch (err) {
      console.error('blob check failed', err);
    }
    return json({ ok: true, ready: formats.length > 0, formats, slug: order.slug, title: order.book.title, lang: order.book.lang });
  }

  let file;
  try {
    file = await fetchEbookFile(order.slug, format);
  } catch (err) {
    console.error('blob fetch failed', err);
    return json({ ok: false, error: 'storage_error' }, 502);
  }
  if (!file) return json({ ok: false, error: 'file_missing', slug: order.slug }, 503);

  const headers = {
    'content-type': file.contentType,
    'content-disposition': `attachment; filename="${file.filename}"`,
    'cache-control': 'private, no-store',
    'x-robots-tag': 'noindex',
  };
  if (file.size) headers['content-length'] = String(file.size);
  return new Response(file.stream, { status: 200, headers });
}
