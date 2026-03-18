// ============================================================
// chord-parser.js  –  Parser de nombres de acordes
// ============================================================

(function () {
  const { NOTE_TO_PC, CHORD_FORMULAS, INTERVAL_SEMITONES, intervalsToPC } = window.MusicTheory;

  // Calidades ordenadas de más larga a más corta para longest-match
  const QUALITIES = Object.keys(CHORD_FORMULAS).sort((a, b) => b.length - a.length);

  /**
   * Parsea un string de acorde como "Dm7/11", "Cmaj9", "G7#5/B"
   * @param {string} input
   * @returns {object|null} { name, root, rootPc, quality, bass, bassPc, intervals, pitchClasses, noteNames }
   */
  function parseChord(input) {
    if (!input || !input.trim()) return null;
    let s = input.trim();

    // 1. Extraer raíz (A-G seguido opcionalmente de # o b)
    const rootMatch = s.match(/^([A-Ga-g])([#b]?)/);
    if (!rootMatch) return null;

    const rootLetter = rootMatch[1].toUpperCase();
    const rootAcc = rootMatch[2];
    const rootName = rootLetter + rootAcc;
    const rootPc = NOTE_TO_PC[rootName];
    if (rootPc === undefined) return null;

    s = s.slice(rootMatch[0].length);

    // 2. Extraer slash bass (al final)
    let bass = null;
    let bassPc = null;
    const slashMatch = s.match(/\/([A-Ga-g][#b]?)$/);
    if (slashMatch) {
      const bassName = slashMatch[1][0].toUpperCase() + slashMatch[1].slice(1);
      bassPc = NOTE_TO_PC[bassName];
      if (bassPc !== undefined) {
        bass = bassName;
        s = s.slice(0, -slashMatch[0].length);
      }
    }

    // 3. Buscar calidad base (longest match)
    let quality = 'maj'; // default
    let qualityMatch = '';
    for (const q of QUALITIES) {
      if (s.startsWith(q)) {
        quality = q;
        qualityMatch = q;
        break;
      }
    }
    // Caso especial: si no matchea nada y empieza con 'm' solo, es minor
    if (!qualityMatch && s.startsWith('m') && !s.startsWith('ma')) {
      quality = 'm';
      qualityMatch = 'm';
    }
    s = s.slice(qualityMatch.length);

    // 4. Extraer alteraciones adicionales del resto (ej. "b5", "#11", "add9")
    const extraIntervals = [];
    const removeIntervals = [];
    const alterationRegex = /([#b]?\d+|add\d+)/g;
    let altMatch;
    while ((altMatch = alterationRegex.exec(s)) !== null) {
      const alt = altMatch[1];
      if (alt.startsWith('add')) {
        const num = alt.slice(3);
        if (INTERVAL_SEMITONES[num] !== undefined) {
          extraIntervals.push(num);
        }
      } else if (INTERVAL_SEMITONES[alt] !== undefined) {
        // Si es una alteración como #5, b5, reemplaza el intervalo natural
        const baseNum = alt.replace(/[#b]/g, '');
        if (alt.startsWith('#') || alt.startsWith('b')) {
          removeIntervals.push(baseNum);
        }
        extraIntervals.push(alt);
      }
    }

    // 5. Construir intervalos finales
    const baseFormula = CHORD_FORMULAS[quality];
    if (!baseFormula) return null;

    let intervals = [...baseFormula];

    // Remover intervalos naturales que son reemplazados por alteraciones
    if (removeIntervals.length > 0) {
      intervals = intervals.filter(iv => !removeIntervals.includes(iv));
    }

    // Agregar extras
    for (const extra of extraIntervals) {
      if (!intervals.includes(extra)) {
        intervals.push(extra);
      }
    }

    // 6. Calcular pitch classes
    const pitchClasses = intervalsToPC(rootPc, intervals);

    // Agregar bajo si no está ya en las pitch classes
    const allPCs = [...new Set(pitchClasses)];
    if (bassPc !== null && !allPCs.includes(bassPc)) {
      allPCs.push(bassPc);
    }

    const noteNames = allPCs.map(pc => window.MusicTheory.pcToName(pc));

    return {
      name: input.trim(),
      root: rootName,
      rootPc,
      quality,
      bass,
      bassPc,
      intervals,
      pitchClasses: allPCs,
      noteNames,
    };
  }

  /**
   * Construye un nombre de acorde desde los selectores visuales.
   */
  function buildChordName(root, quality, extensions, bass) {
    let name = root;
    if (quality && quality !== 'maj') {
      name += quality;
    }
    if (extensions && extensions.length > 0) {
      name += '(' + extensions.join(',') + ')';
    }
    if (bass) {
      name += '/' + bass;
    }
    return name;
  }

  window.ChordParser = { parseChord, buildChordName };
})();
