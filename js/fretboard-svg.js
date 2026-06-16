// ============================================================
// fretboard-svg.js  –  Renderizado SVG de diagramas de acordes
// ============================================================

(function () {
  const NUM_STRINGS = 6;
  const FRETS_SHOWN = 5;

  // Dimensiones del diagrama
  const CFG = {
    padTop: 45,
    padBottom: 30,
    padLeft: 35,
    padRight: 15,
    stringSpacing: 20,
    fretSpacing: 28,
    dotRadius: 7,
    hitRadius: 14, // área táctil invisible, más grande para móvil
    fontSize: 11,
  };

  const totalW = CFG.padLeft + (NUM_STRINGS - 1) * CFG.stringSpacing + CFG.padRight;
  const totalH = CFG.padTop + FRETS_SHOWN * CFG.fretSpacing + CFG.padBottom;

  /**
   * Crea un elemento SVG para un voicing.
   * @param {object} voicing – resultado de VoicingFinder
   * @param {string} chordName – nombre del acorde
   * @param {object} [opts] – opciones: { badge: string|null }
   * @returns {SVGElement}
   */
  function createDiagram(voicing, chordName, opts) {
    const options = opts || {};
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`);
    svg.setAttribute('width', totalW);
    svg.setAttribute('height', totalH);
    svg.classList.add('chord-diagram');

    // Determinar rango de trastes a mostrar
    const frettedPositions = voicing.frets.filter(f => f > 0);
    let startFret = 1;
    if (frettedPositions.length > 0) {
      startFret = Math.max(1, Math.min(...frettedPositions));
      // Ajustar para que quepa todo
      const maxFretted = Math.max(...frettedPositions);
      if (maxFretted - startFret >= FRETS_SHOWN) {
        startFret = maxFretted - FRETS_SHOWN + 1;
      }
    }
    const isOpenPosition = startFret === 1;

    // Fondo transparente — la card provee el bg
    const bg = svgEl('rect', {
      x: 0, y: 0, width: totalW, height: totalH,
      fill: 'transparent', rx: 4
    });
    svg.appendChild(bg);

    // Nombre del acorde
    const title = svgEl('text', {
      x: totalW / 2, y: 14,
      'text-anchor': 'middle', 'font-size': 13, 'font-weight': '700',
      fill: '#ffc94d', 'font-family': "'Space Grotesk', sans-serif"
    });
    title.textContent = chordName;
    svg.appendChild(title);

    // Cejuela (nut) o número de traste
    if (isOpenPosition) {
      svg.appendChild(svgEl('rect', {
        x: CFG.padLeft - 2, y: CFG.padTop - 3,
        width: (NUM_STRINGS - 1) * CFG.stringSpacing + 4, height: 5,
        fill: 'rgba(214,180,140,.45)', rx: 1
      }));
    } else {
      const fretLabel = svgEl('text', {
        x: CFG.padLeft - 12, y: CFG.padTop + CFG.fretSpacing / 2 + 4,
        'text-anchor': 'middle', 'font-size': 10, fill: '#cdb89a'
      });
      fretLabel.textContent = startFret + 'fr';
      svg.appendChild(fretLabel);
    }

    // Trastes (líneas horizontales)
    for (let f = 0; f <= FRETS_SHOWN; f++) {
      const y = CFG.padTop + f * CFG.fretSpacing;
      svg.appendChild(svgEl('line', {
        x1: CFG.padLeft, y1: y,
        x2: CFG.padLeft + (NUM_STRINGS - 1) * CFG.stringSpacing, y2: y,
        stroke: f === 0 ? 'rgba(214,180,140,.32)' : 'rgba(214,180,140,.18)',
        'stroke-width': 1
      }));
    }

    // Cuerdas (líneas verticales)
    for (let s = 0; s < NUM_STRINGS; s++) {
      const x = CFG.padLeft + s * CFG.stringSpacing;
      const sw = 1 + (NUM_STRINGS - 1 - s) * 0.18;
      svg.appendChild(svgEl('line', {
        x1: x, y1: CFG.padTop,
        x2: x, y2: CFG.padTop + FRETS_SHOWN * CFG.fretSpacing,
        stroke: 'rgba(214,180,140,.24)', 'stroke-width': sw
      }));
    }

    // Barré
    if (voicing.barre) {
      const b = voicing.barre;
      const barreY = CFG.padTop + (b.fret - startFret + 0.5) * CFG.fretSpacing;
      const x1 = CFG.padLeft + b.fromString * CFG.stringSpacing;
      const x2 = CFG.padLeft + b.toString * CFG.stringSpacing;
      svg.appendChild(svgEl('rect', {
        x: x1 - CFG.dotRadius,
        y: barreY - CFG.dotRadius * 0.7,
        width: x2 - x1 + CFG.dotRadius * 2,
        height: CFG.dotRadius * 1.4,
        fill: '#f3ece0', rx: CFG.dotRadius * 0.7,
        'pointer-events': 'none'
      }));
      // Invisible chord-dot markers per barre string (for arpeggio highlight)
      for (let bs = b.fromString; bs <= b.toString; bs++) {
        if (voicing.frets[bs] === b.fret) {
          const bx = CFG.padLeft + bs * CFG.stringSpacing;
          svg.appendChild(svgEl('circle', {
            cx: bx, cy: barreY, r: CFG.dotRadius,
            fill: 'transparent', 'pointer-events': 'none',
            'data-string': bs, 'data-midi': STANDARD_TUNING[bs] + b.fret,
            'data-type': 'chord-dot'
          }));
        }
      }
    }

    // Dots y markers por cada cuerda
    for (let s = 0; s < NUM_STRINGS; s++) {
      const x = CFG.padLeft + s * CFG.stringSpacing;
      const fret = voicing.frets[s];

      if (fret === -1) {
        // Muted (X)
        const xMark = svgEl('text', {
          x: x, y: CFG.padTop - 10,
          'text-anchor': 'middle', 'font-size': 12, 'font-weight': 'bold',
          fill: '#e0653a'
        });
        xMark.textContent = '\u00D7';
        svg.appendChild(xMark);
      } else if (fret === 0) {
        // Open (O)
        addHitArea(svg, x, CFG.padTop - 12, STANDARD_TUNING[s]);
        const openCircle = svgEl('circle', {
          cx: x, cy: CFG.padTop - 12,
          r: 5, fill: 'none', stroke: '#f3ece0', 'stroke-width': 1.5,
          'pointer-events': 'none',
          'data-string': s, 'data-midi': STANDARD_TUNING[s],
          class: 'chord-dot'
        });
        svg.appendChild(openCircle);
      } else {
        // Dot en el traste
        const y = CFG.padTop + (fret - startFret + 0.5) * CFG.fretSpacing;

        // Hit area para todas las notas (incluyendo barré)
        addHitArea(svg, x, y, STANDARD_TUNING[s] + fret);

        // Si es parte del barré, no dibujar dot individual (ya está el rect)
        if (voicing.barre && fret === voicing.barre.fret &&
            s >= voicing.barre.fromString && s <= voicing.barre.toString) {
          // Visual ya dibujado por el barré
        } else {
          const dot = svgEl('circle', {
            cx: x, cy: y, r: CFG.dotRadius,
            fill: '#f3ece0', 'pointer-events': 'none',
            'data-string': s, 'data-midi': STANDARD_TUNING[s] + fret,
            'data-type': 'chord-dot'
          });
          svg.appendChild(dot);
        }

        // Número de dedo
        if (voicing.fingers && voicing.fingers[s] > 0) {
          const fingerY = voicing.barre && fret === voicing.barre.fret
            ? CFG.padTop + (fret - startFret + 0.5) * CFG.fretSpacing
            : y;
          const fingerText = svgEl('text', {
            x: x, y: fingerY + 4,
            'text-anchor': 'middle', 'font-size': 9, 'font-weight': 'bold',
            fill: '#1a130a', 'pointer-events': 'none'
          });
          fingerText.textContent = voicing.fingers[s];
          svg.appendChild(fingerText);
        }
      }
    }

    // Nombres de notas debajo
    for (let s = 0; s < NUM_STRINGS; s++) {
      const x = CFG.padLeft + s * CFG.stringSpacing;
      const noteName = voicing.noteNames[s];
      const noteLabel = svgEl('text', {
        x: x, y: totalH - 5,
        'text-anchor': 'middle', 'font-size': 9,
        fill: noteName === 'X' ? '#e0653a' : '#9c8e79'
      });
      noteLabel.textContent = noteName;
      svg.appendChild(noteLabel);
    }

    // Tab string: ej. "x-x-0-2-3-1"
    const tabStr = voicing.frets.map(f => f === -1 ? 'x' : f).join('-');
    const tabLabel = svgEl('text', {
      x: totalW / 2, y: 27,
      'text-anchor': 'middle', 'font-size': 9, fill: '#9c8e79'
    });
    tabLabel.textContent = tabStr;
    svg.appendChild(tabLabel);

    // Badge opcional (ej. "Personal")
    if (options.badge) {
      const bw = 48, bh = 14;
      svg.appendChild(svgEl('rect', {
        x: totalW - bw - 4, y: 2, width: bw, height: bh,
        fill: '#e0653a', rx: 4
      }));
      const badgeText = svgEl('text', {
        x: totalW - bw / 2 - 4, y: 12,
        'text-anchor': 'middle', 'font-size': 8, 'font-weight': 'bold',
        fill: '#fff'
      });
      badgeText.textContent = options.badge;
      svg.appendChild(badgeText);
    }

    return svg;
  }

  function svgEl(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v);
    }
    return el;
  }

  /**
   * Crea un círculo invisible grande como hit area para facilitar taps en móvil.
   * Se inserta en el parent SVG/group ANTES del dot visible.
   */
  function addHitArea(parent, cx, cy, midi) {
    var hit = svgEl('circle', {
      cx: cx, cy: cy, r: CFG.hitRadius,
      fill: 'transparent', stroke: 'none'
    });
    hit.style.cursor = 'pointer';
    hit.addEventListener('click', function (e) {
      e.stopPropagation();
      if (window.AudioEngine) window.AudioEngine.playNote(midi);
    });
    parent.appendChild(hit);
    return hit;
  }

  /**
   * Agrega overlay de notas de escala sobre un diagrama SVG existente.
   * @param {SVGElement} svg – el SVG del diagrama
   * @param {object} voicing – el voicing del acorde
   * @param {number[]} scalePCs – pitch classes de la escala
   * @param {number[]} chordPCs – pitch classes del acorde
   * @param {object} [targetOpts] – { targetPCs, tensionPCs, avoidPCs } (Sets)
   */
  function addScaleOverlay(svg, voicing, scalePCs, chordPCs, targetOpts) {
    // Limpiar overlay previo
    svg.querySelectorAll('.scale-overlay').forEach(el => el.remove());

    if (!scalePCs || scalePCs.length === 0) return;

    const scaleSet = new Set(scalePCs);
    const chordSet = new Set(chordPCs);
    const { fretToPC, STANDARD_TUNING } = window.MusicTheory;

    // Calcular startFret (misma lógica que createDiagram)
    const frettedPositions = voicing.frets.filter(f => f > 0);
    let startFret = 1;
    if (frettedPositions.length > 0) {
      startFret = Math.max(1, Math.min(...frettedPositions));
      const maxFretted = Math.max(...frettedPositions);
      if (maxFretted - startFret >= FRETS_SHOWN) {
        startFret = maxFretted - FRETS_SHOWN + 1;
      }
    }

    // Set de posiciones ya ocupadas por el acorde (string,fret)
    const chordPositions = new Set();
    for (let s = 0; s < NUM_STRINGS; s++) {
      if (voicing.frets[s] >= 0) {
        chordPositions.add(s + ',' + voicing.frets[s]);
      }
    }

    // Grupo SVG para el overlay
    const group = svgEl('g', {});
    group.classList.add('scale-overlay');

    // Helper para determinar color/estilo según jerarquía
    function getNoteStyle(pc, isChordPos) {
      const isTarget = targetOpts && targetOpts.targetPCs && targetOpts.targetPCs.has(pc);
      const isModal = targetOpts && targetOpts.modalPCs && targetOpts.modalPCs.has(pc);
      const isTension = targetOpts && targetOpts.tensionPCs && targetOpts.tensionPCs.has(pc);
      const isAvoid = targetOpts && targetOpts.avoidPCs && targetOpts.avoidPCs.has(pc);
      const isChordTone = chordSet.has(pc);

      if (isChordPos) {
        // Nota del voicing: anillo (gold target > violeta modal > teal)
        const color = isTarget ? '#ffc94d' : isModal ? '#b58bff' : '#4abd9c';
        const width = isTarget ? 3 : isModal ? 3 : 2.5;
        return { ring: true, color, width };
      }
      if (isTarget) return { fill: '#ffc94d', opacity: 0.90, r: 6, textFill: '#1a130a' };
      if (isModal) return { fill: '#b58bff', opacity: 0.85, r: 6, textFill: '#fff' };
      if (isChordTone) return { fill: '#4abd9c', opacity: 0.85, r: 5, textFill: '#1a130a' };
      if (isTension) return { fill: '#ff9f43', opacity: 0.70, r: 5, textFill: '#1a130a' };
      if (isAvoid) return { fill: '#f08a5d', opacity: 0.35, r: 4, textFill: '#1a130a' };
      return { fill: '#4abd9c', opacity: 0.45, r: 5, textFill: '#1a130a' };
    }

    // Recorrer cuerdas y trastes visibles
    for (let s = 0; s < NUM_STRINGS; s++) {
      const x = CFG.padLeft + s * CFG.stringSpacing;

      // Traste 0 (cuerda al aire)
      if (startFret === 1) {
        const pc = fretToPC(s, 0);
        if (scaleSet.has(pc) && !chordPositions.has(s + ',0')) {
          const st = getNoteStyle(pc, false);
          addHitArea(group, x, CFG.padTop - 12, STANDARD_TUNING[s]);
          const openDot = svgEl('circle', {
            cx: x, cy: CFG.padTop - 12,
            r: Math.min(st.r, 4), fill: st.fill, opacity: st.opacity,
            'data-midi': STANDARD_TUNING[s],
            'pointer-events': 'none',
          });
          group.appendChild(openDot);
        }
      }

      for (let fret = startFret; fret < startFret + FRETS_SHOWN; fret++) {
        const pc = fretToPC(s, fret);
        if (!scaleSet.has(pc)) continue;

        const y = CFG.padTop + (fret - startFret + 0.5) * CFG.fretSpacing;
        const isChordPos = chordPositions.has(s + ',' + fret);
        const st = getNoteStyle(pc, isChordPos);

        const midi = STANDARD_TUNING[s] + fret;

        // Hit area grande para todas las notas de escala
        addHitArea(group, x, y, midi);

        if (st.ring) {
          // Nota del voicing: anillo alrededor
          const ring = svgEl('circle', {
            cx: x, cy: y,
            r: CFG.dotRadius + 3,
            fill: 'none', stroke: st.color, 'stroke-width': st.width,
            'data-midi': midi,
            'pointer-events': 'none',
          });
          group.appendChild(ring);
        } else {
          // Nota de escala: punto coloreado
          const scaleDot = svgEl('circle', {
            cx: x, cy: y, r: st.r,
            fill: st.fill, opacity: st.opacity,
            'data-midi': midi,
            'pointer-events': 'none',
          });
          group.appendChild(scaleDot);
          // Nombre de la nota
          const noteText = svgEl('text', {
            x: x, y: y + 3,
            'text-anchor': 'middle', 'font-size': 7, 'font-weight': 'bold',
            fill: st.textFill, opacity: st.opacity > 0.5 ? 1 : 0.7,
            'pointer-events': 'none',
          });
          noteText.classList.add('scale-overlay');
          noteText.textContent = window.MusicTheory.pcToName(pc);
          group.appendChild(noteText);
        }
      }
    }

    svg.appendChild(group);
  }

  /**
   * Highlight a specific string's dot in a chord diagram SVG.
   * Uses the same visual style as FullFretboardSVG.highlightNoteMidi.
   */
  function highlightString(svg, stringIndex) {
    if (!svg) return;
    var dot = svg.querySelector('[data-string="' + stringIndex + '"][data-midi]');
    if (!dot) return;
    dot.setAttribute('data-orig-fill', dot.getAttribute('fill') || '');
    dot.setAttribute('data-orig-stroke', dot.getAttribute('stroke') || '');
    dot.setAttribute('data-orig-stroke-width', dot.getAttribute('stroke-width') || '');
    dot.setAttribute('data-orig-r', dot.getAttribute('r') || '');
    dot.setAttribute('fill', '#ffc94d');
    dot.setAttribute('stroke', '#f3ece0');
    dot.setAttribute('stroke-width', '2.5');
    var origR = parseFloat(dot.getAttribute('data-orig-r')) || CFG.dotRadius;
    dot.setAttribute('r', String(origR + 3));
  }

  /**
   * Clear all arpeggio highlights from a chord diagram SVG.
   */
  function clearDiagramHighlights(svg) {
    if (!svg) return;
    var dots = svg.querySelectorAll('[data-string][data-orig-fill]');
    dots.forEach(function (dot) {
      var origFill = dot.getAttribute('data-orig-fill');
      dot.setAttribute('fill', origFill);
      dot.setAttribute('r', dot.getAttribute('data-orig-r') || String(CFG.dotRadius));
      var origStroke = dot.getAttribute('data-orig-stroke');
      if (origStroke) {
        dot.setAttribute('stroke', origStroke);
        dot.setAttribute('stroke-width', dot.getAttribute('data-orig-stroke-width') || '');
      } else {
        dot.removeAttribute('stroke');
        dot.removeAttribute('stroke-width');
      }
      dot.removeAttribute('data-orig-fill');
      dot.removeAttribute('data-orig-stroke');
      dot.removeAttribute('data-orig-stroke-width');
      dot.removeAttribute('data-orig-r');
    });
  }

  window.FretboardSVG = { createDiagram, addScaleOverlay, highlightString, clearDiagramHighlights };
})();
