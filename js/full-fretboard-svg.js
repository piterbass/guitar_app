// ============================================================
// full-fretboard-svg.js  –  Diapasón completo SVG (horizontal)
// Renderiza el mástil de guitarra completo (0-15 trastes)
// ============================================================

(function () {
  const { STANDARD_TUNING, STRING_NAMES, fretToPC, pcToName } = window.MusicTheory;

  const NUM_STRINGS = 6;
  const MAX_FRET = 15;

  // Dimensiones del diapasón
  const CFG = {
    padTop: 10,
    padBottom: 28,
    padLeft: 28,
    padRight: 14,
    stringSpacing: 26,
    fretSpacing: 52,
    dotRadius: 10,
    hitRadius: 14,
    fontSize: 9,
    nutWidth: 5,
  };

  // Trastes con inlay dots
  const INLAY_FRETS = [3, 5, 7, 9, 15];
  const DOUBLE_INLAY = [12];

  // Colores
  const COLORS = {
    root: '#e94560',
    triad: '#4ecdc4',
    scale: '#7a8a9a',
    dimmed: 'rgba(120, 140, 160, 0.18)',
    playing: '#ffe66d',
    positionWindow: 'rgba(78, 205, 196, 0.06)',
    positionBorder: 'rgba(78, 205, 196, 0.18)',
  };

  // Referencia al SVG actual para highlights
  let currentSvg = null;

  function svgEl(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, String(v));
    }
    return el;
  }

  /**
   * Crea el SVG del diapasón completo.
   * @param {object} opts
   * @param {number} opts.rootPc - pitch class de la raíz
   * @param {number[]} opts.scalePCs - pitch classes de la escala
   * @param {object[]} [opts.positionNotes] - noteData de la posición actual
   * @param {number[]} [opts.fretRange] - [min, max] de la posición actual
   * @param {boolean} [opts.showFullScale=true] - mostrar notas fuera de posición
   * @param {boolean} [opts.showIntervals=false] - mostrar intervalos en vez de nombres
   * @param {function} [opts.onNoteClick] - callback(midi, string, fret)
   * @returns {SVGElement}
   */
  function createFullFretboard(opts) {
    const {
      rootPc, scalePCs, positionNotes, fretRange,
      showFullScale = true, showIntervals = false,
      onNoteClick
    } = opts;

    const numFrets = MAX_FRET;
    const totalW = CFG.padLeft + (numFrets + 1) * CFG.fretSpacing + CFG.padRight;
    const totalH = CFG.padTop + (NUM_STRINGS - 1) * CFG.stringSpacing + CFG.padBottom;

    const svg = svgEl('svg', {
      viewBox: `0 0 ${totalW} ${totalH}`,
      width: totalW,
      height: totalH,
      class: 'full-fretboard',
    });
    svg.style.display = 'block';

    const scaleSet = new Set(scalePCs || []);

    // Set de notas en la posición actual para lookup rápido
    const positionSet = new Set();
    if (positionNotes) {
      positionNotes.forEach(n => positionSet.add(n.string + ',' + n.fret));
    }

    // ── Fondo ──
    svg.appendChild(svgEl('rect', {
      x: 0, y: 0, width: totalW, height: totalH,
      fill: '#0d1b36', rx: 6,
    }));

    // ── Ventana de posición (highlight del rango) ──
    if (fretRange && fretRange[0] != null) {
      const x1 = CFG.padLeft + fretRange[0] * CFG.fretSpacing - CFG.fretSpacing / 2;
      const x2 = CFG.padLeft + fretRange[1] * CFG.fretSpacing + CFG.fretSpacing / 2;
      svg.appendChild(svgEl('rect', {
        x: Math.max(x1, CFG.padLeft - 4),
        y: CFG.padTop - 10,
        width: Math.min(x2 - x1, totalW - CFG.padLeft),
        height: (NUM_STRINGS - 1) * CFG.stringSpacing + 20,
        fill: COLORS.positionWindow,
        stroke: COLORS.positionBorder,
        'stroke-width': 1,
        rx: 4,
      }));
    }

    // ── Cejuela (nut) ──
    const nutX = CFG.padLeft + CFG.fretSpacing / 2;
    svg.appendChild(svgEl('rect', {
      x: nutX - CFG.nutWidth / 2, y: CFG.padTop - 6,
      width: CFG.nutWidth,
      height: (NUM_STRINGS - 1) * CFG.stringSpacing + 12,
      fill: '#ccc', rx: 1,
    }));

    // ── Trastes (líneas verticales) ──
    for (let f = 1; f <= numFrets; f++) {
      const x = CFG.padLeft + (f + 0.5) * CFG.fretSpacing;
      svg.appendChild(svgEl('line', {
        x1: x, y1: CFG.padTop - 4,
        x2: x, y2: CFG.padTop + (NUM_STRINGS - 1) * CFG.stringSpacing + 4,
        stroke: '#444', 'stroke-width': 1,
      }));
    }

    // ── Cuerdas (líneas horizontales) ──
    for (let s = 0; s < NUM_STRINGS; s++) {
      const y = CFG.padTop + s * CFG.stringSpacing;
      const sw = 0.8 + (NUM_STRINGS - 1 - s) * 0.25; // graves más gruesas
      svg.appendChild(svgEl('line', {
        x1: CFG.padLeft,
        y1: y,
        x2: CFG.padLeft + (numFrets + 1) * CFG.fretSpacing,
        y2: y,
        stroke: '#666', 'stroke-width': sw,
      }));

      // Nombre de cuerda
      const nameText = svgEl('text', {
        x: CFG.padLeft - 14,
        y: y + 4,
        'text-anchor': 'middle', 'font-size': 10,
        fill: '#888', 'font-weight': 'bold',
      });
      nameText.textContent = STRING_NAMES[s];
      svg.appendChild(nameText);
    }

    // ── Inlays (dots de posición) ──
    const inlayY = CFG.padTop + (NUM_STRINGS - 1) * CFG.stringSpacing + 16;
    for (const f of INLAY_FRETS) {
      if (f > numFrets) continue;
      const x = CFG.padLeft + f * CFG.fretSpacing;
      svg.appendChild(svgEl('circle', {
        cx: x, cy: inlayY,
        r: 3, fill: '#333',
      }));
    }
    for (const f of DOUBLE_INLAY) {
      if (f > numFrets) continue;
      const x = CFG.padLeft + f * CFG.fretSpacing;
      svg.appendChild(svgEl('circle', { cx: x - 6, cy: inlayY, r: 3, fill: '#333' }));
      svg.appendChild(svgEl('circle', { cx: x + 6, cy: inlayY, r: 3, fill: '#333' }));
    }

    // ── Números de traste ──
    for (let f = 0; f <= numFrets; f++) {
      const x = CFG.padLeft + f * CFG.fretSpacing;
      const numText = svgEl('text', {
        x: x, y: inlayY + (INLAY_FRETS.includes(f) || DOUBLE_INLAY.includes(f) ? 14 : 6),
        'text-anchor': 'middle', 'font-size': 9, fill: '#555',
      });
      numText.textContent = f;
      svg.appendChild(numText);
    }

    // ── Grupo de notas (para poder limpiar highlights) ──
    const notesGroup = svgEl('g', { class: 'fb-notes-group' });

    // ── Notas de la escala ──
    for (let s = 0; s < NUM_STRINGS; s++) {
      for (let f = 0; f <= numFrets; f++) {
        const pc = fretToPC(s, f);
        if (!scaleSet.has(pc)) continue;

        const isInPosition = positionSet.has(s + ',' + f);
        const isRoot = pc === rootPc;

        // Si solo mostrar posición y esta nota no está en posición, skip o dim
        if (!showFullScale && !isInPosition) continue;

        const x = CFG.padLeft + f * CFG.fretSpacing;
        const y = CFG.padTop + s * CFG.stringSpacing;
        const midi = STANDARD_TUNING[s] + f;

        // Determinar estilo
        let fill, opacity, radius;
        if (!isInPosition && showFullScale) {
          // Nota fuera de posición (dimmed)
          fill = COLORS.dimmed;
          opacity = 1;
          radius = CFG.dotRadius - 2;
        } else if (isRoot) {
          fill = COLORS.root;
          opacity = 1;
          radius = CFG.dotRadius;
        } else {
          // Buscar si es tríada
          const noteInfo = positionNotes
            ? positionNotes.find(n => n.string === s && n.fret === f)
            : null;
          const isTriad = noteInfo ? noteInfo.isTriad : false;
          fill = isTriad ? COLORS.triad : COLORS.scale;
          opacity = 1;
          radius = CFG.dotRadius - (isTriad ? 0 : 1);
        }

        // Hit area (invisible, grande)
        const hitArea = svgEl('circle', {
          cx: x, cy: y, r: CFG.hitRadius,
          fill: 'transparent', stroke: 'none',
          'data-midi': midi, 'data-string': s, 'data-fret': f,
        });
        hitArea.style.cursor = 'pointer';
        hitArea.addEventListener('click', function (e) {
          e.stopPropagation();
          if (window.AudioEngine) window.AudioEngine.playNote(midi);
          if (onNoteClick) onNoteClick(midi, s, f);
        });
        notesGroup.appendChild(hitArea);

        // Dot visible
        const dot = svgEl('circle', {
          cx: x, cy: y, r: radius,
          fill: fill, opacity: opacity,
          'data-midi': midi,
          'pointer-events': 'none',
          class: 'fb-note',
        });
        notesGroup.appendChild(dot);

        // Borde extra para root
        if (isRoot && isInPosition) {
          dot.setAttribute('stroke', '#fff');
          dot.setAttribute('stroke-width', '2');
        }

        // Etiqueta de texto
        if (isInPosition || (isRoot && showFullScale)) {
          let labelText;
          if (showIntervals) {
            const noteInfo = positionNotes
              ? positionNotes.find(n => n.string === s && n.fret === f)
              : null;
            labelText = noteInfo ? noteInfo.interval : pcToName(pc);
          } else {
            labelText = pcToName(pc);
          }

          const text = svgEl('text', {
            x: x, y: y + 3.5,
            'text-anchor': 'middle',
            'font-size': CFG.fontSize,
            'font-weight': 'bold',
            fill: isRoot ? '#fff' : (fill === COLORS.dimmed ? '#666' : '#fff'),
            'pointer-events': 'none',
          });
          text.textContent = labelText;
          notesGroup.appendChild(text);
        }
      }
    }

    svg.appendChild(notesGroup);
    currentSvg = svg;
    return svg;
  }

  /**
   * Resalta una nota por MIDI value (para playback sync).
   */
  function highlightNoteMidi(midi) {
    if (!currentSvg) return;
    const dots = currentSvg.querySelectorAll('.fb-note[data-midi="' + midi + '"]');
    dots.forEach(dot => {
      dot.setAttribute('data-orig-fill', dot.getAttribute('fill'));
      dot.setAttribute('data-orig-r', dot.getAttribute('r'));
      dot.setAttribute('fill', COLORS.playing);
      dot.setAttribute('r', String(CFG.dotRadius + 3));
      dot.setAttribute('stroke', '#fff');
      dot.setAttribute('stroke-width', '2.5');
    });
  }

  /**
   * Limpia todos los highlights de playback.
   */
  function clearHighlights() {
    if (!currentSvg) return;
    const highlighted = currentSvg.querySelectorAll('.fb-note[data-orig-fill]');
    highlighted.forEach(dot => {
      dot.setAttribute('fill', dot.getAttribute('data-orig-fill'));
      dot.setAttribute('r', dot.getAttribute('data-orig-r'));
      dot.removeAttribute('data-orig-fill');
      dot.removeAttribute('data-orig-r');
      // Restaurar borde
      const midi = parseInt(dot.getAttribute('data-midi'));
      const isRoot = dot.getAttribute('fill') === COLORS.root;
      if (!isRoot) {
        dot.removeAttribute('stroke');
        dot.removeAttribute('stroke-width');
      } else {
        dot.setAttribute('stroke', '#fff');
        dot.setAttribute('stroke-width', '2');
      }
    });
  }

  window.FullFretboardSVG = { createFullFretboard, highlightNoteMidi, clearHighlights };
})();
