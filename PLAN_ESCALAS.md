# Plan: Nueva Sección "Escalas" con Posiciones en el Diapasón

## Contexto

La app Guitar App es una SPA vanilla JS (sin frameworks) con módulos IIFE, tema oscuro, PWA offline. Actualmente tiene secciones de Acordes (con "Mis Acordes") y Canciones. Se necesita una nueva sección "Escalas" para visualizar y practicar escalas en el diapasón completo con navegación por posiciones, audio integrado, y un banco de escalas favoritas ("Mis Escalas").

---

## Archivos a Crear (4 nuevos)

| # | Archivo | Descripción |
|---|---------|-------------|
| 1 | `js/scale-position-engine.js` | Motor de cálculo de posiciones (3NPS, pentatónicas, simétricas) |
| 2 | `js/full-fretboard-svg.js` | Renderizador SVG del diapasón completo (horizontal, 0-15 trastes) |
| 3 | `js/scale-bank.js` | Banco de escalas favoritas en localStorage (patrón idéntico a chord-bank.js) |
| 4 | `js/scales-ui.js` | Controlador UI de la sección Escalas |

## Archivos a Modificar (3 existentes)

| # | Archivo | Cambios |
|---|---------|---------|
| 1 | `index.html` | Agregar: botón nav "Escalas", sección HTML, CSS, script tags |
| 2 | `js/ui.js` | Extender `showSection()` para 'scales', agregar click handler nav-scales |
| 3 | `service-worker.js` | Agregar los 4 nuevos JS al array ASSETS, bump cache version |

---

## Fases de Implementación

### Fase 1: Motor de Posiciones (`js/scale-position-engine.js`)

**Clasificación de familias de escalas:**
- `diatonic` (major, modos, harmonic-minor modos, harmonic-major, double-harmonic) → **3NPS, 7 posiciones**
- `melodic-minor` (melodic-minor y sus 6 modos) → **3NPS, 7 posiciones**
- `pentatonic` (pentatonic-major/minor, in-sen, hirajoshi) → **boxes, 5 posiciones**
- `blues` (blues, blues-major) → **boxes, 5 posiciones**
- `symmetric` (whole-tone, diminished, half-whole-dim, augmented) → **patrones trasladables, 2-4 posiciones**
- `bebop` (8 notas) → **diapasón completo sin posiciones forzadas**

**Algoritmo 3NPS (Three Notes Per String):**
- Para cada uno de los 7 grados de inicio (startDegree 0-6):
  - Cuerda 0 (6ª E): grados [d, d+1, d+2]
  - Cuerda 1 (5ª A): grados [d+3, d+4, d+5]
  - Cuerda 2-5: continuar secuencia de 3 grados por cuerda
  - Para cada grado calcular: `targetPc = (rootPc + semitones[degree]) % 12`
  - Encontrar traste en la cuerda que produce ese PC dentro del rango de la posición
  - Mantener la posición compacta (4-6 trastes de rango)

**Estructura de datos de posición:**
```javascript
{
  index: 0,                    // índice 0-based
  label: 'Pos 1 (Raíz)',      // etiqueta para UI
  fretRange: [2, 6],           // rango de trastes
  noteData: [
    { string: 0, fret: 2, midi: 42, pc: 6, interval: '1', isRoot: true, isTriad: true }
    // ... una entrada por cada nota en la posición
  ]
}
```

**API pública:** `window.ScalePositionEngine`
- `classifyScale(scaleKey)` → `{ family, positionSystem, positionCount }`
- `generatePositions(rootPc, scaleKey)` → `positions[]`

---

### Fase 2: Renderizador Diapasón Completo (`js/full-fretboard-svg.js`)

**Layout:** Horizontal (cuerdas de arriba a abajo, trastes de izquierda a derecha)
- 6 cuerdas (6ª string arriba = graves, 1ª abajo = agudos)
- 15 trastes + cejuela (nut)
- Inlays en trastes 3, 5, 7, 9, 12 (doble), 15
- Nombres de cuerda a la izquierda (E, A, D, G, B, e)
- Números de traste debajo

**Colores de notas (consistentes con overlay existente):**
| Color | Código | Significado |
|-------|--------|-------------|
| Rojo acento | `#e94560` | Root (fundamental) |
| Teal | `#4ecdc4` | Tríada (3ª, 5ª) |
| Gris claro | `#7a8a9a` | Otras notas de la posición |
| Teal muy tenue | `rgba(78, 205, 196, 0.15)` | Notas fuera de posición (dimmed) |
| Gold | `#ffe66d` | Nota sonando (playback highlight) |

**Ventana de posición:** Rectángulo semi-transparente detrás del rango de trastes activo

**Interacción:** Click/tap en cualquier nota → `AudioEngine.playNote(midi)`

**API pública:** `window.FullFretboardSVG`
- `createFullFretboard(opts)` → SVGElement
- `highlightNoteMidi(midi)` — resalta nota durante playback
- `clearHighlights()` — limpia highlights

