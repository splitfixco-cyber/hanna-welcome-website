// GET /api/tarjetas-descarga?session_id=cs_...&check=1            -> JSON: ¿está pagado?, idioma y tarjetas del pedido
// GET /api/tarjetas-descarga?session_id=cs_...&id=es-mama&formato=doblada|4x6|whatsapp  -> el archivo
// El session_id es la prueba de compra: solo lo conoce quien pagó (redirección de Stripe y correo).
import { isSessionId, json } from '../lib/ebooks.js';
import { resolverPedido, archivoTarjeta, POR_ID } from '../lib/tarjetas.js';
import { FORMATOS } from '../tarjetas-catalogo.js';

export async function GET(request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id');
  if (!isSessionId(sessionId)) return json({ ok: false, error: 'missing_session' }, 400);

  let pedido;
  try {
    pedido = await resolverPedido(sessionId);
  } catch (err) {
    console.error('stripe lookup failed', err);
    return json({ ok: false, error: 'stripe_error' }, 502);
  }
  if (!pedido) return json({ ok: false, error: 'not_found' }, 404);
  if (!pedido.esTarjetas) return json({ ok: false, error: 'not_cards' }, 404);
  if (!pedido.paid) return json({ ok: false, error: 'unpaid' }, 402);

  if (url.searchParams.has('check')) {
    return json({
      ok: true,
      lang: pedido.lang,
      tipo: pedido.tipo,
      tarjetas: pedido.ids.map((id) => ({ id, nombre: POR_ID[id].nombre, lang: POR_ID[id].lang })),
    });
  }

  const id = url.searchParams.get('id');
  const formato = url.searchParams.get('formato');
  if (!pedido.ids.includes(id)) return json({ ok: false, error: 'not_in_order' }, 403);
  if (!FORMATOS[formato]) return json({ ok: false, error: 'bad_format' }, 400);

  let file;
  try {
    file = await archivoTarjeta(id, formato);
  } catch (err) {
    console.error('blob fetch failed', err);
    return json({ ok: false, error: 'storage_error' }, 502);
  }
  if (!file) return json({ ok: false, error: 'file_missing' }, 503);

  const headers = {
    'content-type': file.contentType,
    'content-disposition': `attachment; filename="${file.filename}"`,
    'cache-control': 'private, no-store',
    'x-robots-tag': 'noindex',
  };
  if (file.size) headers['content-length'] = String(file.size);
  return new Response(file.stream, { status: 200, headers });
}
