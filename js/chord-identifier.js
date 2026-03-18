// ============================================================
// chord-identifier.js  –  Identifica acordes a partir de notas
// ============================================================

(function () {
  const { NOTE_NAMES, CHORD_FORMULAS, INTERVAL_SEMITONES, pcToName } = window.MusicTheory;

  // Mapa inverso: semitonos (mod 12) → posibles nombres de intervalo
  // Solo incluimos intervalos que caben en una octava para identificación
  const SEMI_TO_INTERVALS = {};
  for (const [iv, semi] of Object.entries(INTERVAL_SEMITONES)) {
    const s = semi % 12;
    if (!SEMI_TO_INTERVALS[s]) SEMI_TO_INTERVALS[s] = [];
    SEMI_TO_INTERVALS[s].push(iv);
  }

  // Etiquetas legibles para intervalos
  const INTERVAL_LABELS = {
    '1': 'Raíz', 'b2': 'b2', '2': '2ª', '#2': '#2',
    'b3': 'b3', '3': '3ª', '#3': '#3',
    'b4': 'b4', '4': '4ª', '#4': '#4',
    'b5': 'b5', '5': '5ª', '#5': '#5',
    'b6': 'b6', '6': '6ª', '#6': '#6',
    'bb7': 'bb7', 'b7': 'b7', '7': '7ª',
    'b9': 'b9', '9': '9ª', '#9': '#9',
    '11': '11ª', '#11': '#11',
    'b13': 'b13', '13': '13ª',
  };

  // Nombres bonitos para las calidades
  const QUALITY_DISPLAY = {
    'maj': 'Mayor', 'm': 'Menor', 'dim': 'Disminuido', 'aug': 'Aumentado',
    'sus2': 'Sus2', 'sus4': 'Sus4',
    '7': 'Dominante 7', 'maj7': 'Major 7', 'm7': 'Menor 7',
    'mMaj7': 'Menor Maj7', 'dim7': 'Disminuido 7', 'm7b5': 'Semidisminuido',
    'aug7': 'Aumentado 7', '7sus4': '7sus4', '7sus2': '7sus2',
    '6': 'Mayor 6', 'm6': 'Menor 6',
    '9': 'Dominante 9', 'maj9': 'Major 9', 'm9': 'Menor 9',
    'add9': 'Add9', 'madd9': 'Menor add9',
    '11': 'Dominante 11', 'maj11': 'Major 11', 'm11': 'Menor 11',
    '13': 'Dominante 13', 'maj13': 'Major 13', 'm13': 'Menor 13',
    '7alt': '7 Alterado', 'alt': 'Alterado',
    '7b5': '7b5', '7#5': '7#5', '7b9': '7b9', '7#9': '7#9',
    '7#11': '7#11', '7b13': '7b13', '7b9b5': '7b9b5', '7#9#5': '7#9#5',
    '5': 'Power Chord',
  };

  // Prioridad de calidades (menor = más común/preferida)
  const QUALITY_PRIORITY = {};
  const orderedQualities = [
    'maj', 'm', '5', 'sus4', 'sus2',
    '7', 'm7', 'maj7', 'dim', 'aug', '6', 'm6',
    'dim7', 'm7b5', 'mMaj7', 'aug7', '7sus4', '7sus2',
    '9', 'm9', 'maj9', 'add9', 'madd9',
    '11', 'm11', 'maj11',
    '13', 'm13', 'maj13',
    '7b5', '7#5', '7b9', '7#9', '7#11', '7b13',
    '7b9b5', '7#9#5', '7alt', 'alt',
  ];
  orderedQualities.forEach((q, i) => { QUALITY_PRIORITY[q] = i; });

  /**
   * Convierte los semitonos de una fórmula a pitch classes mod 12.
   */
  function formulaToSemitoneSet(formula) {
    const set = new Set();
    for (const iv of formula) {
      set.add((INTERVAL_SEMITONES[iv] || 0) % 12);
    }
    return set;
  }

  /**
   * Identifica posibles acordes a partir de un conjunto de pitch classes.
   * @param {number[]} pitchClasses – pitch classes seleccionadas (0-11)
   * @param {number|null} bassPC – pitch class de la nota más grave (opcional)
   * @returns {object[]} resultados ordenados por score descendente
   */
  function identifyChord(pitchClasses, bassPC) {
    if (!pitchClasses || pitchClasses.length < 2) return [];

    const uniquePCs = [...new Set(pitchClasses.map(pc => ((pc % 12) + 12) % 12))];
    const inputSet = new Set(uniquePCs);
    const results = [];

    // Probar cada nota como posible raíz
    for (const candidateRoot of uniquePCs) {
      // Calcular semitonos relativos a esta raíz
      const relativeSemitones = new Set();
      for (const pc of uniquePCs) {
        relativeSemitones.add(((pc - candidateRoot) % 12 + 12) % 12);
      }

      // Probar cada fórmula de acorde
      for (const [quality, formula] of Object.entries(CHORD_FORMULAS)) {
        const formulaSet = formulaToSemitoneSet(formula);

        let matchType = null;
        let missingCount = 0;
        let extraSemitones = [];

        // Contar cuántas notas de la fórmula están presentes
        let formulaPresent = 0;
        let formulaMissing = [];
        for (const semi of formulaSet) {
          if (relativeSemitones.has(semi)) {
            formulaPresent++;
          } else {
            formulaMissing.push(semi);
            missingCount++;
          }
        }

        // Notas extras (en input pero no en fórmula)
        for (const semi of relativeSemitones) {
          if (!formulaSet.has(semi)) {
            extraSemitones.push(semi);
          }
        }

        // Clasificar match
        if (extraSemitones.length === 0 && missingCount === 0) {
          matchType = 'exact';
        } else if (extraSemitones.length === 0 && missingCount > 0) {
          // Subset: input es subconjunto de la fórmula (notas omitidas)
          // Solo aceptar si al menos raíz + otra nota están presentes
          if (formulaPresent >= 2 && relativeSemitones.has(0)) {
            matchType = 'subset';
          }
        } else if (missingCount === 0 && extraSemitones.length > 0) {
          // Superset: todas las notas de la fórmula presentes + extras
          matchType = 'extended';
        } else if (formulaPresent >= formula.length - 1 && extraSemitones.length <= 2) {
          // Casi completo: falta máximo 1 nota y hay pocas extras
          // Común en guitarra: omitir la 5ª
          const missing5th = formulaMissing.length === 1 && formulaMissing[0] === 7;
          if (missing5th || (formulaPresent >= 3 && missingCount <= 1)) {
            matchType = 'partial';
          }
        }

        if (!matchType) continue;

        // Calcular score
        let score = 0;

        // Base por tipo de match
        if (matchType === 'exact') score += 100;
        else if (matchType === 'subset') score += 60 - missingCount * 12;
        else if (matchType === 'extended') score += 80 - extraSemitones.length * 8;
        else if (matchType === 'partial') score += 65 - missingCount * 10 - extraSemitones.length * 8;

        // Bonus si raíz = bajo
        if (bassPC !== null && bassPC !== undefined) {
          const bassMod = ((bassPC % 12) + 12) % 12;
          if (bassMod === candidateRoot) score += 25;
          else score -= 10; // inversión
        }

        // Preferir calidades más simples/comunes
        const priority = QUALITY_PRIORITY[quality] !== undefined ? QUALITY_PRIORITY[quality] : 30;
        score -= priority * 0.5;

        // Penalizar 5ª omitida menos que otras omisiones
        if (matchType === 'subset' || matchType === 'partial') {
          const has5thMissing = formulaMissing.includes(7);
          if (has5thMissing && formulaMissing.length === 1) {
            score += 8; // recuperar algo del penalty, omitir 5ª es muy normal
          }
        }

        // ¿El acorde tiene 7ª? → preferir nombres compuestos (9,11,13 en vez de 2,4,6)
        const has7th = formula.some(iv => iv === 'b7' || iv === '7' || iv === 'bb7');

        // Elige el mejor nombre de intervalo para un semitono dado
        function pickIntervalName(semi, isExtra) {
          const candidates = SEMI_TO_INTERVALS[semi];
          if (!candidates) return null;
          // Si está en la fórmula, usar ese nombre
          const inFormula = candidates.find(iv => formula.includes(iv));
          if (inFormula) return inFormula;
          // Para extensiones: preferir compuestos (9,11,13) si hay 7ª
          if (isExtra || has7th) {
            const compound = candidates.find(iv => /^[#b]?(9|11|13)$/.test(iv));
            if (compound) return compound;
          }
          return candidates[0];
        }

        // Construir intervalos encontrados
        const intervalsFound = [];
        for (const semi of [...relativeSemitones].sort((a, b) => a - b)) {
          const name = pickIntervalName(semi, false);
          if (name) intervalsFound.push(name);
        }

        // Construir nombre
        const rootName = pcToName(candidateRoot);
        let chordName = rootName;
        if (quality !== 'maj') chordName += quality;

        // Extra extensions en paréntesis
        const extraIntervalNames = [];
        for (const semi of extraSemitones) {
          const name = pickIntervalName(semi, true);
          if (name) extraIntervalNames.push(name);
        }
        if (extraIntervalNames.length > 0) {
          chordName += '(' + extraIntervalNames.join(',') + ')';
        }

        // Slash notation si es inversión
        const isInversion = bassPC !== null && bassPC !== undefined &&
          ((bassPC % 12 + 12) % 12) !== candidateRoot;
        let slashName = chordName;
        if (isInversion) {
          slashName = chordName + '/' + pcToName(((bassPC % 12) + 12) % 12);
        }

        results.push({
          name: isInversion ? slashName : chordName,
          displayName: slashName,
          root: rootName,
          rootPc: candidateRoot,
          quality,
          qualityDisplay: QUALITY_DISPLAY[quality] || quality,
          intervals: intervalsFound,
          intervalLabels: intervalsFound.map(iv => INTERVAL_LABELS[iv] || iv),
          noteNames: uniquePCs.map(pc => pcToName(pc)),
          isInversion,
          matchType,
          score,
        });
      }
    }

    // Deduplicar por nombre
    const seen = new Set();
    const unique = [];
    for (const r of results.sort((a, b) => b.score - a.score)) {
      if (!seen.has(r.name)) {
        seen.add(r.name);
        unique.push(r);
      }
    }

    return unique.slice(0, 12); // top 12 resultados
  }

  window.ChordIdentifier = { identifyChord, INTERVAL_LABELS, QUALITY_DISPLAY };
})();