---

### Fase 3: Banco de Escalas Favoritas (`js/scale-bank.js`)

**Patrón idéntico a `chord-bank.js`:**
- localStorage key: `'guitar-scale-bank'`
- Cada escala guardada: `{ rootPc, scaleKey, label, timestamp }`
- Label auto-generado: `pcToName(rootPc) + ' ' + SCALE_LABELS[scaleKey]`

**API pública:** `window.ScaleBank`
- `getAll()` → array de escalas guardadas
- `save(rootPc, scaleKey)` → boolean (false si ya existe)
- `remove(index)` → void
- `count()` → number
- `exportJSON()` / `importJSON(jsonStr)`

---

### Fase 4: Sección HTML + CSS + Navegación

**Nav button (index.html línea 1384):**
```html
<button class="nav-btn" id="nav-scales">Escalas</button>
```

**Estructura HTML de la sección:**
```
section#section-scales
  ├── Tabs: "Explorar" | "Mis Escalas" (como en acordes)
  ├── Tab Explorar:
  │   ├── Selectores: Raíz + Tipo de escala (agrupado por familia con <optgroup>)
  │   ├── Info bar: "A Mayor (Jónica) — Notas: A B C# D E F# G#"
  │   ├── Navegador posiciones: ◀ [dots] Pos 1/7 (trastes 2-6) ▶
  │   ├── Toggles: ☑ Mástil completo | ☐ Intervalos | Dirección [▼]
  │   ├── Audio: [▶ Posición] [▶ Escala completa] [Tempo ▼]
  │   ├── [★ Guardar] botón para agregar a "Mis Escalas"
  │   └── Contenedor diapasón SVG (scrollable horizontal en móvil)
  └── Tab Mis Escalas:
      ├── Lista de escalas guardadas (cards clickeables)
      ├── Click en card → carga esa escala en el explorador
      └── Botón eliminar por card + Export/Import JSON
```

**CSS:** Sigue el tema oscuro existente
- `#1a1a2e` fondo body
- `#16213e` fondo paneles
- `#e94560` acento principal
- `#4ecdc4` teal secundario
- `#ffe66d` gold highlights

**Modificación a `ui.js` (líneas 36-48 y 162-166):**
- `showSection()`: agregar caso `'scales'` → activar `nav-scales`
- `init()`: agregar `document.getElementById('nav-scales').addEventListener('click', ...)`

---

### Fase 5: Controlador UI Escalas (`js/scales-ui.js`)

**Estado interno:**
```javascript
let state = {
  rootPc: 0,              // nota raíz seleccionada
  scaleKey: 'major',      // tipo de escala
  scalePCs: [],            // pitch classes calculados
  positions: [],           // posiciones generadas
  currentPosition: 0,      // posición actual
  showFullScale: true,     // toggle mástil completo vs solo posición
  showIntervals: false,    // toggle nombres vs intervalos
  tempo: 300,              // ms entre notas
  playback: null,          // control de reproducción actual
  direction: 'ascending',  // 'ascending' | 'descending' | 'both'
  currentTab: 'explore'    // 'explore' | 'bank'
};
```

**Flujo principal:**
1. Usuario selecciona raíz + escala → `onScaleChanged()`
2. Calcula PCs con `MusicTheory.getScalePCs(rootPc, scaleKey)`
3. Genera posiciones con `ScalePositionEngine.generatePositions(rootPc, scaleKey)`
4. Renderiza diapasón con `FullFretboardSVG.createFullFretboard(opts)`
5. Actualiza info bar, dots de posición, label

**Agrupación del selector de escalas (con `<optgroup>`):**
- Modos diatónicos: major, dorian, phrygian, lydian, mixolydian, aeolian, locrian
- Escalas menores: aeolian, harmonic-minor, melodic-minor
- Modos de la menor melódica: melodic-minor, dorian-b2, lydian-augmented, lydian-dominant, mixolydian-b6, locrian-nat2, altered
- Modos de la menor armónica: harmonic-minor, locrian-nat6, ionian-sharp5, dorian-sharp4, phrygian-dominant, lydian-sharp2
- Pentatónicas y Blues: pentatonic-major, pentatonic-minor, blues, blues-major
- Simétricas: whole-tone, diminished, half-whole-dim, augmented
- Bebop: bebop-dominant, bebop-major, bebop-dorian, bebop-melodic-minor
- Exóticas: double-harmonic, harmonic-major, in-sen, hirajoshi

**Navegación de posiciones:**
- Botones ◀ ▶ (cycling)
- Click en dots de posición
- Teclas ← → (keyboard)
- Indicador: "3NPS – Pos 3/7 (trastes 5-9)" o "Patrón Simétrico 2" o "Box 3/5"

