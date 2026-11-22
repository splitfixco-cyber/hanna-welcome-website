#!/usr/bin/env python3
"""Sube las tarjetas de Navidad sueltas al almacén privado de Vercel Blob (sin Node).

    python3 scripts/subir-tarjetas.py "/ruta/a/Para subir a la web"

La carpeta (FUERA de este repo, que es público) tiene una subcarpeta por tarjeta, con el nombre del id del
catálogo (tarjetas-catalogo.js), y dentro doblada.pdf, 4x6.pdf y whatsapp.jpg. Se guardan como
tarjetas/<id>/<archivo>. Necesita BLOB_READ_WRITE_TOKEN en el entorno o en .env.local.
Hace lo mismo que put() de @vercel/blob 2.8 (API versión 12).
"""
import os
import re
import sys
import urllib.parse
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TIPOS = {'doblada.pdf': 'application/pdf', '4x6.pdf': 'application/pdf', 'whatsapp.jpg': 'image/jpeg'}


def token():
    t = os.environ.get('BLOB_READ_WRITE_TOKEN')
    if t:
        return t
    try:
        for linea in open(os.path.join(RAIZ, '.env.local'), encoding='utf-8'):
            m = re.match(r'\s*BLOB_READ_WRITE_TOKEN\s*=\s*(.*)\s*$', linea)
            if m:
                return m.group(1).strip().strip('"\'')
    except FileNotFoundError:
        pass
    sys.exit('Falta BLOB_READ_WRITE_TOKEN (ponlo en .env.local)')


def ids_catalogo():
    texto = open(os.path.join(RAIZ, 'tarjetas-catalogo.js'), encoding='utf-8').read()
    return re.findall(r"id:\s*'([a-z]{2}-[a-z0-9-]+)'", texto)


def subir(tok, ruta_blob, datos, tipo):
    store = tok.split('_')[3]
    url = 'https://vercel.com/api/blob/?' + urllib.parse.urlencode({'pathname': ruta_blob})
    req = urllib.request.Request(url, data=datos, method='PUT', headers={
        'authorization': f'Bearer {tok}',
        'x-api-version': '12',
        'x-vercel-blob-store-id': store,
        'x-vercel-blob-access': 'private',
        'x-content-type': tipo,
        'x-add-random-suffix': '0',
        'x-allow-overwrite': '1',
    })
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.status


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    carpeta = os.path.abspath(sys.argv[1])
    if carpeta.lower().startswith(RAIZ.lower()):
        sys.exit('No: esa carpeta está dentro del repo público. Déjala fuera.')
    tok = token()
    ids = ids_catalogo()
    faltan = []
    for cid in ids:
        for archivo, tipo in TIPOS.items():
            ruta = os.path.join(carpeta, cid, archivo)
            if not os.path.exists(ruta):
                faltan.append(f'{cid}/{archivo}')
                continue
            with open(ruta, 'rb') as f:
                estado = subir(tok, f'tarjetas/{cid}/{archivo}', f.read(), tipo)
            print(f'{estado}  tarjetas/{cid}/{archivo}')
    print('Listo.' + (f' Faltan: {", ".join(faltan)}' if faltan else ' Están todas.'))


if __name__ == '__main__':
    main()
