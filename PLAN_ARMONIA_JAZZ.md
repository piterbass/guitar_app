# Plan: Evolucion a Sistema Interactivo de Armonia Jazz

## Contexto

La app actual genera voicings de acordes con scoring y permite visualizar escalas compatibles superpuestas en el diapason. El objetivo es evolucionar de un enfoque "compatible" a uno musicalmente contextual: funcion armonica, categorizacion de voicings y guia de improvisacion con target notes.

No se modifica la arquitectura base (PWA local-first, vanilla JS IIFE, sin backend).

## Orden de implementacion

1. **Modulo 2: Categorias de Voicings** - sin dependencias nuevas, modifica scoring
2. **Modulo 1: Escalas Compatible vs Contextual** - depende de scale-detector existente, archivo nuevo
3. **Modulo 3: Target Notes** - depende del modulo 1, modifica overlay
4. **Modulo 4: Integracion** - conecta todo en ui.js

---

## Modulo 2: Categorias de Voicings

### Archivos

| Archivo | Cambio |
|---------|--------|
| `js/voicing-finder.js` | Agregar `scoreByCategory()`, computar intervalos adyacentes, has3rd/has7th |
| `index.html` | Agregar `<select id="voicing-category">` con 7 opciones |
| `js/ui.js` | Cachear el select, re-lanzar `doSearch()` al cambiar |

### Detalle en `voicing-finder.js`

**Nuevos datos computados en `validateAndScore()`:**
- `adjacentIntervals`: MIDI diff entre notas contiguas tocadas (bottom->top)
- `has3rd`, `has7th`: detectar si la 3ra/7ma del acorde estan en el voicing

**Funcion `scoreByCategory(category, data)`** reemplaza el bloque de scoring inline. Cada categoria pondera diferente:

| Categoria | Criterios principales |
|-----------|----------------------|
| `common` | Scoring actual sin cambios |
| `shell` | Requiere 3ra+7ma. Penaliza >4 cuerdas. Premia voicing esparzo |
| `rootless` | Penaliza fuerte si tiene raiz (-30), peor si raiz es bajo (-50). Premia 3ra+7ma |
| `quartal` | Bonus por intervalos de 4ta justa (5 semitonos) entre voces adyacentes |
| `drop2` | Premia gap grande en bajo + voces cercanas arriba. Ideal 4 cuerdas |
| `cluster` | Bonus por intervalos chicos (1-3 semitonos). Premia tensiones |
| `spread` | Bonus por intervalos amplios (>=7 semitonos). Penaliza voces cercanas |

**Importante:** Las categorias NO filtran voicings, solo reordenan por score. El DFS genera los mismos candidatos.

### UI: Select de categorias

```html
<select id="voicing-category">
  <option value="common">Voicings: Comunes</option>
  <option value="shell">Shell voicings</option>
  <option value="rootless">Rootless</option>
  <option value="quartal">Cuartales</option>
  <option value="drop2">Drop 2</option>
  <option value="cluster">Clusters / Tensiones</option>
  <option value="spread">Abiertos (spread)</option>
</select>
```

---

## Modulo 1: Escalas Compatible vs Contextual

### Archivos

| Archivo | Cambio |
|---------|--------|
| **Nuevo**: `js/harmonic-context.js` | Mapa de funciones armonicas -> escalas recomendadas |
| `js/scale-detector.js` | Agregar `scoredCompatibleScales()` con scoring refinado |
| `index.html` | Toggle Compatible/Contextual, selector de funcion armonica, optgroups en scale-select |
| `js/ui.js` | Estado `scaleMode`, `harmonicFunction`. Modificar `populateScaleSelect()` |

### Nuevo archivo: `js/harmonic-context.js`

**`FUNCTION_SCALE_MAP`** - mapa principal:

```
funcion x familia de acorde -> { recommended: [...], alternatives: [...] }
```

Funciones: `tonica`, `subdominante`, `dominante`, `modal`, `secundario`

Familias de acorde: `maj7`, `m7`, `7`, `m7b5`, `dim7`, `mMaj7`, `6`, `m6`, `7alt`, `7sus4`

Ejemplos de mapeo:
- Dm7 como subdominante -> recomendar Dorica
- G7 como dominante -> recomendar Mixolidia, Alterada, Lidia Dominante
- Cmaj7 como tonica -> recomendar Jonica, Lidia

**`qualityFamily(quality)`** - mapea cualquier calidad de acorde a su familia

**`categorizeByFunction(compatibleScales, function, quality, rootPc)`** - toma las escalas compatibles y las clasifica en 3 grupos:
- **Recomendadas**: raiz coincide + escala en lista recommended
- **Alternativas**: raiz coincide + lista alternatives, o raiz distinta + recommended
- **Outside**: todo lo demas

### Refinamiento de Compatible mode

