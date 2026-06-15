# Guitar App — CLAUDE.md

## Qué es este proyecto

App de guitarra tipo PWA (Progressive Web App) construida 100% en **Vanilla JS** (sin frameworks).
Funciona offline, es instalable en móvil, y cubre: acordes, escalas, canciones, práctica y audio.

## Tech Stack

- **HTML/CSS/JS** puro — sin React, Vue, ni build system
- **Web Audio API** para reproducción y síntesis de sonido (samples Soundfont FluidR3 nylon guitar)
- **SVG** para diagramas de trastes y acordes
- **localStorage** para persistencia de datos del usuario
- **Service Worker** con estrategia network-first y cache versionado (`?v=48`)
- **No hay package.json, npm, ni bundler** — los scripts se cargan directamente en `index.html`

## Estructura del proyecto

```
├── index.html                  # SPA principal (~3,365 líneas, incluye CSS inline)
├── service-worker.js           # Cache offline (CACHE_NAME = versión actual)
├── manifest.json               # Configuración PWA
├── js/                         # 24 módulos JS (~10,000 líneas total)
│   ├── Teoría musical:
│   │   ├── music-theory.js     # NOTE_NAMES, CHORD_FORMULAS, SCALE_FORMULAS, intervalos
│   │   ├── chord-parser.js     # Parseo de nombres de acordes ("Dm7/11" → root, quality, bass)
│   │   ├── chord-identifier.js # Identificar acordes a partir de notas
│   │   ├── scale-detector.js   # Encontrar escalas compatibles con acordes
│   │   └── harmonic-context.js # Sugerencias por función armónica (tónica, dominante, etc.)
│   │
│   ├── Acordes:
│   │   ├── voicing-finder.js   # Búsqueda DFS de voicings en el mástil
│   │   ├── chord-bank.js       # Guardar voicings favoritos (localStorage)
│   │   ├── chord-practice.js   # Práctica interactiva con arpegios y notación [Chord:N]
│   │   ├── chord-progressions.js # Biblioteca de progresiones (jazz, pop, cancionero)
│   │   └── chord-analyzer-ui.js  # UI del analizador de acordes
│   │
│   ├── Escalas:
│   │   ├── scale-bank.js         # Guardar escalas favoritas
│   │   ├── custom-scales.js      # Escalas definidas por el usuario
│   │   ├── scale-position-engine.js # Posiciones: 3NPS, pentatónica, blues, simétrica, bebop
│   │   ├── custom-scale-builder.js  # Constructor de posiciones custom
│   │   └── scales-ui.js           # UI de escalas
│   │
│   ├── Canciones:
│   │   ├── songbook.js      # CRUD de canciones en localStorage
│   │   ├── song-editor.js   # Editor en vivo con parseo de acordes y pin de voicings
│   │   └── song-view.js     # Vista de canción con karaoke, voicing picker, animación arpegio
│   │
│   ├── Visualización y Audio:
│   │   ├── fretboard-svg.js      # Diagramas SVG de acordes (130×90px)
│   │   ├── full-fretboard-svg.js # Mástil completo SVG
│   │   └── audio-engine.js       # Web Audio API, carga de samples Soundfont
│   │
│   ├── UI y Utilidades:
│   │   ├── ui.js             # Controlador principal: navegación, tabs, event listeners
│   │   ├── practice-mode.js  # Práctica de escalas con metrónomo (el módulo más grande ~1,400 líneas)
│   │   └── backup.js         # Export/import de datos a JSON
│
├── public/                   # Assets (imágenes, SVG)
└── PLAN_*.md                 # Roadmaps de desarrollo
```

## Patrón de módulos

Cada archivo JS usa **IIFE** (Immediately Invoked Function Expression) y exporta al `window`:

```javascript
(function () {
  // Variables privadas
  const { imports } = window.OtroModulo;

  function privateFunc() { /* ... */ }

  // API pública
  window.NombreModulo = { publicFunc1, publicFunc2 };
})();
```

## Convenciones de código

| Elemento           | Convención                | Ejemplo                          |
|--------------------|---------------------------|----------------------------------|
| Constantes         | UPPER_SNAKE_CASE          | `NOTE_NAMES`, `CHORD_FORMULAS`   |
| Funciones          | camelCase                 | `findVoicings`, `parseChord`     |
| Elementos DOM      | prefijo `el`              | `elInput`, `elGrid`, `elBtnSearch` |
| Módulos (window)   | PascalCase                | `window.ChordParser`, `window.UI` |
| Comentarios header | Bloque `// ====` con desc | En cada archivo                  |

- **Idioma del código**: nombres de funciones y variables en **inglés**
- **Idioma de la UI**: textos visibles al usuario en **español**
- **Sin semicolons al final** en algunos módulos (inconsistente, pero seguir el estilo del archivo que se edite)

## Cómo funciona el cache / deploy (cliente)

1. Editar código
2. Actualizar `CACHE_NAME` en `service-worker.js`
3. Actualizar `?v=XX` en los `<script>` tags de `index.html`
4. Los usuarios obtienen la versión nueva en el siguiente refresh

## Despliegue en producción (servidor)

La app está colgada en **<https://guitarreando.magicbrain.online>** (Hetzner, server `zampedri`,
ver `c:\zampedri-server\CLAUDE.md` para la conexión SSH).

- **Cómo se sirve**: archivos estáticos por **nginx** (no pm2 ni systemd, no consume RAM).
- **Path en el server**: `/var/www/guitarreando` (= clon de este repo, branch `main`).
- **vhost**: `/etc/nginx/sites-available/guitarreando.magicbrain.online`
  (root → `/var/www/guitarreando`, `try_files ... /index.html`, `service-worker.js` con `Cache-Control: no-cache`).
- **TLS**: Let's Encrypt vía certbot, renovación automática (mismo patrón que `panel.magicbrain.online`).
- **DNS**: registro A `guitarreando` → `178.156.255.56` en Namecheap (magicbrain.online).

### Actualizar producción

Pushear cambios a `main` en GitHub (`piterbass/guitar_app`) y luego:

```bash
ssh zampedri "cd /var/www/guitarreando && git pull"
```

No hace falta recargar nginx (son archivos estáticos). Recordá bumpear `CACHE_NAME` y los `?v=XX`
para que el service worker entregue la versión nueva a los clientes.

## Orden de carga de scripts

El orden importa porque los módulos dependen unos de otros vía `window.*`.
Se cargan al final de `index.html` en este orden (dependencias primero, UI al final).

## Storage (localStorage keys)

- `songbook` — array de canciones
- `chord-bank-*` — voicings guardados por acorde
- `scale-bank` — escalas favoritas
- `custom-scales` — posiciones de escala del usuario
- `backup-*` — datos de backup

## Audio

- Samples: Soundfont FluidR3 nylon guitar (cargados desde CDN gleitz)
- Fallback: síntesis Karplus-Strong
- API: Web Audio API (`AudioContext`, `GainNode`, etc.)

## Reglas para contribuir código

- **No agregar frameworks ni dependencias npm** — todo vanilla JS
- **No crear archivos innecesarios** — preferir editar los existentes
- **Mantener el patrón IIFE** para nuevos módulos
- **Exportar al `window`** siguiendo PascalCase
- **Probar en móvil** — la app es mobile-first
- **Actualizar service-worker.js** si se agregan archivos nuevos al cache
- **No hay tests automatizados** — testing manual en browser
- **Mantener compatibilidad offline** — todo debe funcionar sin red después del primer load
