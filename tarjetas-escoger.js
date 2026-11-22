// Página /tarjetas y /cards: el comprador toca las tarjetas que quiere y paga 1 por $2, hasta 6 por $5 o todas por $10.
import { TARJETAS, ENLACES } from './tarjetas-catalogo.js';

const caja = document.getElementById('escoger');
if (caja) {
  const lang = caja.dataset.lang === 'en' ? 'en' : 'es';
  const T = {
    es: {
      ninguna: 'Toca las tarjetas que quieras.',
      una: '1 tarjeta · $2',
      varias: (n) => `${n} tarjetas · $5`,
      falta: (n) => (n < 6 ? ` Puedes escoger ${6 - n} más por el mismo precio.` : ''),
      tope: 'Ya escogiste 6. Para más, llévate toda la colección por $10.',
      pagar: (p) => `Pagar ${p}`,
      pronto: 'Muy pronto',
      marcada: 'escogida',
    },
    en: {
      ninguna: 'Tap the cards you want.',
      una: '1 card · $2',
      varias: (n) => `${n} cards · $5`,
      falta: (n) => (n < 6 ? ` You can pick ${6 - n} more for the same price.` : ''),
      tope: 'You picked 6. For more, get the whole collection for $10.',
      pagar: (p) => `Pay ${p}`,
      pronto: 'Coming soon',
      marcada: 'selected',
    },
  }[lang];

  const rejilla = caja.querySelector('.escoger-rejilla');
  const resumen = caja.querySelector('.escoger-resumen');
  const pagar = caja.querySelector('.escoger-pagar');
  const todas = document.querySelector('.escoger-todas');
  const elegidas = [];

  for (const t of TARJETAS.filter((x) => x.lang === lang)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'escoger-tarjeta';
    b.dataset.id = t.id;
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `<img src="assets/tarjetas/mini/${t.id}.jpg" alt="" width="400" height="600" loading="lazy"><span>${t.nombre}</span>`;
    b.addEventListener('click', () => tocar(b, t.id));
    rejilla.appendChild(b);
  }

  function tocar(boton, id) {
    const i = elegidas.indexOf(id);
    if (i >= 0) elegidas.splice(i, 1);
    else if (elegidas.length >= 6) { pintar(T.tope); return; }
    else elegidas.push(id);
    boton.setAttribute('aria-pressed', String(i < 0));
    boton.setAttribute('aria-label', i < 0 ? `${boton.textContent}, ${T.marcada}` : boton.textContent);
    pintar();
  }

  function pintar(aviso) {
    const n = elegidas.length;
    const enlace = n === 1 ? ENLACES.uno : ENLACES.seis;
    const precio = n === 1 ? '$2' : '$5';
    resumen.textContent = aviso || (n === 0 ? T.ninguna : n === 1 ? T.una + T.falta(1) : T.varias(n) + T.falta(n));
    if (n === 0) {
      pagar.hidden = true;
    } else {
      pagar.hidden = false;
      if (enlace) {
        pagar.textContent = T.pagar(precio);
        pagar.href = `${enlace}?client_reference_id=${encodeURIComponent([lang, ...elegidas].join('_'))}`;
        pagar.removeAttribute('aria-disabled');
      } else {
        pagar.textContent = T.pronto;
        pagar.removeAttribute('href');
        pagar.setAttribute('aria-disabled', 'true');
      }
    }
  }

  if (todas) {
    if (ENLACES.todas) {
      todas.href = `${ENLACES.todas}?client_reference_id=${lang}`;
    } else {
      todas.removeAttribute('href');
      todas.setAttribute('aria-disabled', 'true');
      todas.textContent = T.pronto;
    }
  }

  // Meta Pixel: inicio de compra
  document.addEventListener('click', (e) => {
    const a = e.target.closest('.escoger-pagar[href], .escoger-todas[href]');
    if (!a || !window.fbq) return;
    const valor = a.classList.contains('escoger-todas') ? 10 : elegidas.length === 1 ? 2 : 5;
    window.fbq('track', 'InitiateCheckout', { content_ids: ['tarjetas'], value: valor, currency: 'USD' });
  });

  pintar();
}
