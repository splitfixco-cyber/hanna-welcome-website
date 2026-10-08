// POST /api/subscribe  (footer form and quiz result -> us)
// Saves the email in the private Blob store as suscriptores/<email>.json, then sends a welcome email
// with the Hey! magazine and the quiz. The email is best effort: the subscriber is kept even if SMTP fails.
// Body: form data or JSON with email, lang (es | en | pt), origen (where on the site) and empresa (honeypot).
import nodemailer from 'nodemailer';
import { put } from '@vercel/blob';
import { json } from '../lib/ebooks.js';

const LANGS = ['es', 'en', 'pt'];
const EMAIL = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i;

export async function POST(request) {
  let data;
  try {
    const type = request.headers.get('content-type') || '';
    data = type.includes('application/json')
      ? await request.json()
      : Object.fromEntries(await request.formData());
  } catch {
    return json({ ok: false, error: 'bad_body' }, 400);
  }

  // Bots fill every field; people never see this one.
  if (data.empresa) return json({ ok: true });

  const email = String(data.email || '').trim().toLowerCase();
  if (email.length > 120 || !EMAIL.test(email)) return json({ ok: false, error: 'bad_email' }, 400);
  const lang = LANGS.includes(data.lang) ? data.lang : 'en';
  const origen = String(data.origen || '').slice(0, 40);

  const file = `suscriptores/${email.replace(/[^a-z0-9@._+-]/g, '_')}.json`;
  try {
    await put(file, JSON.stringify({ email, lang, origen, fecha: new Date().toISOString() }), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });
  } catch (err) {
    console.error('could not save subscriber', err);
    return json({ ok: false, error: 'storage_error' }, 502);
  }

  try {
    const mail = WELCOME[lang];
    await transport().sendMail({
      from: process.env.MAIL_FROM,
      replyTo: process.env.MAIL_REPLY_TO || undefined,
      to: email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  } catch (err) {
    console.error('welcome email failed', err);
  }
  return json({ ok: true });
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

const SITE = (process.env.SITE_URL || 'https://www.hannasuniverse.com').replace(/\/$/, '');

function welcome({ subject, hi, body, hey, test, testUrl, sign }) {
  const heyUrl = `${SITE}/hey/`;
  const button = (href, label) =>
    `<p style="margin:22px 0"><a href="${href}" style="background:#f3c74f;color:#14264a;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:bold">${label}</a></p>`;
  return {
    subject,
    text: `${hi}\n\n${body}\n\n${hey}: ${heyUrl}\n${test}: ${testUrl}\n\n${sign.replace('<br>', '\n')}`,
    html:
      `<div style="font-family:Georgia,serif;font-size:17px;line-height:1.55;color:#14264a;max-width:520px">` +
      `<p>${hi}</p><p>${body}</p>${button(heyUrl, hey)}${button(testUrl, test)}<p>${sign}</p></div>`,
  };
}

const WELCOME = {
  es: welcome({
    subject: '¡Bienvenida a Hanna\'s Universe! 💛',
    hi: 'Hola,',
    body: 'Gracias por unirte. Cada mes te llega aquí la revista Hey!, gratis, con ideas sencillas para la crianza, un momento de fe y una hoja para pintar con tus hijos. Para empezar, aquí tienes el número de este mes y el test que te dice qué puede hacer solo tu hijo a su edad.',
    hey: 'Leer la revista Hey!',
    test: 'Hacer el test gratis',
    testUrl: `${SITE}/test`,
    sign: 'Con cariño,<br>Rosalina Rangel · Hanna\'s Universe',
  }),
  en: welcome({
    subject: 'Welcome to Hanna\'s Universe! 💛',
    hi: 'Hello,',
    body: 'Thank you for joining. Every month you will get Hey! magazine here, free, with simple parenting ideas, a moment of faith and a coloring page to enjoy with your kids. To start, here is this month\'s issue and the quiz that shows what your child can do on their own at their age.',
    hey: 'Read Hey! magazine',
    test: 'Take the free quiz',
    testUrl: `${SITE}/quiz`,
    sign: 'With love,<br>Rosalina Rangel · Hanna\'s Universe',
  }),
  pt: welcome({
    subject: 'Bem-vinda ao Hanna\'s Universe! 💛',
    hi: 'Olá,',
    body: 'Obrigada por se juntar a nós. Todo mês você recebe aqui a revista Hey!, grátis, com ideias simples para a criação dos filhos, um momento de fé e uma folha para colorir com as crianças. Para começar, aqui está a edição deste mês e o teste que mostra o que seu filho já pode fazer sozinho na idade dele.',
    hey: 'Ler a revista Hey!',
    test: 'Fazer o teste grátis',
    testUrl: `${SITE}/teste`,
    sign: 'Com carinho,<br>Rosalina Rangel · Hanna\'s Universe',
  }),
};
