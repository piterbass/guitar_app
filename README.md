# Guitarreando 🎸

App de guitarra **PWA** (Progressive Web App) construida 100% en **Vanilla JS**, sin frameworks
ni build system. Funciona **offline**, es instalable en el móvil y cubre acordes, escalas,
canciones, práctica y audio.

🔗 **En vivo:** <https://guitarreando.magicbrain.online>

---

## Features

- **Acordes**
  - Buscador de voicings en el mástil (búsqueda DFS) con diagramas SVG.
  - Banco de voicings favoritos.
  - **Analizador de acordes**: tocás cuerdas/trastes y te dice qué acorde es (con alternativas).
  - Práctica interactiva con arpegios.

- **Escalas**
  - Posiciones: 3 notas por cuerda, pentatónica, blues, simétricas, bebop.
  - Constructor de posiciones custom y banco de escalas favoritas.
  - Detección de escalas compatibles con un acorde.

- **Análisis Armónico**
  - Detecta tonalidad, grados, funciones (tónica/subdominante/dominante…) y escalas
    sugeridas para cada acorde de una progresión.
  - Funciona sobre la biblioteca de progresiones, tus canciones o entrada manual.

- **Canciones (cancionero)**
  - Editor en vivo con formato `[Acorde]letra`, transposición y pin de voicings de referencia.
  - Import pegando texto tipo LaCuerda.net (alinea acordes sobre la letra).
  - **Descarga de PDF** con toda la letra + acordes, nombrado `Canción - Autor.pdf`.

- **Audio**: reproducción con samples Soundfont (guitarra de nylon) y fallback de síntesis
  Karplus-Strong, vía Web Audio API.

- **Práctica**: práctica de escalas con metrónomo.

> **Notación:** la app usa **cifrado americano** (C, D, E…). Si escribís en cifrado latino
> (Do, Re, Mi…), se traduce automáticamente a americano.

---

## Tech Stack

- **HTML / CSS / JS puro** — sin React/Vue, sin npm, sin bundler.
- **Web Audio API** para audio.
- **SVG** para diagramas de trastes y acordes.
- **localStorage** para persistencia (canciones, bancos, escalas custom).
- **Service Worker** (cache offline, estrategia network-first con cache versionado).
- Generador de **PDF propio** (vanilla, sin dependencias) para exportar canciones.

Cada módulo en `js/` sigue el patrón **IIFE** y expone su API en `window.*`.

---

## Cómo correrla en local

Es estática: alcanza con servir la carpeta por HTTP (el Service Worker necesita `http://`,
no `file://`). Por ejemplo:

```bash
# con Python
python -m http.server 3456

# o con cualquier server estático, p. ej. npx serve
npx serve -l 3456
```

Y abrir <http://localhost:3456>.

> No hay `package.json` ni instalación de dependencias para correr la app. (`node_modules`
> que pueda aparecer en local es solo para tooling de testing manual, no es parte del build.)

---

## Estructura

```
├── index.html          # SPA principal (CSS inline)
├── service-worker.js   # Cache offline (CACHE_NAME = versión actual)
├── manifest.json       # Configuración PWA
├── js/                 # 26 módulos (teoría, acordes, escalas, canciones, audio, UI)
└── public/             # Assets
```

Detalle de módulos y convenciones internas: ver [`CLAUDE.md`](CLAUDE.md).

---

## Deploy

Producción en Hetzner (server `zampedri`), servida como archivos estáticos por **nginx**
desde `/var/www/guitarreando` (clon del branch `main`).

```bash
# 1. Bumpear CACHE_NAME en service-worker.js y los ?v=NN en index.html
# 2. Push a main
git push origin main
# 3. Pull en el server
ssh zampedri "cd /var/www/guitarreando && git pull"
```

No hace falta recargar nginx (son archivos estáticos). El bump de versión es lo que hace que
el Service Worker entregue la versión nueva a los clientes en el próximo refresh.

---

## Contribuir

- No agregar frameworks ni dependencias npm — todo vanilla JS.
- Mantener el patrón IIFE y exportar al `window` (PascalCase).
- Probar en móvil (la app es mobile-first) y mantener compatibilidad **offline**.
- Si agregás un archivo nuevo, sumalo al cache en `service-worker.js`.
- No hay tests automatizados: testing manual en el browser.
