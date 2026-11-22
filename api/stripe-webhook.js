// POST /api/stripe-webhook  (Stripe -> us)
// On checkout.session.completed (paid), email the buyer their e-book: the file attached when it is small
// enough, and always a download link that keeps working (thanks.html with their session id).
import nodemailer from 'nodemailer';
import { stripe, resolveOrder, fetchEbookFile, thanksUrl, json, FORMATS } from '../lib/ebooks.js';
import { resolverPedido, graciasUrl, POR_ID } from '../lib/tarjetas.js';

const MAX_ATTACH_BYTES = 20 * 1024 * 1024; // Gmail/Outlook reject larger attachments; fall back to link only

export async function POST(request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return json({ error: 'STRIPE_WEBHOOK_SECRET not set' }, 500);

  const signature = request.headers.get('stripe-signature');
  const rawBody = await request.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error('webhook signature failed', err.message);
    return json({ error: 'bad_signature' }, 400);
  }

  const handled = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
  if (!handled.includes(event.type)) return json({ received: true, ignored: event.type });

  const session = event.data.object;
  if (session.payment_status !== 'paid') return json({ received: true, skipped: 'not_paid_yet' });

  // Christmas cards (tarjetas) are paid through their own payment links: email the download page and stop here.
  let pedido = null;
  try {
    pedido = await resolverPedido(session.id);
  } catch (err) {
    console.error('card order lookup failed, treating as e-book', err);
  }
  if (pedido?.esTarjetas) return enviarTarjetas(pedido);

  const order = await resolveOrder(session.id);
  if (!order?.book) {
    console.error('paid session without a known e-book', session.id, order?.slug);
    return json({ received: true, skipped: 'unknown_book' });
  }
  if (!order.email) {
    console.error('paid session without a customer email', session.id);
    return json({ received: true, skipped: 'no_email' });
  }

  // Attach the PDF when it is small enough, otherwise the EPUB; otherwise link only.
  let attachment = null;
  try {
    for (const format of FORMATS) {
      const file = await fetchEbookFile(order.slug, format);
      if (!file) continue;
      if (file.size && file.size > MAX_ATTACH_BYTES) { await file.stream.cancel().catch(() => {}); continue; }
      const buf = Buffer.from(await new Response(file.stream).arrayBuffer());
      if (buf.length <= MAX_ATTACH_BYTES) {
        attachment = { filename: file.filename, content: buf, contentType: file.contentType };
        break;
      }
    }
  } catch (err) {
    console.error('could not fetch e-book for attachment, sending link only', err);
  }

  const mail = buildEmail({ order, attachment: !!attachment });
  try {
    await transport().sendMail({
      from: process.env.MAIL_FROM,
      replyTo: process.env.MAIL_REPLY_TO || undefined,
      to: order.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      attachments: attachment ? [attachment] : [],
    });
  } catch (err) {
    console.error('email send failed', err);
    // 500 makes Stripe retry the event later (up to 3 days), so a mail outage does not lose the delivery.
    return json({ error: 'email_failed' }, 500);
  }
  return json({ received: true, emailed: order.email, attached: !!attachment });
}

let transportInstance;
function transport() {
  if (!transportInstance) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) throw new Error('SMTP_HOST, SMTP_USER and SMTP_PASS must be set');
    const port = Number(SMTP_PORT || 465);
    transportInstance = nodemailer.createTransport({
      host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transportInstance;
}

const COPY = {
  en: {
    subject: (t) => `Your e-book: ${t}`,
    hi: (n) => (n ? `Hi ${n},` : 'Hello,'),
    thanks: (t) => `Thank you for your purchase of <b>${t}</b>.`,
    attached: 'Your e-book is attached to this email.',
    link: 'You can also download it any time, in PDF or EPUB, from this link:',
    button: 'Download your e-book',
    keep: 'Keep this email: the link keeps working if you need the file again.',
    help: 'Questions? Just reply to this email.',
    sign: "With love,<br>Rosalina Rangel · Hanna's Universe",
  },
  es: {
    subject: (t) => `Tu e-book: ${t}`,
    hi: (n) => (n ? `Hola ${n},` : 'Hola,'),
    thanks: (t) => `Gracias por comprar <b>${t}</b>.`,
    attached: 'Tu e-book va adjunto en este correo.',
    link: 'También puedes descargarlo cuando quieras, en PDF o EPUB, desde este enlace:',
    button: 'Descargar tu e-book',
    keep: 'Guarda este correo: el enlace seguirá funcionando si necesitas el archivo de nuevo.',
    help: '¿Preguntas? Responde a este correo.',
    sign: 'Con cariño,<br>Rosalina Rangel · El Universo de Hanna',
  },
  pt: {
    subject: (t) => `Seu e-book: ${t}`,
    hi: (n) => (n ? `Olá ${n},` : 'Olá,'),
    thanks: (t) => `Obrigada por comprar <b>${t}</b>.`,
    attached: 'Seu e-book está anexado a este e-mail.',
    link: 'Você também pode baixá-lo quando quiser, em PDF ou EPUB, por este link:',
    button: 'Baixar seu e-book',
    keep: 'Guarde este e-mail: o link continua funcionando se precisar do arquivo de novo.',
    help: 'Dúvidas? É só responder a este e-mail.',
    sign: 'Com carinho,<br>Rosalina Rangel · O Universo da Hanna',
  },
};

export function buildEmail({ order, attachment }) {
  const c = COPY[order.book.lang] || COPY.en;
  const title = order.book.title;
  const url = thanksUrl(order.id, order.slug);
  const firstName = order.name ? order.name.split(' ')[0] : '';
  const strip = (s) => s.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '');
  const lines = [c.hi(firstName), '', strip(c.thanks(title)), attachment ? c.attached : '', c.link, url, '', c.keep, c.help, '', strip(c.sign)];
  const html = `
<div style="font-family:Georgia,'Times New Roman',serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#3a2d24;background:#fbf7f0;">
  <p style="font-size:18px;margin:0 0 16px;">${c.hi(firstName)}</p>
  <p style="font-size:16px;line-height:1.5;margin:0 0 12px;">${c.thanks(title)}</p>
  ${attachment ? `<p style="font-size:16px;line-height:1.5;margin:0 0 12px;">${c.attached}</p>` : ''}
  <p style="font-size:16px;line-height:1.5;margin:0 0 20px;">${c.link}</p>
  <p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;background:#7ea06b;color:#fff;text-decoration:none;padding:14px 26px;border-radius:999px;font-size:16px;">${c.button}</a></p>
  <p style="font-size:13px;line-height:1.5;color:#6b5a4e;margin:0 0 8px;word-break:break-all;">${url}</p>
  <p style="font-size:14px;line-height:1.5;color:#6b5a4e;margin:0 0 8px;">${c.keep}</p>
  <p style="font-size:14px;line-height:1.5;color:#6b5a4e;margin:0 0 24px;">${c.help}</p>
  <p style="font-size:15px;line-height:1.5;margin:0;">${c.sign}</p>
</div>`;
  const text = lines.filter((l, i) => l !== '' || lines[i - 1] !== '').join('\n');
  return { subject: c.subject(title), text, html };
}

