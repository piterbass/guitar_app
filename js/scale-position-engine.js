// ============================================================
// scale-position-engine.js  –  Motor de posiciones de escalas
// Calcula posiciones 3NPS, pentatónicas, simétricas y bebop
// ============================================================

(function () {
  const { SCALE_FORMULAS, INTERVAL_SEMITONES, STANDARD_TUNING, fretToPC, pcToName } = window.MusicTheory;

  // ── Clasificación de familias de escalas ──────────────────

  const FAMILY_MAP = {
    // Diatónicas → 3NPS 7 posiciones
    'major': 'diatonic', 'dorian': 'diatonic', 'phrygian': 'diatonic',
    'lydian': 'diatonic', 'mixolydian': 'diatonic', 'aeolian': 'diatonic',
    'locrian': 'diatonic',
    // Menor armónica y modos
    'harmonic-minor': 'diatonic', 'locrian-nat6': 'diatonic',
    'ionian-sharp5': 'diatonic', 'dorian-sharp4': 'diatonic',
    'phrygian-dominant': 'diatonic', 'lydian-sharp2': 'diatonic',
    // Armónica mayor y exóticas de 7 notas
    'harmonic-major': 'diatonic', 'double-harmonic': 'diatonic',

    // Menor melódica y modos → 3NPS 7 posiciones
    'melodic-minor': 'melodic-minor', 'dorian-b2': 'melodic-minor',
    'lydian-augmented': 'melodic-minor', 'lydian-dominant': 'melodic-minor',
    'mixolydian-b6': 'melodic-minor', 'locrian-nat2': 'melodic-minor',
    'altered': 'melodic-minor',

    // Pentatónicas → 5 boxes
    'pentatonic-major': 'pentatonic', 'pentatonic-minor': 'pentatonic',
    'in-sen': 'pentatonic', 'hirajoshi': 'pentatonic',

    // Blues → 5 boxes
    'blues': 'blues', 'blues-major': 'blues',

    // Simétricas → patrones trasladables
    'whole-tone': 'symmetric', 'diminished': 'symmetric',
    'half-whole-dim': 'symmetric', 'augmented': 'symmetric',

    // Bebop → diapasón completo
    'bebop-dominant': 'bebop', 'bebop-major': 'bebop',
    'bebop-dorian': 'bebop', 'bebop-melodic-minor': 'bebop',
  };

  const FAMILY_CONFIG = {
    'diatonic':      { positionSystem: '3nps', positionCount: 7 },
    'melodic-minor': { positionSystem: '3nps', positionCount: 7 },
    'pentatonic':    { positionSystem: 'pentatonic', positionCount: 5 },
    'blues':         { positionSystem: 'blues-box', positionCount: 5 },
    'symmetric':     { positionSystem: 'symmetric', positionCount: null },
    'bebop':         { positionSystem: 'full', positionCount: 1 },
  };

  /**
   * Clasifica una escala por familia y sistema posicional.
   */
  function classifyScale(scaleKey) {
    const family = FAMILY_MAP[scaleKey] || 'diatonic';
    const config = FAMILY_CONFIG[family] || FAMILY_CONFIG['diatonic'];
    return { family, ...config };
  }

  // ── Helpers ───────────────────────────────────────────────

  /**
   * Encuentra el traste más bajo en una cuerda que produce un pitch class dado,
   * dentro de un rango de trastes.
   */
  function findFretsForPC(stringIdx, targetPc, minFret, maxFret) {
    const openMidi = STANDARD_TUNING[stringIdx];
    const openPc = openMidi % 12;
    let baseFret = ((targetPc - openPc) % 12 + 12) % 12;
    const results = [];
    for (let f = baseFret; f <= maxFret; f += 12) {
      if (f >= minFret) results.push(f);
    }
    return results;
  }

  /**
   * Encuentra el traste óptimo para un PC en una cuerda,
   * buscando cercanía al centro de una posición.
   */
  function bestFretForPC(stringIdx, targetPc, centerFret, maxSpread) {
    const openMidi = STANDARD_TUNING[stringIdx];
    const openPc = openMidi % 12;
    let baseFret = ((targetPc - openPc) % 12 + 12) % 12;

    const candidates = [];
    for (let f = baseFret; f <= 24; f += 12) {
      candidates.push(f);
    }
    // También incluir traste 0 si aplica
    if (baseFret === 0) candidates.unshift(0);

    // Ordenar por cercanía al centro
    candidates.sort((a, b) => Math.abs(a - centerFret) - Math.abs(b - centerFret));

    // Elegir el más cercano dentro del spread permitido
    for (const f of candidates) {
      if (Math.abs(f - centerFret) <= maxSpread) return f;
    }
    return candidates[0] || null;
  }

  // ── Generador 3NPS ────────────────────────────────────────

  /**
   * Genera 7 posiciones 3NPS para una escala de 7 notas.
   * Cada posición asigna 3 notas consecutivas de la escala a cada cuerda.
   * Las posiciones cubren todo el diapasón desde traste 0 hacia arriba.
   */
  function generate3NPSPositions(rootPc, scaleKey) {
    const formula = SCALE_FORMULAS[scaleKey];
    if (!formula || formula.length < 6) return generateFullPosition(rootPc, scaleKey);

    const semitones = formula.map(iv => INTERVAL_SEMITONES[iv] || 0);
    const numDegrees = formula.length;
    const positions = [];

    for (let startDegree = 0; startDegree < numDegrees; startDegree++) {
      // Encontrar el traste más bajo en la 6ª cuerda donde cae este grado
      const firstPc = (rootPc + semitones[startDegree]) % 12;
      const openPc6 = STANDARD_TUNING[0] % 12;
      const startFret = ((firstPc - openPc6) % 12 + 12) % 12;
      const centerFret = startFret + 2;

      const noteData = [];

      // Asignar 3 notas por cuerda
      for (let stringIdx = 0; stringIdx < 6; stringIdx++) {
        const degreeOffset = startDegree + stringIdx * 3;

        for (let n = 0; n < 3; n++) {
          const degree = (degreeOffset + n) % numDegrees;
          const targetPc = (rootPc + semitones[degree]) % 12;

          const fret = bestFretForPC(stringIdx, targetPc, centerFret, 6);
          if (fret === null || fret > 24) continue;

          noteData.push({
            string: stringIdx,
            fret: fret,
            midi: STANDARD_TUNING[stringIdx] + fret,
            pc: targetPc,
            interval: formula[degree],
            isRoot: degree === 0,
            isTriad: degree === 0 || degree === 2 || degree === 4,
          });
        }
      }

      // Calcular rango de trastes (incluir traste 0)
      const allFrets = noteData.map(n => n.fret);
      const fretRange = allFrets.length > 0
        ? [Math.min(...allFrets), Math.max(...allFrets)]
        : [0, 4];

      positions.push({ index: startDegree, label: '', fretRange, noteData });
    }

    // Ordenar posiciones por traste más bajo → progresión natural por el mástil
    positions.sort((a, b) => a.fretRange[0] - b.fretRange[0]);

    // Re-indexar y etiquetar
    const rootPositionIdx = positions.findIndex(p =>
      p.noteData.some(n => n.isRoot && n.string === 0)
    );
    positions.forEach((p, i) => {
      p.index = i;
      p.label = `Pos ${i + 1}`;
    });
    if (rootPositionIdx >= 0) {
      positions[rootPositionIdx].label += ' (Raíz)';
    }

    return positions;
  }

  // ── Generador Pentatónico (5 boxes) ───────────────────────

  /**
   * Genera 5 posiciones box para escalas pentatónicas (5 notas).
   * Cada posición cubre un rango de ~4 trastes con 2 notas por cuerda.
   */
  function generatePentatonicPositions(rootPc, scaleKey) {
    const formula = SCALE_FORMULAS[scaleKey];
    if (!formula || formula.length < 4) return generateFullPosition(rootPc, scaleKey);

    const semitones = formula.map(iv => INTERVAL_SEMITONES[iv] || 0);
    const numDegrees = formula.length;
    const positions = [];

    for (let startDegree = 0; startDegree < numDegrees; startDegree++) {
      const position = {
        index: startDegree,
        label: `Box ${startDegree + 1}`,
        fretRange: [0, 0],
        noteData: [],
      };

      // Encontrar traste de inicio en la 6ª cuerda
      const firstPc = (rootPc + semitones[startDegree % numDegrees]) % 12;
      const openPc6 = STANDARD_TUNING[0] % 12;
      let startFret = ((firstPc - openPc6) % 12 + 12) % 12;
      const centerFret = startFret + 2;

      // 2 notas por cuerda para pentatónicas
      for (let stringIdx = 0; stringIdx < 6; stringIdx++) {
        const degreeOffset = startDegree + stringIdx * 2;

        for (let n = 0; n < 2; n++) {
          const degree = (degreeOffset + n) % numDegrees;
          const semitoneFromRoot = semitones[degree];
          const targetPc = (rootPc + semitoneFromRoot) % 12;

          const fret = bestFretForPC(stringIdx, targetPc, centerFret, 5);
          if (fret === null || fret > 24) continue;

          const midi = STANDARD_TUNING[stringIdx] + fret;

          position.noteData.push({
            string: stringIdx,
            fret: fret,
            midi: midi,
            pc: targetPc,
            interval: formula[degree],
            isRoot: degree === 0,
            isTriad: degree === 0 || degree === 2 || degree === 4,
          });
        }
      }

      const allFrets = position.noteData.map(n => n.fret);
      if (allFrets.length > 0) {
        position.fretRange = [Math.min(...allFrets), Math.max(...allFrets)];
      } else {
        position.fretRange = [0, 4];
      }

      positions.push(position);
    }

    positions.sort((a, b) => a.fretRange[0] - b.fretRange[0]);
    const rootIdx = positions.findIndex(p =>
      p.noteData.some(n => n.isRoot && n.string === 0)
    );
    positions.forEach((p, i) => {
      p.index = i;
      p.label = `Box ${i + 1}`;
    });
    if (rootIdx >= 0) positions[rootIdx].label += ' (Raíz)';

    return positions;
  }

  // ── Generador Blues (5 boxes) ─────────────────────────────

  /**
   * Blues: mismo esquema que pentatónico pero con la blue note extra.
   * Usa 2-3 notas por cuerda según necesidad.
   */
  function generateBluesPositions(rootPc, scaleKey) {
    const formula = SCALE_FORMULAS[scaleKey];
    if (!formula) return generateFullPosition(rootPc, scaleKey);

    const semitones = formula.map(iv => INTERVAL_SEMITONES[iv] || 0);
    // Blues tiene 6 notas. Generar 5 posiciones tipo box.
    const positions = [];

    for (let startDeg = 0; startDeg < 5; startDeg++) {
      const position = {
        index: startDeg,
        label: `Box ${startDeg + 1}`,
        fretRange: [0, 0],
        noteData: [],
      };

      // Determinar centro basado en la nota de inicio
      const firstPc = (rootPc + semitones[startDeg % semitones.length]) % 12;
      const openPc6 = STANDARD_TUNING[0] % 12;
      let startFret = ((firstPc - openPc6) % 12 + 12) % 12;
      const minF = Math.max(0, startFret - 1);
      const maxF = startFret + 4;

      // Para cada cuerda, encontrar las notas de la escala en el rango
      for (let stringIdx = 0; stringIdx < 6; stringIdx++) {
        for (let deg = 0; deg < semitones.length; deg++) {
          const targetPc = (rootPc + semitones[deg]) % 12;
          const frets = findFretsForPC(stringIdx, targetPc, minF, maxF);
          for (const fret of frets) {
            const midi = STANDARD_TUNING[stringIdx] + fret;
            position.noteData.push({
              string: stringIdx,
              fret: fret,
              midi: midi,
              pc: targetPc,
              interval: formula[deg],
              isRoot: deg === 0,
              isTriad: deg === 0 || deg === 2 || deg === 4,
            });
          }
        }
      }

      // Eliminar duplicados (misma cuerda + traste)
      const seen = new Set();
      position.noteData = position.noteData.filter(n => {
        const key = n.string + ',' + n.fret;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Ordenar por cuerda, luego por traste
      position.noteData.sort((a, b) => a.string - b.string || a.fret - b.fret);

      const allFrets = position.noteData.map(n => n.fret);
      if (allFrets.length > 0) {
        position.fretRange = [Math.min(...allFrets), Math.max(...allFrets)];
      } else {
        position.fretRange = [0, 4];
      }

      positions.push(position);
    }

    positions.sort((a, b) => a.fretRange[0] - b.fretRange[0]);
    const rootIdx = positions.findIndex(p =>
      p.noteData.some(n => n.isRoot && n.string === 0)
    );
    positions.forEach((p, i) => {
      p.index = i;
      p.label = `Box ${i + 1}`;
    });
    if (rootIdx >= 0) positions[rootIdx].label += ' (Raíz)';

    return positions;
  }

  // ── Generador Simétrico ───────────────────────────────────

  /**
   * Genera posiciones para escalas simétricas (patrones trasladables).
   * El patrón se repite cada N trastes según la simetría.
   */
  function generateSymmetricPositions(rootPc, scaleKey) {
    const formula = SCALE_FORMULAS[scaleKey];
    if (!formula) return generateFullPosition(rootPc, scaleKey);

    const semitones = formula.map(iv => INTERVAL_SEMITONES[iv] || 0);

    // Determinar intervalo de repetición
    let repeatInterval;
    switch (scaleKey) {
      case 'whole-tone': repeatInterval = 2; break;
      case 'diminished': case 'half-whole-dim': repeatInterval = 3; break;
      case 'augmented': repeatInterval = 4; break;
      default: repeatInterval = 3; break;
    }

    // Generar posiciones como ventanas de 4-5 trastes, desplazadas por el repeatInterval
    const positions = [];
    const numPositions = Math.min(4, Math.ceil(12 / repeatInterval));

    for (let p = 0; p < numPositions; p++) {
      const baseOffset = p * repeatInterval;
      const minFret = baseOffset;
      const maxFret = baseOffset + 4;

      const position = {
        index: p,
        label: `Patrón ${p + 1}`,
        fretRange: [minFret, maxFret],
        noteData: [],
      };

      for (let stringIdx = 0; stringIdx < 6; stringIdx++) {
        for (let deg = 0; deg < semitones.length; deg++) {
          const targetPc = (rootPc + semitones[deg]) % 12;
          const frets = findFretsForPC(stringIdx, targetPc, minFret, maxFret);
          for (const fret of frets) {
            const midi = STANDARD_TUNING[stringIdx] + fret;
            position.noteData.push({
              string: stringIdx,
              fret: fret,
              midi: midi,
              pc: targetPc,
              interval: formula[deg],
              isRoot: deg === 0,
              isTriad: deg === 0 || deg === 2 || deg === 4,
            });
          }
        }
      }

      // Eliminar duplicados
      const seen = new Set();
      position.noteData = position.noteData.filter(n => {
        const key = n.string + ',' + n.fret;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      position.noteData.sort((a, b) => a.string - b.string || a.fret - b.fret);

      if (position.noteData.length > 0) {
        positions.push(position);
      }
    }

    positions.forEach((p, i) => { p.index = i; });
    return positions;
  }

  // ── Generador Full (fallback) ─────────────────────────────

  /**
   * Genera una única "posición" que cubre todo el diapasón.
   * Usado para bebop y escalas sin sistema posicional definido.
   */
  function generateFullPosition(rootPc, scaleKey) {
    const formula = SCALE_FORMULAS[scaleKey];
    if (!formula) return [];

    const semitones = formula.map(iv => INTERVAL_SEMITONES[iv] || 0);
    const position = {
      index: 0,
      label: 'Diapasón completo',
      fretRange: [0, 22],
      noteData: [],
    };

    for (let stringIdx = 0; stringIdx < 6; stringIdx++) {
      for (let fret = 0; fret <= 22; fret++) {
        const pc = fretToPC(stringIdx, fret);
        const degIdx = semitones.findIndex(s => (rootPc + s) % 12 === pc);
        if (degIdx === -1) continue;

        const midi = STANDARD_TUNING[stringIdx] + fret;
        position.noteData.push({
          string: stringIdx,
          fret: fret,
          midi: midi,
          pc: pc,
          interval: formula[degIdx],
          isRoot: degIdx === 0,
          isTriad: degIdx === 0 || degIdx === 2 || (degIdx === 4 && formula.length > 4),
        });
      }
    }

    position.noteData.sort((a, b) => a.string - b.string || a.fret - b.fret);
    return [position];
  }

  // ── Extensión de posiciones a octavas superiores ─────────

  /**
   * Duplica posiciones desplazadas +12 trastes para cubrir el mástil completo.
   * Filtra posiciones que exceden traste 22 y re-indexa.
   */
  function extendPositionsUpNeck(positions, labelPrefix) {
    if (!positions || positions.length === 0) return positions;

    // No extender posiciones que ya cubren todo el diapasón
    if (positions.length === 1 && positions[0].fretRange[1] >= 20) return positions;

    const extended = [...positions];

    // Clonar cada posición desplazada +12 trastes
    for (const pos of positions) {
      const shiftedNotes = [];
      for (const n of pos.noteData) {
        const newFret = n.fret + 12;
        if (newFret > 22) continue;
        shiftedNotes.push({
          ...n,
          fret: newFret,
          midi: n.midi + 12,
        });
      }
      // Solo agregar si tiene suficientes notas (al menos 4)
      if (shiftedNotes.length < 4) continue;

      const allFrets = shiftedNotes.map(n => n.fret);
      const fretRange = [Math.min(...allFrets), Math.max(...allFrets)];

      // No agregar si se superpone demasiado con una posición existente
      const overlaps = extended.some(ep =>
        Math.abs(ep.fretRange[0] - fretRange[0]) <= 1 &&
        Math.abs(ep.fretRange[1] - fretRange[1]) <= 1
      );
      if (overlaps) continue;

      extended.push({
        index: extended.length,
        label: pos.label, // se re-etiqueta abajo
        fretRange,
        noteData: shiftedNotes,
      });
    }

    // Ordenar por traste ascendente
    extended.sort((a, b) => a.fretRange[0] - b.fretRange[0]);

    // Re-indexar y etiquetar
    const prefix = labelPrefix || 'Pos';
    const rootPositionIdx = extended.findIndex(p =>
      p.noteData.some(n => n.isRoot && n.string === 0)
    );
    extended.forEach((p, i) => {
      p.index = i;
      p.label = prefix + ' ' + (i + 1);
    });
    if (rootPositionIdx >= 0) {
      extended[rootPositionIdx].label += ' (Raíz)';
    }

    return extended;
  }

  // ── Dispatcher principal ──────────────────────────────────

  /**
   * Genera posiciones para cualquier escala.
   * Despacha al generador adecuado según la familia.
   * Extiende las posiciones para cubrir octavas superiores del mástil.
   */
  function generatePositions(rootPc, scaleKey) {
    const { positionSystem } = classifyScale(scaleKey);

    let positions;
    let labelPrefix;

    switch (positionSystem) {
      case '3nps':
        positions = generate3NPSPositions(rootPc, scaleKey);
        labelPrefix = 'Pos';
        break;
      case 'pentatonic':
        positions = generatePentatonicPositions(rootPc, scaleKey);
        labelPrefix = 'Box';
        break;
      case 'blues-box':
        positions = generateBluesPositions(rootPc, scaleKey);
        labelPrefix = 'Box';
        break;
      case 'symmetric':
        positions = generateSymmetricPositions(rootPc, scaleKey);
        labelPrefix = 'Patrón';
        break;
      case 'full':
        return generateFullPosition(rootPc, scaleKey);
      default:
        return generateFullPosition(rootPc, scaleKey);
    }

    return extendPositionsUpNeck(positions, labelPrefix);
  }

  // ── Etiquetas de familia (español) ────────────────────────

  function getScaleFamilyLabel(scaleKey) {
    const family = FAMILY_MAP[scaleKey];
    switch (family) {
      case 'diatonic': return 'Diatónica';
      case 'melodic-minor': return 'Menor melódica';
      case 'pentatonic': return 'Pentatónica';
      case 'blues': return 'Blues';
      case 'symmetric': return 'Simétrica';
      case 'bebop': return 'Bebop';
      default: return 'Otra';
    }
  }

  function getPositionSystemLabel(scaleKey) {
    const { positionSystem } = classifyScale(scaleKey);
    switch (positionSystem) {
      case '3nps': return '3NPS';
      case 'pentatonic': return 'Box';
      case 'blues-box': return 'Box';
      case 'symmetric': return 'Patrón simétrico';
      case 'full': return 'Completo';
      default: return '';
    }
  }

  window.ScalePositionEngine = {
    classifyScale,
    generatePositions,
    getScaleFamilyLabel,
    getPositionSystemLabel,
  };
})();
