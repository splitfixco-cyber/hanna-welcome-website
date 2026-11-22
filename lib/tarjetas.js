// Pedidos de tarjetas de Navidad sueltas (escoger 1, hasta 6, o toda la colección).
// El comprador escoge en /tarjetas o /cards; la página lo manda al Payment Link de Stripe con
// ?client_reference_id=<idioma>_<id>_<id>..., y el enlace lleva metadata { tarjetas: '1' | '6' | 'todas' }.
// Así sabemos qué escogió y cuánto pagó sin crear nada en Stripe desde aquí.
import { get } from '@vercel/blob';
import { stripe, SITE_URL } from './ebooks.js';
import { TARJETAS, MAXIMO, FORMATOS } from '../tarjetas-catalogo.js';

export const POR_ID = Object.fromEntries(TARJETAS.map((t) => [t.id, t]));
const TIPOS = ['1', '6', 'todas'];

/** "es_es-mama_es-hijo" -> { lang: 'es', ids: ['es-mama', 'es-hijo'] } (ids desconocidos o repetidos se descartan) */
export function leerSeleccion(ref) {
  const partes = String(ref || '').split('_');
  const lang = partes[0] === 'en' ? 'en' : 'es';
  const ids = [...new Set(partes.slice(1))].filter((id) => POR_ID[id]);
  return { lang, ids };
}

/**
 * Busca la sesión de pago y, si fue un pedido de tarjetas, dice cuáles le tocan.
 * Devuelve null si Stripe no tiene esa sesión, y { esTarjetas: false } si fue otra compra (un e-book).
 */
export async function resolverPedido(sessionId) {
  let session;
  try {
    session = await stripe().checkout.sessions.retrieve(sessionId);
  } catch (err) {
    if (err?.code === 'resource_missing' || err?.statusCode === 404) return null;
    throw err;
  }
  // Solo la página de tarjetas manda client_reference_id ("es_..." o "en_..."); los e-books no lo llevan.
  const ref = session.client_reference_id || '';
  if (!/^(es|en)(_|$)/.test(ref)) return { esTarjetas: false };
  let tipo = session.metadata?.tarjetas || null;
  if (!tipo && session.payment_link) {
    const link = await stripe().paymentLinks.retrieve(session.payment_link);
    tipo = link.metadata?.tarjetas || null;
  }
  // Sin metadata en el enlace, el precio dice cuál fue: $2, $5 o $10 (antes de impuestos).
  if (!tipo) tipo = { 200: '1', 500: '6', 1000: 'todas' }[session.amount_subtotal] || null;
  if (!TIPOS.includes(tipo)) return { esTarjetas: false };

  const { lang, ids } = leerSeleccion(ref);
  const elegidas = tipo === 'todas' ? TARJETAS.map((t) => t.id) : ids.slice(0, MAXIMO[tipo]);
  const paid = session.payment_status === 'paid'
    || (session.status === 'complete' && session.payment_status === 'no_payment_required');
  return {
    esTarjetas: true,
    id: session.id,
    paid,
    tipo,
    lang,
    ids: elegidas,
    email: session.customer_details?.email || session.customer_email || null,
    name: session.customer_details?.name || null,
  };
}

/** Un archivo de una tarjeta desde el almacén privado, o null si todavía no se subió. */
export async function archivoTarjeta(id, formato) {
  const f = FORMATOS[formato];
  if (!POR_ID[id] || !f) return null;
  const result = await get(`tarjetas/${id}/${f.archivo}`, { access: 'private' });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const ext = f.archivo.split('.').pop();
  return {
    stream: result.stream,
    contentType: result.blob.contentType || f.tipo,
    size: result.blob.size,
    filename: `hanna-${id}-${formato}.${ext}`,
  };
}

export function graciasUrl(sessionId) {
  return `${SITE_URL}/tarjetas-gracias.html?session_id=${encodeURIComponent(sessionId)}`;
}
