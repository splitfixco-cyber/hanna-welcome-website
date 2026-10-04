// Shared catalog + helpers for the e-book delivery functions (api/download.js, api/stripe-webhook.js).
// Slugs match the `slug` metadata on the Stripe products/prices/payment links and the `book=` param on thanks.html.
import Stripe from 'stripe';
import { get } from '@vercel/blob';

export const SITE_URL = (process.env.SITE_URL || 'https://www.hannasuniverse.com').replace(/\/$/, '');

export const EBOOKS = {
  'the-essence-of-raising-children': { title: 'The Essence of Raising Children', lang: 'en' },
  'la-esencia-de-criar':             { title: 'La Esencia de Criar', lang: 'es' },
  'a-essencia-de-criar-filhos':      { title: 'A Essência de Criar Filhos', lang: 'pt' },
  'equip-your-kids-for-life':        { title: 'Equip Your Kids for Life', lang: 'en' },
  'equipa-tus-hijos-para-la-vida':   { title: 'Equipa tus hijos para la vida', lang: 'es' },
  'equipe-seus-filhos-para-a-vida':  { title: 'Equipe seus filhos para a vida', lang: 'pt' },
};

const FILE_TYPES = [
  { ext: 'pdf', contentType: 'application/pdf' },
  { ext: 'epub', contentType: 'application/epub+zip' },
];

let stripeClient;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
  stripeClient ||= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

export function isSessionId(id) {
  return typeof id === 'string' && /^cs_(live|test)_[A-Za-z0-9]{10,}$/.test(id);
}

/**
 * Look up a Checkout Session and work out whether it is paid and which e-book it was for.
 * Returns null when Stripe has no such session.
 */
export async function resolveOrder(sessionId) {
  let session;
  try {
    session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ['line_items.data.price'] });
  } catch (err) {
    if (err?.code === 'resource_missing' || err?.statusCode === 404) return null;
    throw err;
  }
  let slug = session.metadata?.slug || session.line_items?.data?.[0]?.price?.metadata?.slug || null;
  if (!slug && session.payment_link) {
    const link = await stripe().paymentLinks.retrieve(session.payment_link);
    slug = link.metadata?.slug || null;
  }
  const paid = session.payment_status === 'paid'
    || (session.status === 'complete' && session.payment_status === 'no_payment_required');
  return {
    id: session.id,
    paid,
    slug,
    book: slug ? EBOOKS[slug] || null : null,
    email: session.customer_details?.email || session.customer_email || null,
    name: session.customer_details?.name || null,
  };
}

/** Fetch the e-book file for a slug from private Vercel Blob storage. Returns null when no file is uploaded yet. */
export async function fetchEbookFile(slug) {
  if (!EBOOKS[slug]) return null;
  for (const { ext, contentType } of FILE_TYPES) {
    const pathname = `ebooks/${slug}.${ext}`;
    const result = await get(pathname, { access: 'private' });
    if (result && result.statusCode === 200 && result.stream) {
      return {
        stream: result.stream,
        contentType: result.blob.contentType || contentType,
        size: result.blob.size,
        filename: `${slug}.${ext}`,
      };
    }
  }
  return null;
}

export function thanksUrl(sessionId, slug) {
  return `${SITE_URL}/thanks.html?session_id=${encodeURIComponent(sessionId)}`
    + (slug ? `&book=${encodeURIComponent(slug)}` : '');
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}