En `scale-detector.js`, agregar `scoredCompatibleScales()`:
- Score base por chord tones contenidos
- Bonus si raiz de escala = raiz del acorde (+20)
- Bonus por tensiones validas disponibles (9, 11, 13)
- Penalizacion por avoid notes (nota a semitono de chord tone)

### UI: Toggle y funcion armonica

```html
<div class="scale-mode-toggle">
  <button class="scale-mode-btn active" data-mode="compatible">Compatible</button>
  <button class="scale-mode-btn" data-mode="contextual">Contextual</button>
</div>
<select id="harmonic-function" style="display:none;">
  <option value="tonica">Tonica</option>
  <option value="subdominante">Subdominante</option>
  <option value="dominante">Dominante</option>
  <option value="modal">Modal</option>
  <option value="secundario">Secundario</option>
</select>
```

En modo contextual, el `#scale-select` usa `<optgroup>` con secciones: Recomendadas / Alternativas / Outside.

---

## Modulo 3: Target Notes

### Archivos

| Archivo | Cambio |
|---------|--------|
| `js/fretboard-svg.js` | `addScaleOverlay()` gana param `targetOpts`. Jerarquia visual |
| `js/ui.js` | Nueva funcion `computeTargetOpts()`. Checkbox para toggle |
| `index.html` | Checkbox `#show-targets`, CSS de colores nuevos |

### Jerarquia visual en el overlay

| Tipo de nota | Color | Opacidad | Radio |
|-------------|-------|----------|-------|
| Target notes (3ra, 7ma) | Dorado `#ffe66d` | 0.85 | 6px |
| Chord tones | Teal `#4ecdc4` | 0.80 | 5px |
| Tensiones (9,11,13) | Naranja `#ff9f43` | 0.65 | 5px |
| Notas de escala | Teal `#4ecdc4` | 0.45 | 5px |
| Avoid notes | Rojo `#ff6b6b` | 0.30 | 4px |

Para notas del voicing que son target: anillo dorado en vez de teal.

### `computeTargetOpts(chord, scalePCs)` en ui.js

- **targetPCs**: 3ra y 7ma del acorde (guide tones)
- **tensionPCs**: notas de la escala que son 9/11/13 y NO estan en el acorde
- **avoidPCs**: notas de la escala a semitono de un chord tone (y que no son chord tone ni tension)

---

## Modulo 4: Integracion

### Flujo completo en `doSearch()`

```
1. parseChord(input)
2. Leer categoria de voicing (#voicing-category)
3. findVoicings(chord, { posFilter, category })
4. Render voicing cards
5. scoredCompatibleScales() o findCompatibleScales()
6. Si contextual -> categorizeByFunction()
7. populateScaleSelect() (con optgroups si contextual)
8. applyScaleOverlay() (con targetOpts si checkbox activo)
```

### Estado nuevo en ui.js

```js
let currentChord = null;           // objeto completo de parseChord
let scaleMode = 'compatible';      // 'compatible' | 'contextual'
let harmonicFunction = 'tonica';
let showTargets = true;
```

### Script loading en index.html

```html
<script src="js/scale-detector.js"></script>
<script src="js/harmonic-context.js"></script>  <!-- NUEVO -->
<script src="js/chord-bank.js"></script>
```

### Service worker

Agregar `./js/harmonic-context.js` al array ASSETS e incrementar version de cache.

---

## Resumen de archivos

| Archivo | Accion | Modulo |
|---------|--------|--------|
| `js/voicing-finder.js` | Modificar | 2 |
| `js/scale-detector.js` | Modificar | 1 |
| `js/harmonic-context.js` | **Nuevo** | 1 |
| `js/fretboard-svg.js` | Modificar | 3 |
| `js/ui.js` | Modificar | 1, 2, 3, 4 |
| `index.html` | Modificar | 1, 2, 3 |
| `service-worker.js` | Modificar | 4 |

## Verificacion

1. Buscar "Dm7" -> cambiar categoria a "Shell" -> verificar que los top voicings tienen 3ra+7ma y pocas cuerdas
2. Cambiar a "Rootless" -> verificar que la raiz desaparece de los primeros resultados
3. Cambiar a "Quartal" -> verificar intervalos de 4ta entre voces
4. Toggle a modo "Contextual" -> seleccionar "Subdominante" -> verificar que D Dorica aparece como recomendada
5. Seleccionar "Dominante" con G7 -> verificar Mixolidia y Alterada como recomendadas
6. Activar target notes -> verificar que 3ra y 7ma aparecen en dorado, tensiones en naranja
7. Desactivar target notes -> verificar que vuelve al overlay teal uniforme
8. Probar en movil (PWA) que todos los controles funcionan correctamente

## Filosofia del sistema

La app no debe afirmar: "Esta es la escala correcta".
Debe sugerir: "Estas son las opciones segun el rol armonico".

El jazz no es determinista.
Si el software parece dogmatico, educa mal.
Si muestra opciones jerarquizadas, educa bien.
