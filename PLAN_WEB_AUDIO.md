# Plan: Generación de Sonido con Web Audio API (Karplus-Strong)

## Contexto

La app de acordes de guitarra no tiene audio. Se quiere agregar síntesis de sonido de cuerda pulsada usando Karplus-Strong (sin samples) para: reproducir acordes completos, notas individuales al hacer clic en el diapasón, y escalas en secuencia con animación visual sincronizada.

Arquitectura: vanilla JS, sin framework, patrón IIFE con globals en `window.*`.

---

## Archivos

| Archivo | Acción |
|---------|--------|
| **`js/audio-engine.js`** | **NUEVO** — Motor de audio: Karplus-Strong, play chord, play note, play scale |
| `js/fretboard-svg.js` | Modificar — Click handlers en dots del diagrama y del scale overlay |
| `js/ui.js` | Modificar — Botón play en cards, botón play escala, inicialización de audio |
| `index.html` | Modificar — CSS para botones y animación highlight, script tag, controles de velocidad |
| `service-worker.js` | Modificar — Agregar audio-engine.js al ASSETS, bump cache v6 |

---

## 1. `js/audio-engine.js` — Motor de síntesis Karplus-Strong

### Estructura del módulo

```js
(function() {
  let ctx = null; // AudioContext lazy-init

  function getContext() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // --- Karplus-Strong ---
  // Genera un buffer de audio que simula cuerda pulsada
  function createPluckBuffer(frequency, duration) { ... }

  // --- API pública ---
  function playNote(midi, duration)           // nota individual
  function playChord(midiNotes, duration)     // acorde (todas las notas a la vez, con strum delay)
  function playScale(midiNotes, tempo, onNoteStart) // escala secuencial con callback por nota
  function stopAll()                          // detener reproducción en curso

  window.AudioEngine = { playNote, playChord, playScale, stopAll };
})();
```

### Karplus-Strong: detalle del algoritmo

1. Crear un buffer de ruido blanco del tamaño = sampleRate / frequency
2. Aplicar filtro lowpass promediando muestras adyacentes en loop circular
3. Iterar por `duration * sampleRate` muestras
4. El resultado suena a cuerda pulsada natural

```
bufferSize = Math.round(sampleRate / frequency)
buffer = new Float32Array(bufferSize) con valores random [-1, 1]

Para cada muestra de salida:
  output[i] = buffer[index]
  buffer[index] = dampingFactor * 0.5 * (buffer[index] + buffer[(index+1) % bufferSize])
  index = (index + 1) % bufferSize
```

Parámetros clave:
- `dampingFactor`: 0.996 (controla cuánto dura el sustain)
- `duration`: 1.5s para acordes, 0.5s para notas de escala
- Strum delay para acordes: ~30ms entre cuerdas (bajo a agudo)

### Conversión MIDI → frecuencia

```js
function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
```

MIDI note se obtiene de: `STANDARD_TUNING[stringIndex] + fret`

### playChord(midiNotes, duration)

- Filtra nulls (cuerdas muteadas)
- Reproduce cada nota con un pequeño delay (strum): nota[i] empieza a `i * 30ms`
- Cada nota usa su propio AudioBufferSourceNode

### playScale(midiNotes, tempo, onNoteStart)

- `tempo`: ms entre notas (default ~300ms)
- Programa cada nota con `setTimeout` o `AudioContext.currentTime` offsets
- Llama `onNoteStart(index)` cuando empieza cada nota (para la animación)
- Retorna objeto `{ stop() }` para poder cancelar la reproducción

### stopAll()

- Cierra todos los source nodes activos
- Cancela timeouts pendientes de playScale

---

## 2. `js/fretboard-svg.js` — Click para tocar notas

### En `createDiagram()`: click en dots del acorde

Donde se crean los `<circle>` de notas (fretted y open), agregar:

```js
circle.style.cursor = 'pointer';
circle.addEventListener('click', (e) => {
  e.stopPropagation();
  const midi = STANDARD_TUNING[s] + fret;
  if (window.AudioEngine) window.AudioEngine.playNote(midi);
});
```

Ubicaciones en `createDiagram`:
- Open string circles (~línea 138)
- Fretted note circles (~línea 151)

### En `addScaleOverlay()`: click en dots de escala

Donde se crean los `<circle>` de notas de escala (no-chord-position), agregar el mismo handler:

