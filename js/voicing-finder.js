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
    const category = options.category || 'common';

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
        const v = validateAndScore(voicing, chord, hasFilter, filterMin, filterMax, category);
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
  function validateAndScore(frets, chord, hasFilter, filterMin, filterMax, category) {
    const targetPCs = chord.pitchClasses;

    // Recolectar notas tocadas
    const playedPCs = [];
    const playedFrets = [];
    const midiNotes = [];
    let lowestNote = null;

    for (let str = 0; str < NUM_STRINGS; str++) {
      if (frets[str] === -1) continue;
      const pc = fretToPC(str, frets[str]);
      playedPCs.push(pc);
      playedFrets.push(frets[str]);
      midiNotes.push(STANDARD_TUNING[str] + frets[str]);
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

    // Computar datos para scoring por categoría
    const adjacentIntervals = [];
    for (let i = 1; i < midiNotes.length; i++) {
      adjacentIntervals.push(midiNotes[i] - midiNotes[i - 1]);
    }

    const chordIntervals = chord.intervals || [];
    const thirdPc = chordIntervals.includes('3')
      ? (chord.rootPc + 4) % 12
      : chordIntervals.includes('b3')
        ? (chord.rootPc + 3) % 12
        : null;
    const seventhPc = chordIntervals.includes('7')
      ? (chord.rootPc + 11) % 12
      : chordIntervals.includes('b7')
        ? (chord.rootPc + 10) % 12
        : chordIntervals.includes('bb7')
          ? (chord.rootPc + 9) % 12
          : null;
    const has3rd = thirdPc !== null && uniquePlayed.has(thirdPc);
    const has7th = seventhPc !== null && uniquePlayed.has(seventhPc);

    const rootInBass = !!(lowestNote && lowestNote.pc === chord.rootPc);
    const hasRoot = uniquePlayed.has(chord.rootPc);
    const avgFret = playedFrets.reduce((a, b) => a + b, 0) / playedFrets.length;

    // Calcular score según categoría
    const score = scoreByCategory(category, {
      coverage, rootInBass, hasRoot, avgFret,
      stringCount: playedPCs.length, span, adjacentIntervals,
      has3rd, has7th, hasFilter, uniquePCCount: uniquePlayed.size,
    });

    // Detectar barré
    const barre = detectBarre(frets);

    // Rechazar voicings anatómicamente imposibles:
    // Si hay cejilla, ninguna cuerda dentro del rango puede tener un traste
    // menor que la cejilla (incluyendo traste 0 / al aire)
    if (barre) {
      for (let s = barre.fromString; s <= barre.toString; s++) {
        if (frets[s] >= 0 && frets[s] < barre.fret) return null;
      }
    }

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
   * Calcula score según la categoría de voicing seleccionada.
   */
  function scoreByCategory(cat, d) {
    switch (cat) {
      case 'shell': {
        // Shell voicings: requiere 3ra y 7ma, pocas cuerdas
        if (!d.has3rd || !d.has7th) return -100;
        let s = 40;
        if (d.hasRoot) s += 5;
        s += d.stringCount <= 4 ? 20 : -(d.stringCount - 4) * 10;
        s += (4 - d.span) * 3;
        if (!d.hasFilter) s += Math.max(0, 10 - d.avgFret);
        return s;
      }
      case 'rootless': {
        // Sin fundamental: penaliza presencia de raíz
        let s = d.coverage * 15;
        if (d.hasRoot) s -= 30;
        if (d.rootInBass) s -= 50;
        if (d.has3rd) s += 15;
        if (d.has7th) s += 15;
        s += d.stringCount * 3;
        s += (4 - d.span) * 3;
        if (!d.hasFilter) s += Math.max(0, 10 - d.avgFret);
        return s;
      }
      case 'quartal': {
        // Voicings cuartales: premia intervalos de 4ta justa
        let s = d.coverage * 10;
        for (const iv of d.adjacentIntervals) {
          if (iv === 5) s += 15;           // 4ta justa
          else if (iv === 6) s += 8;       // tritono
          else if (iv === 4 || iv === 7) s += 3; // 3ra mayor / 5ta justa
          else s -= 5;
        }
        s += d.stringCount * 3;
        if (!d.hasFilter) s += Math.max(0, 10 - d.avgFret);
        return s;
      }
      case 'drop2': {
        // Drop 2: gap grande en bajo, voces cercanas arriba, 4 cuerdas ideal
        let s = d.coverage * 10;
        s -= Math.abs(d.stringCount - 4) * 10;
        if (d.adjacentIntervals.length >= 3) {
          const bottomGap = d.adjacentIntervals[0];
          const upperIntervals = d.adjacentIntervals.slice(1);
          const upperAvg = upperIntervals.reduce((a, b) => a + b, 0) / upperIntervals.length;
          if (bottomGap >= 7 && upperAvg <= 5) s += 25;
          else if (bottomGap >= 5) s += 10;
        }
        if (d.has3rd) s += 10;
        if (d.has7th) s += 10;
        if (!d.hasFilter) s += Math.max(0, 10 - d.avgFret);
        return s;
      }
      case 'cluster': {
        // Clusters / tensiones: intervalos chicos, premia más PCs únicos
        let s = d.coverage * 10;
        for (const iv of d.adjacentIntervals) {
          if (iv <= 2) s += 12;
          else if (iv <= 4) s += 6;
          else s -= 3;
        }
        s += Math.max(0, d.uniquePCCount - 3) * 8;
        s += d.stringCount * 3;
        if (!d.hasFilter) s += Math.max(0, 10 - d.avgFret);
        return s;
      }
      case 'spread': {
        // Voicings abiertos: intervalos amplios
        let s = d.coverage * 10;
        for (const iv of d.adjacentIntervals) {
          if (iv >= 7) s += 12;
          else if (iv >= 5) s += 6;
          else s -= 5;
        }
        s += d.stringCount * 2;
        if (!d.hasFilter) s += Math.max(0, 10 - d.avgFret);
        return s;
      }
      default: {
        // common: scoring original
        let s = d.coverage * 20;
        if (d.rootInBass) s += 15;
        if (d.hasRoot) s += 10;
        if (!d.hasFilter) s += Math.max(0, 15 - d.avgFret);
        s += d.stringCount * 5;
        s += (4 - d.span) * 3;
        return s;
      }
    }
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
