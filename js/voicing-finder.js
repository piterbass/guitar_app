// ============================================================
// voicing-finder.js  –  Encuentra voicings de acordes en guitarra
// ============================================================

(function () {
  const { STANDARD_TUNING, fretToPC } = window.MusicTheory;

  const MAX_FRET = 15;
  const MAX_SPAN = 4;       // máximo estiramiento de dedos
  const MAX_RESULTS = 40;    // resultados devueltos
  const SEARCH_LIMIT = 5000; // límite interno (explorar ampliamente, devolver mejores)
  const NUM_STRINGS = 6;

  /**
   * Encuentra todos los voicings posibles para un acorde parseado.
   * @param {object} chord – resultado de ChordParser.parseChord()
   * @param {object} [opts] – opciones de filtrado
   * @param {number} [opts.minFret] – traste mínimo de posición (inclusive)
   * @param {number} [opts.maxFret] – traste máximo de posición (inclusive)
   * @returns {object[]} array de voicings
   */
  function findVoicings(chord, opts) {
    if (!chord || !chord.pitchClasses || chord.pitchClasses.length === 0) return [];

    const options = opts || {};
    const filterMin = typeof options.minFret === 'number' ? options.minFret : null;
    const filterMax = typeof options.maxFret === 'number' ? options.maxFret : null;
    const hasFilter = filterMin !== null;

    const targetPCs = new Set(chord.pitchClasses);
    const results = [];

    // Pre-calcular para cada cuerda, qué trastes producen notas del acorde
    const validFrets = [];
    for (let str = 0; str < NUM_STRINGS; str++) {
      const frets = [-1]; // -1 = muted
      for (let fret = 0; fret <= MAX_FRET; fret++) {
        if (targetPCs.has(fretToPC(str, fret))) {
          frets.push(fret);
        }
      }
      validFrets.push(frets);
    }

    // DFS por las 6 cuerdas
    function dfs(stringIdx, voicing) {
      if (results.length >= SEARCH_LIMIT) return;

      if (stringIdx === NUM_STRINGS) {
        const v = validateAndScore(voicing, chord, hasFilter, filterMin, filterMax);
        if (v) results.push(v);
        return;
      }

      for (const fret of validFrets[stringIdx]) {
        voicing[stringIdx] = fret;

        // Poda temprana: verificar span
        if (!checkSpan(voicing, stringIdx)) {
          voicing[stringIdx] = -1;
          continue;
        }

        // Poda: no más de 3 cuerdas muteadas totales
        const muted = voicing.slice(0, stringIdx + 1).filter(f => f === -1).length;
        if (muted > 3) {
          voicing[stringIdx] = -1;
          continue;
        }

        dfs(stringIdx + 1, voicing);
      }
      voicing[stringIdx] = -1;
    }

    dfs(0, new Array(NUM_STRINGS).fill(-1));

    // Ordenar por score descendente y devolver los mejores
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, MAX_RESULTS);
  }

  /**
   * Verifica que el span de trastes pulsados no exceda MAX_SPAN.
   */
  function checkSpan(voicing, upTo) {
    let minFret = Infinity, maxFret = -Infinity;
    for (let i = 0; i <= upTo; i++) {
      if (voicing[i] > 0) { // ignorar muted (-1) y aire (0)
        minFret = Math.min(minFret, voicing[i]);
        maxFret = Math.max(maxFret, voicing[i]);
      }
    }
    if (minFret === Infinity) return true; // todo abierto o muted
    return (maxFret - minFret) < MAX_SPAN;
  }

  /**
   * Valida un voicing completo y calcula su score.
   */
  function validateAndScore(frets, chord, hasFilter, filterMin, filterMax) {
    const targetPCs = chord.pitchClasses;

    // Recolectar notas tocadas
    const playedPCs = [];
    const playedFrets = [];
    let lowestNote = null;

    for (let str = 0; str < NUM_STRINGS; str++) {
      if (frets[str] === -1) continue;
      const pc = fretToPC(str, frets[str]);
      playedPCs.push(pc);
      playedFrets.push(frets[str]);
      if (lowestNote === null) {
        lowestNote = { pc, midi: STANDARD_TUNING[str] + frets[str] };
      }
    }

    // Debe tener al menos 3 notas
    if (playedPCs.length < 3) return null;

    // Verificar cuerdas muteadas en medio (no más de 1 muted entre notas)
    let gapCount = 0;
    let foundFirst = false;
    let foundLast = false;
    for (let i = 0; i < NUM_STRINGS; i++) {
      if (frets[i] !== -1) {
        if (foundLast) return null; // nota después de gap largo
        foundFirst = true;
        gapCount = 0;
      } else if (foundFirst) {
        gapCount++;
        if (gapCount > 1) foundLast = true;
      }
    }
    // Permitir mutes solo al inicio (cuerdas graves) o con max 1 gap
    if (foundLast) {
      // Verificar si hay notas después del gap
      let hasNoteAfter = false;
      for (let i = NUM_STRINGS - 1; i >= 0; i--) {
        if (frets[i] !== -1) { hasNoteAfter = true; break; }
      }
      if (hasNoteAfter) return null;
    }

    // Todas las notas pulsadas deben ser del acorde
    const targetSet = new Set(targetPCs);
    for (const pc of playedPCs) {
      if (!targetSet.has(pc)) return null;
    }

    // Verificar cobertura: al menos la raíz y la tercera (o sus equivalentes)
    const uniquePlayed = new Set(playedPCs);
    let coverage = 0;
    for (const pc of targetPCs) {
      if (uniquePlayed.has(pc)) coverage++;
    }
    // Necesita al menos el 50% de las notas del acorde (mínimo 2)
    const minCoverage = Math.max(2, Math.ceil(targetPCs.length * 0.5));
    if (coverage < minCoverage) return null;

    // Si hay bass slash, verificar
    if (chord.bassPc !== null && lowestNote && lowestNote.pc !== chord.bassPc) {
      return null;
    }

    // Calcular posición (traste más bajo pulsado)
    const minF = Math.min(...playedFrets.filter(f => f > 0), Infinity);
    const maxF = Math.max(...playedFrets.filter(f => f > 0), -Infinity);
    const span = minF === Infinity ? 0 : maxF - minF;
    const position = minF === Infinity ? 0 : minF;

    // Filtrar por rango de posición si se especificó
    if (hasFilter) {
      if (position < filterMin || position > filterMax) return null;
    }

    // Calcular score
    let score = 0;

    // +20 por cada nota del acorde cubierta
    score += coverage * 20;

    // +15 si la raíz está en el bajo
    if (lowestNote && lowestNote.pc === chord.rootPc) score += 15;

    // +10 si incluye la raíz
    if (uniquePlayed.has(chord.rootPc)) score += 10;

    // Preferir posiciones bajas (solo cuando no hay filtro de posición)
    if (!hasFilter) {
      const avgFret = playedFrets.reduce((a, b) => a + b, 0) / playedFrets.length;
      score += Math.max(0, 15 - avgFret);
    }

    // Preferir más cuerdas tocadas
    score += playedPCs.length * 5;

    // Preferir menor span
    score += (4 - span) * 3;

    // Detectar barré
    const barre = detectBarre(frets);

    // Sugerir dedos
    const fingers = suggestFingers(frets, barre);

    return {
      frets: [...frets],
      notes: frets.map((f, i) => f === -1 ? null : fretToPC(i, f)),
      noteNames: frets.map((f, i) => f === -1 ? 'X' : window.MusicTheory.pcToName(fretToPC(i, f))),
      score,
      barre,
      fingers,
      span,
      position,
    };
  }

  /**
   * Detecta si hay barré (cejilla).
   */
  function detectBarre(frets) {
    const fretted = [];
    for (let i = 0; i < NUM_STRINGS; i++) {
      if (frets[i] > 0) fretted.push({ string: i, fret: frets[i] });
    }
    if (fretted.length < 2) return null;

    // Buscar el traste más bajo con 2+ cuerdas
    const minFret = Math.min(...fretted.map(f => f.fret));
    const atMin = fretted.filter(f => f.fret === minFret);
    if (atMin.length >= 2) {
      const strings = atMin.map(f => f.string).sort((a, b) => a - b);
      // Verificar que son consecutivas o cubren un rango
      const from = strings[0];
      const to = strings[strings.length - 1];
      // Es barré si cubre al menos 2 cuerdas y no hay gaps en el medio que estén muteados
      let isBarre = true;
      for (let s = from; s <= to; s++) {
        if (frets[s] === -1) { isBarre = false; break; }
      }
      if (isBarre) {
        return { fret: minFret, fromString: from, toString: to };
      }
    }
    return null;
  }

  /**
   * Sugiere digitación (1=índice, 2=medio, 3=anular, 4=meñique).
   */
  function suggestFingers(frets, barre) {
    const fingers = new Array(NUM_STRINGS).fill(0); // 0 = no pulsado

    const fretted = [];
    for (let i = 0; i < NUM_STRINGS; i++) {
      if (frets[i] > 0) fretted.push({ string: i, fret: frets[i] });
    }
    if (fretted.length === 0) return fingers;

    if (barre) {
      // El índice (1) hace la cejilla
      for (let s = barre.fromString; s <= barre.toString; s++) {
        if (frets[s] === barre.fret) fingers[s] = 1;
      }
      // Asignar dedos restantes a trastes superiores
      const remaining = fretted.filter(f => f.fret > barre.fret)
        .sort((a, b) => a.fret - b.fret || a.string - b.string);
      let nextFinger = 2;
      for (const f of remaining) {
        if (nextFinger <= 4) {
          fingers[f.string] = nextFinger++;
        }
      }
    } else {
      // Sin barré: asignar dedos de grave a agudo, traste bajo a alto
      const sorted = [...fretted].sort((a, b) => a.fret - b.fret || a.string - b.string);
      let nextFinger = 1;
      for (const f of sorted) {
        if (nextFinger <= 4) {
          fingers[f.string] = nextFinger++;
        }
      }
    }

    return fingers;
  }

  window.VoicingFinder = { findVoicings, detectBarre, suggestFingers };
})();
