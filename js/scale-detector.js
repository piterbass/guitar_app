// ============================================================
// scale-detector.js  –  Detecta escalas compatibles con un acorde
// ============================================================

(function () {
  const { NOTE_NAMES, SCALE_FORMULAS, getScalePCs, pcToName } = window.MusicTheory;

  // Labels en español para cada escala
  const SCALE_LABELS = {
    // Modos diatónicos
    'major':              'Mayor (Jónica)',
    'dorian':             'Dórica',
    'phrygian':           'Frigia',
    'lydian':             'Lidia',
    'mixolydian':         'Mixolidia',
    'aeolian':            'Eólica (menor natural)',
    'locrian':            'Locria',

    // Menor melódica y modos
    'melodic-minor':      'Menor melódica',
    'dorian-b2':          'Dórica b2 (frigia #6)',
    'lydian-augmented':   'Lidia aumentada',
    'lydian-dominant':    'Lidia dominante',
    'mixolydian-b6':      'Mixolidia b6 (hindú)',
    'locrian-nat2':       'Locria #2 (eólica b5)',
    'altered':            'Alterada (superlocria)',

    // Menor armónica y modos
    'harmonic-minor':     'Menor armónica',
    'locrian-nat6':       'Locria #6',
    'ionian-sharp5':      'Jónica #5',
    'dorian-sharp4':      'Dórica #4',
    'phrygian-dominant':  'Frigia dominante (española)',
    'lydian-sharp2':      'Lidia #2',

    // Armónica mayor
    'harmonic-major':     'Mayor armónica',

    // Pentatónicas y blues
    'pentatonic-major':   'Pentatónica mayor',
    'pentatonic-minor':   'Pentatónica menor',
    'blues':              'Blues',
    'blues-major':        'Blues mayor',

    // Simétricas
    'whole-tone':         'Tonos enteros',
    'diminished':         'Disminuida (tono-semitono)',
    'half-whole-dim':     'Disminuida dom. (semitono-tono)',
    'augmented':          'Aumentada (Coltrane)',

    // Bebop
    'bebop-dominant':     'Bebop dominante',
    'bebop-major':        'Bebop mayor',
    'bebop-dorian':       'Bebop dórica',
    'bebop-melodic-minor':'Bebop menor melódica',

    // Otras
    'double-harmonic':    'Doble armónica (bizantina)',
    'in-sen':             'In-Sen (japonesa)',
    'hirajoshi':          'Hirajoshi',
  };

  /**
   * Encuentra todas las escalas que contienen TODAS las notas del acorde.
   * @param {number[]} chordPCs – pitch classes del acorde (0-11)
   * @param {number} [chordRootPc] – pitch class de la raíz del acorde (para priorizar)
   * @returns {object[]} array de { root, rootName, scaleKey, scaleName, scalePCs, label }
   */
  function findCompatibleScales(chordPCs, chordRootPc) {
    if (!chordPCs || chordPCs.length === 0) return [];

    const chordSet = new Set(chordPCs);
    const results = [];

    for (let root = 0; root < 12; root++) {
      const rootName = NOTE_NAMES[root];

      for (const scaleKey of Object.keys(SCALE_FORMULAS)) {
        const scalePCs = getScalePCs(root, scaleKey);
        const scaleSet = new Set(scalePCs);

        // Verificar que TODAS las notas del acorde están en la escala
        let allContained = true;
        for (const pc of chordSet) {
          if (!scaleSet.has(pc)) {
            allContained = false;
            break;
          }
        }

        if (allContained) {
          results.push({
            root,
            rootName,
            scaleKey,
            scaleName: SCALE_LABELS[scaleKey] || scaleKey,
            scalePCs,
            label: rootName + ' ' + (SCALE_LABELS[scaleKey] || scaleKey),
          });
        }
      }
    }

    // Ordenar: primero las que tienen la raíz del acorde, luego por tipo de escala
    const scaleOrder = Object.keys(SCALE_FORMULAS);
    results.sort((a, b) => {
      // Priorizar raíz del acorde
      const aIsRoot = a.root === chordRootPc ? 0 : 1;
      const bIsRoot = b.root === chordRootPc ? 0 : 1;
      if (aIsRoot !== bIsRoot) return aIsRoot - bIsRoot;

      // Luego por orden de escala (modos diatónicos primero)
      const aOrder = scaleOrder.indexOf(a.scaleKey);
      const bOrder = scaleOrder.indexOf(b.scaleKey);
      if (aOrder !== bOrder) return aOrder - bOrder;

      // Luego por raíz cromática
      return a.root - b.root;
    });

    return results;
  }

  /**
   * Versión mejorada de findCompatibleScales con scoring por relevancia musical.
   * Ordena por: coincidencia de raíz, tensiones válidas, y penaliza avoid notes.
   */
  function scoredCompatibleScales(chordPCs, chordRootPc, chordIntervals) {
    const results = findCompatibleScales(chordPCs, chordRootPc);
    if (!chordIntervals) return results;

    const { INTERVAL_SEMITONES } = window.MusicTheory;
    const chordSet = new Set(chordPCs);

    // Encontrar la 3ra del acorde para detectar avoid notes
    const thirdSemitones = chordIntervals.includes('3') ? 4
      : chordIntervals.includes('b3') ? 3 : null;
    const thirdPc = thirdSemitones !== null ? (chordRootPc + thirdSemitones) % 12 : null;

    for (const scale of results) {
      const scaleSet = new Set(scale.scalePCs);
      let fitScore = chordPCs.length * 10;

      // Bonus raíz coincidente
      if (scale.root === chordRootPc) fitScore += 20;

      // Bonus por tensiones válidas disponibles en la escala
      const tensionIntervals = ['9', 'b9', '#9', '11', '#11', 'b13', '13'];
      for (const ti of tensionIntervals) {
        if (INTERVAL_SEMITONES[ti] === undefined) continue;
        const tensionPc = (chordRootPc + INTERVAL_SEMITONES[ti]) % 12;
        if (scaleSet.has(tensionPc) && !chordSet.has(tensionPc)) fitScore += 3;
      }

      // Penalizar avoid notes (semitono por encima de raíz o 3ra)
      const avoidChecks = [(chordRootPc + 1) % 12];
      if (thirdPc !== null) avoidChecks.push((thirdPc + 1) % 12);
      for (const avoid of avoidChecks) {
        if (scaleSet.has(avoid) && !chordSet.has(avoid)) fitScore -= 5;
      }

      scale.fitScore = fitScore;
    }

    results.sort((a, b) => b.fitScore - a.fitScore);
    return results;
  }

  window.ScaleDetector = { findCompatibleScales, scoredCompatibleScales, SCALE_LABELS };
})();