**Integración Audio (reutiliza AudioEngine existente):**
- **Play Posición**: construye array MIDI desde `position.noteData` (grave→agudo), llama `AudioEngine.playScale(midiNotes, interval, onNoteStart)`
- **Play Escala completa**: todas las notas de la escala en el diapasón
- **Sync visual**: callback `onNoteStart(idx)` → `FullFretboardSVG.highlightNoteMidi(midiNotes[idx])`
- **Direcciones**: ascendente / descendente / ambos (asc + desc sin repetir nota top)
- **Tempo**: Lento (500ms) / Normal (300ms) / Rápido (150ms)

**Tab "Mis Escalas":**
- `renderBankView()`: muestra cards con nombre de escala + botón eliminar
- Click en card → `state.rootPc = ..., state.scaleKey = ...` → cambia a tab Explorar
- Botón ★ Guardar: `ScaleBank.save(state.rootPc, state.scaleKey)`
- Export/Import JSON (misma UI que en acordes)

---

### Fase 6: PWA Update (`service-worker.js`)

- Bump `CACHE_NAME` de `'guitar-app-v26'` a `'guitar-app-v27'`
- Agregar al array ASSETS:
  - `'./js/scale-position-engine.js'`
  - `'./js/full-fretboard-svg.js'`
  - `'./js/scale-bank.js'`
  - `'./js/scales-ui.js'`

---

## Orden de Scripts en index.html

```html
<script src="js/music-theory.js"></script>
<script src="js/chord-parser.js"></script>
<script src="js/voicing-finder.js"></script>
<script src="js/fretboard-svg.js"></script>
<script src="js/scale-detector.js"></script>
<script src="js/harmonic-context.js"></script>
<script src="js/chord-bank.js"></script>
<script src="js/scale-bank.js"></script>          <!-- NUEVO -->
<script src="js/songbook.js"></script>
<script src="js/song-editor.js"></script>
<script src="js/song-view.js"></script>
<script src="js/audio-engine.js"></script>
<script src="js/scale-position-engine.js"></script> <!-- NUEVO -->
<script src="js/full-fretboard-svg.js"></script>    <!-- NUEVO -->
<script src="js/scales-ui.js"></script>             <!-- NUEVO -->
<script src="js/ui.js"></script>
```

---

## Recursos Existentes que se Reutilizan

| Recurso | Ubicación | Uso |
|---------|-----------|-----|
| `SCALE_FORMULAS` (42 escalas) | `music-theory.js:88-140` | Fórmulas interválicas de todas las escalas |
| `INTERVAL_SEMITONES` | `music-theory.js:17-27` | Conversión intervalo → semitonos |
| `STANDARD_TUNING` | `music-theory.js:169` | MIDI de cuerdas al aire [40,45,50,55,59,64] |
| `getScalePCs()` | `music-theory.js:145` | Calcula pitch classes de escala |
| `fretToPC()` | `music-theory.js:175` | PC en posición cuerda+traste |
| `pcToName()` | `music-theory.js:164` | Nombre de nota desde PC |
| `getModalCharacteristicPCs()` | `music-theory.js:246` | Notas características modales |
| `SCALE_LABELS` | `scale-detector.js:9-61` | Nombres en español de las 42 escalas |
| `AudioEngine.playScale()` | `audio-engine.js:231` | Reproducción secuencial con callback |
| `AudioEngine.playNote()` | `audio-engine.js:189` | Nota individual |
| `ChordBank` patrón | `chord-bank.js` | Modelo para `ScaleBank` |

---

## Verificación y Testing

1. Abrir la app → verificar botón "Escalas" en la nav
2. Seleccionar **A Mayor** → verificar 7 posiciones 3NPS, navegar con ◀▶
3. Seleccionar **A Pentatónica menor** → verificar 5 posiciones box
4. Seleccionar **C Tonos enteros** → verificar patrones simétricos (2-3 posiciones)
5. Click en notas del diapasón → verificar que suenan
6. **Play Posición** → verificar secuencia ascendente con highlight visual sincronizado
7. **Play Escala completa** → verificar todas las notas
8. Toggle **"Mástil completo"** → verificar que notas fuera de posición se atenúan/ocultan
9. Toggle **"Intervalos"** → verificar que muestra 1, 2, b3... en vez de C, D, Eb...
10. **Guardar escala** en "Mis Escalas" → verificar que aparece en el tab
11. Click en escala guardada → verificar que carga en el explorador
12. **Export/Import** de banco de escalas
13. Verificar **responsive** en móvil (scroll horizontal del diapasón)
14. Verificar **offline** (PWA service worker actualizado)

---

## Arquitectura Futura (Preparada pero No Implementada)

- **Sistema CAGED**: Agregar `'caged'` como positionSystem en el engine, implementar `generateCAGEDPositions()` con 5 shapes (C-A-G-E-D)
- **Selector de sistema posicional**: Toggle en UI para elegir entre 3NPS / CAGED
- **Integración con Target Notes en escalas**: Resaltar chord tones, tensiones, nota modal durante playback
- **Persistencia de última escala**: localStorage para recordar la última escala seleccionada