```js
circle.style.cursor = 'pointer';
circle.addEventListener('click', (e) => {
  e.stopPropagation();
  const midi = STANDARD_TUNING[s] + fret;
  if (window.AudioEngine) window.AudioEngine.playNote(midi);
});
```

Ubicación: dentro del loop de frets (~línea 314-320)

---

## 3. `js/ui.js` — Botones de reproducción

### Botón Play en cada voicing card

En `createVoicingCard()` (~línea 466), agregar botón play al div `.card-actions`:

```js
const playBtn = document.createElement('button');
playBtn.className = 'btn-card-action btn-play';
playBtn.title = 'Reproducir';
playBtn.innerHTML = '&#9654;';  // ▶
playBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const midiNotes = voicing.frets.map((f, i) =>
    f === -1 ? null : window.MusicTheory.STANDARD_TUNING[i] + f
  );
  window.AudioEngine.playChord(midiNotes);
});
actions.appendChild(playBtn);
```

### Botón Play Escala

En la sección `#scale-section`, agregar un botón para reproducir la escala seleccionada.

Al hacer clic:
1. Obtener las notas de la escala en orden (de la cuerda más grave a la más aguda, traste bajo a alto) dentro del rango visible del diapasón
2. Llamar `AudioEngine.playScale(midiNotes, tempo, onNoteStart)`
3. En `onNoteStart(index)`: agregar clase CSS `.note-highlight` al círculo SVG correspondiente, y removerla de la nota anterior

### Animación de highlight para escalas

Agregar/quitar clase `.note-highlight` en los `<circle>` del scale overlay:

```css
.scale-overlay circle.note-highlight {
  filter: brightness(1.8) drop-shadow(0 0 6px currentColor);
  transition: filter 0.1s;
}
```

Para poder referenciar los círculos durante la animación, cada círculo del overlay necesita un `data-index` o `data-midi` attribute.

### Control de velocidad (BPM)

Un slider o select simple junto al botón play de escala:

```html
<select id="scale-tempo">
  <option value="500">Lento</option>
  <option value="300" selected>Normal</option>
  <option value="150">Rápido</option>
</select>
```

---

## 4. `index.html` — CSS y estructura

### CSS para botón play

```css
.btn-play {
  color: #4ecdc4;
  font-size: 1.1rem;
}
.btn-play:hover {
  color: #ffe66d;
}
```

### CSS para highlight de nota durante reproducción de escala

```css
.note-playing {
  filter: brightness(1.8) drop-shadow(0 0 8px #ffe66d);
  transition: filter 0.15s ease;
}
```

### Script tag

Agregar antes de `ui.js`:
```html
<script src="js/audio-engine.js"></script>
```

### Controles de escala

En `#scale-section`, junto al checkbox de targets, agregar:
```html
<button id="play-scale-btn" class="btn-small" title="Reproducir escala">&#9654; Escala</button>
<select id="scale-tempo">
  <option value="500">Lento</option>
  <option value="300" selected>Normal</option>
  <option value="150">Rápido</option>
</select>
```

---

## 5. `service-worker.js`

- Agregar `'./js/audio-engine.js'` al array ASSETS
- Bump cache a `guitar-app-v6`

---

## Flujo de interacción

```
Usuario busca acorde → ve cards con botón ▶
  → Click ▶ → playChord() con strum → suena acorde

Usuario selecciona escala → overlay en diapasón
  → Click en dot individual → playNote() → suena nota
  → Click "▶ Escala" → playScale() con callback
    → Cada nota suena + círculo SVG se ilumina secuencialmente
    → Al terminar se limpia la animación

Usuario puede hacer clic en cualquier dot del diagrama
  → playNote() con el MIDI de esa posición
```

---

## Verificación

1. Buscar "Am" → click botón ▶ en un voicing → debe sonar el acorde con strum natural
2. Click en un dot individual del diagrama → debe sonar esa nota aislada
3. Seleccionar escala "A aeolian" → click "▶ Escala" → notas suenan en secuencia con highlight visual
4. Cambiar velocidad a "Lento" → repetir → debe ir más lento
5. Click "▶ Escala" durante reproducción → debe parar la anterior y empezar de nuevo
6. Verificar en móvil (touch events) que funciona el click en dots
7. Verificar que el AudioContext se resume correctamente (requiere user gesture en mobile)
8. Verificar offline (service worker cacheó audio-engine.js)