const TARJETAS_COPY = {
  es: {
    subject: 'Tus tarjetas de Navidad de Hanna',
    hi: (n) => (n ? `Hola ${n},` : 'Hola,'),
    thanks: 'Gracias por tu compra. Tus tarjetas de Navidad están listas:',
    how: 'Cada una viene de tres maneras: doblada para escribir adentro, en tamaño 4×6 y en imagen para WhatsApp. Descárgalas desde este enlace:',
    button: 'Descargar mis tarjetas',
    keep: 'Guarda este correo: el enlace seguirá funcionando si necesitas las tarjetas de nuevo.',
    books: 'Si te gustó Hanna, conoce sus libros en papel en hannasuniverse.com.',
    sign: 'Con cariño y feliz Navidad,<br>Rosalina Rangel · Hanna\'s Universe',
  },
  en: {
    subject: "Your Christmas cards from Hanna",
    hi: (n) => (n ? `Hi ${n},` : 'Hello,'),
    thanks: 'Thank you for your purchase. Your Christmas cards are ready:',
    how: 'Each one comes three ways: folded to write inside, 4×6, and as an image for WhatsApp. Download them from this link:',
    button: 'Download my cards',
    keep: 'Keep this email: the link keeps working if you need the cards again.',
    books: 'If you love Hanna, meet her printed books at hannasuniverse.com.',
    sign: "With love and a merry Christmas,<br>Rosalina Rangel · Hanna's Universe",
  },
};

async function enviarTarjetas(pedido) {
  if (!pedido.email) {
    console.error('paid card order without a customer email', pedido.id);
    return json({ received: true, skipped: 'no_email' });
  }
  const c = TARJETAS_COPY[pedido.lang] || TARJETAS_COPY.es;
  const url = graciasUrl(pedido.id);
  const firstName = pedido.name ? pedido.name.split(' ')[0] : '';
  const lista = pedido.ids.map((id) => POR_ID[id].nombre);
  const strip = (s) => s.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '');
  const text = [c.hi(firstName), '', c.thanks, lista.join(', '), '', c.how, url, '', c.keep, c.books, '', strip(c.sign)].join('\n');
  const html = `
<div style="font-family:Georgia,'Times New Roman',serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#3a2d24;background:#fbf7f0;">
  <p style="font-size:18px;margin:0 0 16px;">${c.hi(firstName)}</p>
  <p style="font-size:16px;line-height:1.5;margin:0 0 8px;">${c.thanks}</p>
  <p style="font-size:16px;line-height:1.5;margin:0 0 16px;"><b>${lista.join(' · ')}</b></p>
  <p style="font-size:16px;line-height:1.5;margin:0 0 20px;">${c.how}</p>
  <p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;background:#14264a;color:#fff;text-decoration:none;padding:14px 26px;border-radius:8px;font-size:16px;">${c.button}</a></p>
  <p style="font-size:13px;line-height:1.5;color:#6b5a4e;margin:0 0 8px;word-break:break-all;">${url}</p>
  <p style="font-size:14px;line-height:1.5;color:#6b5a4e;margin:0 0 8px;">${c.keep}</p>
  <p style="font-size:14px;line-height:1.5;color:#6b5a4e;margin:0 0 24px;">${c.books}</p>
  <p style="font-size:15px;line-height:1.5;margin:0;">${c.sign}</p>
</div>`;
  try {
    await transport().sendMail({
      from: process.env.MAIL_FROM,
      replyTo: process.env.MAIL_REPLY_TO || undefined,
      to: pedido.email,
      subject: c.subject,
      text,
      html,
    });
  } catch (err) {
    console.error('card email send failed', err);
    return json({ error: 'email_failed' }, 500);
  }
  return json({ received: true, emailed: pedido.email, tarjetas: pedido.ids.length });
}
