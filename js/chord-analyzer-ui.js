// ============================================================
// chord-analyzer-ui.js  –  UI interactiva del Chord Analyzer
// ============================================================

(function () {
  const { NOTE_NAMES, STANDARD_TUNING, STRING_NAMES, fretToPC, pcToName } = window.MusicTheory;
  const { identifyChord } = window.ChordIdentifier;

  const NUM_STRINGS = 6;
  const FRETS_VISIBLE = 5;

  const CFG = {
    padTop: 40,
    padBottom: 20,
    padLeft: 35,
    padRight: 15,
    stringSpacing: 28,
    fretSpacing: 36,
    dotRadius: 10,
    headerY: 18,
    fontSize: 11,
  };

  const totalW = CFG.padLeft + (NUM_STRINGS - 1) * CFG.stringSpacing + CFG.padRight;
  const totalH = CFG.padTop + FRETS_VISIBLE * CFG.fretSpacing + CFG.padBottom;

  // Estado
  // stringStates[i]: -1 = muted, 0 = open, 1-22 = fret number
  let stringStates = [-1, -1, -1, -1, -1, -1];
  let startFret = 1;

  // DOM refs
  let elFretboard, elFretLabel, elResultPrimary, elResultAlts;

  function init() {
    elFretboard = document.getElementById('analyzer-fretboard');
    elFretLabel = document.getElementById('analyzer-fret-label');
    elResultPrimary = document.getElementById('analyzer-result-primary');
    elResultAlts = document.getElementById('analyzer-result-alternatives');

    if (!elFretboard) return;

    document.getElementById('analyzer-fret-down').addEventListener('click', () => {
      if (startFret > 1) { startFret--; updateFretLabel(); renderFretboard(); }
    });
    document.getElementById('analyzer-fret-up').addEventListener('click', () => {
      if (startFret + FRETS_VISIBLE <= 22) { startFret++; updateFretLabel(); renderFretboard(); }
    });
    document.getElementById('analyzer-clear').addEventListener('click', () => {
      stringStates = [-1, -1, -1, -1, -1, -1];
      startFret = 1;
      updateFretLabel();
      renderFretboard();
      renderResults([]);
    });
    document.getElementById('analyzer-play').addEventListener('click', playCurrentChord);

    updateFretLabel();
    renderFretboard();
    renderResults([]);
  }

  function updateFretLabel() {
    if (elFretLabel) {
      elFretLabel.textContent = 'Trastes ' + startFret + '-' + (startFret + FRETS_VISIBLE - 1);
    }
  }

  // ── SVG helpers ──

  function svgEl(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }

  // ── Render fretboard ──

  function renderFretboard() {
    elFretboard.innerHTML = '';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + totalW + ' ' + totalH);
    svg.setAttribute('width', '100%');
    svg.style.maxWidth = totalW + 'px';
    svg.style.touchAction = 'manipulation';

    // Fondo
    svg.appendChild(svgEl('rect', {
      x: 0, y: 0, width: totalW, height: totalH,
      fill: '#1e1e30', rx: 6,
    }));

    // Cejuela o indicador de traste
    if (startFret === 1) {
      svg.appendChild(svgEl('rect', {
        x: CFG.padLeft - 3, y: CFG.padTop - 3,
        width: (NUM_STRINGS - 1) * CFG.stringSpacing + 6, height: 5,
        fill: '#ccc', rx: 1,
      }));
    } else {
      const fl = svgEl('text', {
        x: CFG.padLeft - 14, y: CFG.padTop + CFG.fretSpacing / 2 + 4,
        'text-anchor': 'middle', 'font-size': 10, fill: '#888',
      });
      fl.textContent = startFret + 'fr';
      svg.appendChild(fl);
    }

    // Trastes (líneas horizontales)
    for (let f = 0; f <= FRETS_VISIBLE; f++) {
      const y = CFG.padTop + f * CFG.fretSpacing;
      svg.appendChild(svgEl('line', {
        x1: CFG.padLeft, y1: y,
        x2: CFG.padLeft + (NUM_STRINGS - 1) * CFG.stringSpacing, y2: y,
        stroke: '#555', 'stroke-width': f === 0 ? 2 : 1,
      }));
    }

    // Cuerdas (líneas verticales)
    for (let s = 0; s < NUM_STRINGS; s++) {
      const x = CFG.padLeft + s * CFG.stringSpacing;
      const sw = 1.2 + (NUM_STRINGS - 1 - s) * 0.25;
      svg.appendChild(svgEl('line', {
        x1: x, y1: CFG.padTop,
        x2: x, y2: CFG.padTop + FRETS_VISIBLE * CFG.fretSpacing,
        stroke: '#888', 'stroke-width': sw,
      }));
    }

    // Dots de referencia en trastes 3,5,7,9,12,15,17,19,21
    const dotFrets = [3, 5, 7, 9, 15, 17, 19, 21];
    const doubleDotFrets = [12];
    for (let f = startFret; f < startFret + FRETS_VISIBLE; f++) {
      if (dotFrets.includes(f)) {
        const cy = CFG.padTop + (f - startFret + 0.5) * CFG.fretSpacing;
        const cx = CFG.padLeft + 2.5 * CFG.stringSpacing;
        svg.appendChild(svgEl('circle', {
          cx, cy, r: 3, fill: '#444', 'pointer-events': 'none',
        }));
      }
      if (doubleDotFrets.includes(f)) {
        const cy = CFG.padTop + (f - startFret + 0.5) * CFG.fretSpacing;
        svg.appendChild(svgEl('circle', {
          cx: CFG.padLeft + 1.5 * CFG.stringSpacing, cy, r: 3,
          fill: '#444', 'pointer-events': 'none',
        }));
        svg.appendChild(svgEl('circle', {
          cx: CFG.padLeft + 3.5 * CFG.stringSpacing, cy, r: 3,
          fill: '#444', 'pointer-events': 'none',
        }));
      }
    }

    // Cabeceras de cuerdas (X / O / nombre) — clickeables
    for (let s = 0; s < NUM_STRINGS; s++) {
      const x = CFG.padLeft + s * CFG.stringSpacing;
      const state = stringStates[s];

      // Hit area para toggle X/O
      const hitHeader = svgEl('circle', {
        cx: x, cy: CFG.headerY, r: 12,
        fill: 'transparent', stroke: 'none', cursor: 'pointer',
      });
      hitHeader.dataset.string = s;
      hitHeader.addEventListener('click', onHeaderClick);
      svg.appendChild(hitHeader);

      if (state === -1) {
        // Muted X
        const xText = svgEl('text', {
          x, y: CFG.headerY + 5,
          'text-anchor': 'middle', 'font-size': 14, 'font-weight': 'bold',
          fill: '#e94560', 'pointer-events': 'none',
        });
        xText.textContent = '\u00D7';
        svg.appendChild(xText);
      } else if (state === 0) {
        // Open O
        svg.appendChild(svgEl('circle', {
          cx: x, cy: CFG.headerY,
          r: 7, fill: 'none', stroke: '#4ecdc4', 'stroke-width': 2,
          'pointer-events': 'none',
        }));
      } else {
        // Fretted — show note name
        const noteName = pcToName(fretToPC(s, state));
        const nt = svgEl('text', {
          x, y: CFG.headerY + 4,
          'text-anchor': 'middle', 'font-size': 9, 'font-weight': 'bold',
          fill: '#4ecdc4', 'pointer-events': 'none',
        });
        nt.textContent = noteName;
        svg.appendChild(nt);
      }
    }

    // Hit areas para cada intersección cuerda/traste
    for (let s = 0; s < NUM_STRINGS; s++) {
      const x = CFG.padLeft + s * CFG.stringSpacing;
      for (let f = 0; f < FRETS_VISIBLE; f++) {
        const fret = startFret + f;
        const y = CFG.padTop + (f + 0.5) * CFG.fretSpacing;

        const hit = svgEl('circle', {
          cx: x, cy: y, r: 14,
          fill: 'transparent', stroke: 'none', cursor: 'pointer',
        });
        hit.dataset.string = s;
        hit.dataset.fret = fret;
        hit.addEventListener('click', onFretClick);
        svg.appendChild(hit);
      }
    }

    // Dots para posiciones seleccionadas
    for (let s = 0; s < NUM_STRINGS; s++) {
      const fret = stringStates[s];
      if (fret <= 0) continue; // skip muted y open (open se muestra en header)

      // ¿Está visible en el rango actual?
      if (fret < startFret || fret >= startFret + FRETS_VISIBLE) continue;

      const x = CFG.padLeft + s * CFG.stringSpacing;
      const y = CFG.padTop + (fret - startFret + 0.5) * CFG.fretSpacing;

      // Dot
      svg.appendChild(svgEl('circle', {
        cx: x, cy: y, r: CFG.dotRadius,
        fill: '#e94560', 'pointer-events': 'none',
      }));

      // Nota dentro del dot
      const noteName = pcToName(fretToPC(s, fret));
      const nt = svgEl('text', {
        x, y: y + 4,
        'text-anchor': 'middle', 'font-size': 9, 'font-weight': 'bold',
        fill: '#fff', 'pointer-events': 'none',
      });
      nt.textContent = noteName;
      svg.appendChild(nt);
    }

    // Nota al aire para open strings — dot debajo de la cejuela
    for (let s = 0; s < NUM_STRINGS; s++) {
      if (stringStates[s] !== 0) continue;
      const x = CFG.padLeft + s * CFG.stringSpacing;
      // Ya se muestra el O en el header
    }

    // Nombres de cuerdas abajo
    for (let s = 0; s < NUM_STRINGS; s++) {
      const x = CFG.padLeft + s * CFG.stringSpacing;
      const lb = svgEl('text', {
        x, y: totalH - 4,
        'text-anchor': 'middle', 'font-size': 8, fill: '#666',
        'pointer-events': 'none',
      });
      lb.textContent = STRING_NAMES[s];
      svg.appendChild(lb);
    }

    elFretboard.appendChild(svg);

    // Trigger identification
    doIdentify();
  }

  // ── Events ──

  function onHeaderClick(e) {
    const s = parseInt(e.target.dataset.string);
    // Cycle: muted → open → muted
    if (stringStates[s] === -1) {
      stringStates[s] = 0; // open
    } else {
      stringStates[s] = -1; // muted
    }
    renderFretboard();
    playNoteForString(s);
  }

  function onFretClick(e) {
    const s = parseInt(e.target.dataset.string);
    const fret = parseInt(e.target.dataset.fret);

    if (stringStates[s] === fret) {
      // Si ya está en este traste, quitar (mutear)
      stringStates[s] = -1;
    } else {
      stringStates[s] = fret;
    }
    renderFretboard();
    playNoteForString(s);
  }

  function playNoteForString(s) {
    if (!window.AudioEngine) return;
    const fret = stringStates[s];
    if (fret === -1) return;
    const midi = STANDARD_TUNING[s] + fret;
    window.AudioEngine.playNote(midi, 1.5);
  }

  function playCurrentChord() {
    if (!window.AudioEngine) return;
    const midiNotes = stringStates.map((fret, s) => {
      if (fret === -1) return null;
      return STANDARD_TUNING[s] + fret;
    });
    window.AudioEngine.playChord(midiNotes);
  }

  // ── Identification ──

  function doIdentify() {
    const pcs = [];
    let bassPC = null;

    for (let s = 0; s < NUM_STRINGS; s++) {
      const fret = stringStates[s];
      if (fret === -1) continue;
      const pc = fretToPC(s, fret);
      pcs.push(pc);
      if (bassPC === null) bassPC = pc; // primera cuerda no muteada = bajo
    }

    if (pcs.length < 2) {
      if (pcs.length === 1) {
        renderSingleNote(pcs[0]);
      } else {
        renderResults([]);
      }
      return;
    }

    const results = identifyChord(pcs, bassPC);
    renderResults(results);
  }

  // ── Render results ──

  function renderSingleNote(pc) {
    elResultPrimary.innerHTML =
      '<div class="analyzer-card analyzer-primary">' +
        '<div class="analyzer-chord-name">' + pcToName(pc) + '</div>' +
        '<div class="analyzer-detail">Nota individual</div>' +
      '</div>';
    elResultAlts.innerHTML = '';
  }

  function renderResults(results) {
    if (!results || results.length === 0) {
      elResultPrimary.innerHTML =
        '<div class="analyzer-card analyzer-empty">' +
          '<div class="analyzer-hint">Tocá en el mástil para colocar notas</div>' +
        '</div>';
      elResultAlts.innerHTML = '';
      return;
    }

    // Primary result
    const r = results[0];
    const notesStr = getActiveNotes().join('  ');
    const intervalsStr = r.intervals.join('  ');
    const labelsStr = r.intervalLabels.join(' · ');

    elResultPrimary.innerHTML =
      '<div class="analyzer-card analyzer-primary">' +
        '<div class="analyzer-chord-name">' + r.displayName + '</div>' +
        '<div class="analyzer-quality">' + r.qualityDisplay + '</div>' +
        '<div class="analyzer-detail"><span class="label">Notas:</span> ' + notesStr + '</div>' +
        '<div class="analyzer-detail"><span class="label">Intervalos:</span> ' + intervalsStr + '</div>' +
        '<div class="analyzer-detail analyzer-labels">' + labelsStr + '</div>' +
      '</div>';

    // Alternatives
    if (results.length > 1) {
      let html = '<div class="analyzer-alts-title">También puede ser:</div><div class="analyzer-alts-grid">';
      for (let i = 1; i < Math.min(results.length, 8); i++) {
        const alt = results[i];
        html +=
          '<div class="analyzer-card analyzer-alt">' +
            '<div class="analyzer-alt-name">' + alt.displayName + '</div>' +
            '<div class="analyzer-alt-quality">' + alt.qualityDisplay + '</div>' +
          '</div>';
      }
      html += '</div>';
      elResultAlts.innerHTML = html;
    } else {
      elResultAlts.innerHTML = '';
    }
  }

  function getActiveNotes() {
    const notes = [];
    for (let s = 0; s < NUM_STRINGS; s++) {
      if (stringStates[s] === -1) continue;
      notes.push(pcToName(fretToPC(s, stringStates[s])));
    }
    return notes;
  }

  window.ChordAnalyzerUI = { init };
})();
