// Catálogo de las tarjetas de Navidad que se venden sueltas (página /tarjetas y /cards).
// Lo usan el navegador (la página para escoger) y las funciones de Vercel (cobro y descarga).
// Los archivos de cada tarjeta están en el almacén privado: tarjetas/<id>/doblada.pdf, 4x6.pdf y whatsapp.jpg.

export const TARJETAS = [
  { id: 'es-mama',       lang: 'es', nombre: 'Mamá' },
  { id: 'es-papa',       lang: 'es', nombre: 'Papá' },
  { id: 'es-esposo',     lang: 'es', nombre: 'Esposo' },
  { id: 'es-esposa',     lang: 'es', nombre: 'Esposa' },
  { id: 'es-hijo',       lang: 'es', nombre: 'Hijo' },
  { id: 'es-hija',       lang: 'es', nombre: 'Hija' },
  { id: 'es-abuela',     lang: 'es', nombre: 'Abuela' },
  { id: 'es-abuelo',     lang: 'es', nombre: 'Abuelo' },
  { id: 'es-hermana',    lang: 'es', nombre: 'Hermana' },
  { id: 'es-hermano',    lang: 'es', nombre: 'Hermano' },
  { id: 'es-sobrina',    lang: 'es', nombre: 'Sobrina' },
  { id: 'es-sobrino',    lang: 'es', nombre: 'Sobrino' },
  { id: 'es-amigo',      lang: 'es', nombre: 'Mejor amigo' },
  { id: 'es-amiga',      lang: 'es', nombre: 'Mejor amiga' },
  { id: 'es-hogar',      lang: 'es', nombre: 'Alegría a tu hogar' },
  { id: 'es-nacimiento', lang: 'es', nombre: 'El nacimiento' },
  { id: 'es-isaias',     lang: 'es', nombre: 'Isaías 9:6' },
  { id: 'es-pesebre',    lang: 'es', nombre: 'El pesebre · Lucas 2:11' },
  { id: 'es-santa',      lang: 'es', nombre: 'Bendiciones navideñas' },
  { id: 'es-amigo-nieve',lang: 'es', nombre: 'Para mi amigo' },
  { id: 'es-jefe',       lang: 'es', nombre: 'Para mi jefe' },
  { id: 'es-gato',       lang: 'es', nombre: 'El gato del farol' },
  { id: 'en-mom',        lang: 'en', nombre: 'Mom' },
  { id: 'en-dad',        lang: 'en', nombre: 'Dad' },
  { id: 'en-husband',    lang: 'en', nombre: 'Husband' },
  { id: 'en-wife',       lang: 'en', nombre: 'Wife' },
  { id: 'en-son',        lang: 'en', nombre: 'Son' },
  { id: 'en-daughter',   lang: 'en', nombre: 'Daughter' },
  { id: 'en-grandma',    lang: 'en', nombre: 'Grandma' },
  { id: 'en-grandpa',    lang: 'en', nombre: 'Grandpa' },
  { id: 'en-sister',     lang: 'en', nombre: 'Sister' },
  { id: 'en-brother',    lang: 'en', nombre: 'Brother' },
  { id: 'en-niece',      lang: 'en', nombre: 'Niece' },
  { id: 'en-nephew',     lang: 'en', nombre: 'Nephew' },
  { id: 'en-friend',     lang: 'en', nombre: 'Best Friend' },
  { id: 'en-home',       lang: 'en', nombre: 'Joy to Your Home' },
  { id: 'en-nativity',   lang: 'en', nombre: 'The Nativity' },
  { id: 'en-manger',     lang: 'en', nombre: 'The Manger · Luke 2:11' },
  { id: 'en-santa',      lang: 'en', nombre: 'Christmas Blessings' },
  { id: 'en-friend-snow',lang: 'en', nombre: 'For My Friend' },
  { id: 'en-boss',       lang: 'en', nombre: 'For My Boss' },
  { id: 'en-cat',        lang: 'en', nombre: 'The Lantern Cat' },
];

// Precios: 1 tarjeta $2, de 2 a 6 tarjetas $5, toda la colección (español e inglés) $10.
// Cada opción es un Payment Link de Stripe ($2, $5, $10; la metadata { tarjetas: '1' | '6' | 'todas' } es opcional,
// sin ella se reconoce por el precio) que, después del pago, redirige a
// https://www.hannasuniverse.com/tarjetas-gracias.html?session_id={CHECKOUT_SESSION_ID}
// Mientras un enlace esté vacío, su botón dice «Muy pronto».
export const ENLACES = {
  uno: 'https://buy.stripe.com/aFacN5bhx3P6bH4gI46Vq0d',
  seis: 'https://buy.stripe.com/eVq9AT85l85m9yW9fC6Vq0e',
  todas: 'https://buy.stripe.com/cNi8wP99pclCfXk77u6Vq0f',
};

export const MAXIMO = { '1': 1, '6': 6 };

export const FORMATOS = {
  doblada: { archivo: 'doblada.pdf', tipo: 'application/pdf' },
  '4x6':   { archivo: '4x6.pdf',     tipo: 'application/pdf' },
  whatsapp:{ archivo: 'whatsapp.jpg', tipo: 'image/jpeg' },
};
