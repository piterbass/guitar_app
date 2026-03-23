// ============================================================
// harmonic-context.js  –  Contexto armónico para escalas
// ============================================================

(function () {

  // Mapa: función armónica × familia de acorde → escalas recomendadas/alternativas
  const FUNCTION_SCALE_MAP = {
    'tonica': {
      'maj7':  { recommended: ['major', 'lydian', 'pentatonic-major'], alternatives: ['bebop-major'] },
      'm7':    { recommended: ['aeolian', 'dorian', 'pentatonic-minor'], alternatives: ['melodic-minor', 'harmonic-minor'] },
      'mMaj7': { recommended: ['melodic-minor', 'harmonic-minor'], alternatives: [] },
      '6':     { recommended: ['major', 'pentatonic-major'], alternatives: ['lydian'] },
      'm6':    { recommended: ['dorian', 'melodic-minor'], alternatives: ['aeolian'] },
      '7':     { recommended: ['mixolydian'], alternatives: ['blues', 'pentatonic-minor'] },
      'm7b5':  { recommended: ['locrian', 'locrian-nat2'], alternatives: [] },
      'dim7':  { recommended: ['half-whole-dim', 'diminished'], alternatives: [] },
      '7sus4': { recommended: ['mixolydian'], alternatives: ['dorian', 'pentatonic-minor'] },
      '7alt':  { recommended: ['altered'], alternatives: ['whole-tone'] },
    },
    'subdominante': {
      'maj7':  { recommended: ['lydian'], alternatives: ['major', 'lydian-augmented'] },
      'm7':    { recommended: ['dorian'], alternatives: ['aeolian', 'pentatonic-minor'] },
      '7':     { recommended: ['lydian-dominant'], alternatives: ['mixolydian'] },
      'm7b5':  { recommended: ['locrian-nat2'], alternatives: ['locrian'] },
      'mMaj7': { recommended: ['melodic-minor'], alternatives: ['harmonic-minor'] },
      '6':     { recommended: ['lydian'], alternatives: ['major'] },
      'm6':    { recommended: ['dorian'], alternatives: ['melodic-minor'] },
      'dim7':  { recommended: ['diminished'], alternatives: ['half-whole-dim'] },
      '7sus4': { recommended: ['mixolydian'], alternatives: ['dorian'] },
      '7alt':  { recommended: ['altered'], alternatives: ['whole-tone'] },
    },
    'dominante': {
      '7':     { recommended: ['mixolydian', 'altered', 'lydian-dominant', 'half-whole-dim'],
                 alternatives: ['whole-tone', 'mixolydian-b6', 'phrygian-dominant', 'bebop-dominant'] },
      '7alt':  { recommended: ['altered'], alternatives: ['whole-tone', 'half-whole-dim'] },
      'dim7':  { recommended: ['half-whole-dim', 'diminished'], alternatives: [] },
      '7sus4': { recommended: ['mixolydian'], alternatives: ['dorian', 'pentatonic-minor'] },
      'maj7':  { recommended: ['lydian'], alternatives: ['major'] },
      'm7':    { recommended: ['dorian', 'phrygian'], alternatives: ['aeolian'] },
      'm7b5':  { recommended: ['locrian-nat2', 'locrian'], alternatives: [] },
      'mMaj7': { recommended: ['melodic-minor'], alternatives: ['harmonic-minor'] },
      '6':     { recommended: ['major', 'mixolydian'], alternatives: [] },
      'm6':    { recommended: ['dorian'], alternatives: ['melodic-minor'] },
    },
    'modal': {
      'm7':    { recommended: ['dorian', 'phrygian', 'aeolian'], alternatives: ['dorian-b2', 'dorian-sharp4'] },
      'maj7':  { recommended: ['lydian', 'major', 'ionian-sharp5'], alternatives: [] },
      '7':     { recommended: ['mixolydian', 'lydian-dominant', 'mixolydian-b6'], alternatives: ['phrygian-dominant'] },
      '7sus4': { recommended: ['mixolydian', 'dorian'], alternatives: [] },
      'm7b5':  { recommended: ['locrian', 'locrian-nat2', 'locrian-nat6'], alternatives: [] },
      'dim7':  { recommended: ['half-whole-dim', 'diminished'], alternatives: [] },
      'mMaj7': { recommended: ['melodic-minor', 'harmonic-minor'], alternatives: [] },
      '6':     { recommended: ['major', 'lydian'], alternatives: [] },
      'm6':    { recommended: ['dorian', 'melodic-minor'], alternatives: [] },
      '7alt':  { recommended: ['altered'], alternatives: ['whole-tone'] },
    },
    'secundario': {
      '7':     { recommended: ['mixolydian', 'lydian-dominant', 'altered'], alternatives: ['half-whole-dim', 'whole-tone', 'phrygian-dominant'] },
      'm7':    { recommended: ['dorian'], alternatives: ['aeolian', 'phrygian'] },
      'dim7':  { recommended: ['half-whole-dim'], alternatives: ['diminished'] },
      'm7b5':  { recommended: ['locrian-nat2', 'locrian'], alternatives: [] },
      'maj7':  { recommended: ['lydian'], alternatives: ['major'] },
      'mMaj7': { recommended: ['melodic-minor'], alternatives: [] },
      '6':     { recommended: ['major'], alternatives: ['lydian'] },
      'm6':    { recommended: ['dorian'], alternatives: [] },
      '7sus4': { recommended: ['mixolydian'], alternatives: ['dorian'] },
      '7alt':  { recommended: ['altered'], alternatives: ['whole-tone'] },
    },
  };

  /**
   * Mapea una calidad de acorde a su familia para el lookup de funciones.
   */
  function qualityFamily(quality) {
    const map = {
      'maj': 'maj7', 'maj7': 'maj7', 'maj9': 'maj7', 'maj11': 'maj7', 'maj13': 'maj7',
      'add9': 'maj7', 'aug': 'maj7', 'sus2': 'maj7', 'sus4': 'maj7', '5': 'maj7',
      '6': '6',
      'm': 'm7', 'm7': 'm7', 'm9': 'm7', 'm11': 'm7', 'm13': 'm7', 'madd9': 'm7',
      'm6': 'm6',
      'mMaj7': 'mMaj7',
      '7': '7', '9': '7', '11': '7', '13': '7',
      '7b5': '7', '7#5': '7', '7b9': '7', '7#9': '7', '7#11': '7', '7b13': '7',
      '7b9b5': '7', '7#9#5': '7', 'aug7': '7',
      '7alt': '7alt', 'alt': '7alt',
      '7sus4': '7sus4', '7sus2': '7sus4',
      'm7b5': 'm7b5',
      'dim7': 'dim7', 'dim': 'dim7',
    };
    return map[quality] || '7';
  }

  /**
   * Categoriza escalas compatibles según función armónica.
   * @param {object[]} compatibleScales – output de findCompatibleScales
   * @param {string} harmonicFunction – 'tonica'|'subdominante'|'dominante'|'modal'|'secundario'
   * @param {string} chordQuality – calidad del acorde
   * @param {number} chordRootPc – pitch class de la raíz
   * @returns {{ recommended: object[], alternatives: object[], outside: object[] }}
   */
  function categorizeByFunction(compatibleScales, harmonicFunction, chordQuality, chordRootPc) {
    const family = qualityFamily(chordQuality);
    const funcMap = FUNCTION_SCALE_MAP[harmonicFunction];
    const qualityMap = (funcMap && funcMap[family]) || { recommended: [], alternatives: [] };

    const recSet = new Set(qualityMap.recommended);
    const altSet = new Set(qualityMap.alternatives);

    const recommended = [];
    const alternatives = [];
    const outside = [];

    for (const scale of compatibleScales) {
      const isChordRoot = scale.root === chordRootPc;

      if (isChordRoot && recSet.has(scale.scaleKey)) {
        recommended.push(scale);
      } else if (isChordRoot && altSet.has(scale.scaleKey)) {
        alternatives.push(scale);
      } else if (!isChordRoot && recSet.has(scale.scaleKey)) {
        alternatives.push(scale);
      } else {
        outside.push(scale);
      }
    }

    // Ordenar recomendadas según prioridad del mapa
    const recOrder = qualityMap.recommended;
    recommended.sort((a, b) => recOrder.indexOf(a.scaleKey) - recOrder.indexOf(b.scaleKey));

    return { recommended, alternatives, outside };
  }

  // ── Análisis armónico contextual ──────────────────────────

  // Acordes diatónicos de la escala mayor (grados I-VII)
  // Cada grado tiene: calidad esperada, función armónica, modo diatónico
  var DIATONIC_DEGREES = [
    { degree: 'I',   families: ['maj7', '6'],   func: 'tonica',       mode: 'major' },
    { degree: 'ii',  families: ['m7', 'm6'],     func: 'subdominante', mode: 'dorian' },
    { degree: 'iii', families: ['m7'],           func: 'tonica',       mode: 'phrygian' },
    { degree: 'IV',  families: ['maj7', '6'],    func: 'subdominante', mode: 'lydian' },
    { degree: 'V',   families: ['7', '7sus4'],   func: 'dominante',    mode: 'mixolydian' },
    { degree: 'vi',  families: ['m7', 'm6'],     func: 'tonica',       mode: 'aeolian' },
    { degree: 'vii', families: ['m7b5', 'dim7'], func: 'dominante',    mode: 'locrian' },
  ];

  // Intervalos en semitonos de cada grado de la escala mayor
  var MAJOR_DEGREE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

  // Acordes diatónicos de la escala menor armónica (para manejar V7 en menor)
  var HARMONIC_MINOR_DEGREES = [
    { degree: 'i',    families: ['m7', 'mMaj7', 'm6'], func: 'tonica',       mode: 'harmonic-minor' },
    { degree: 'ii°',  families: ['m7b5'],               func: 'subdominante', mode: 'locrian-nat6' },
    { degree: 'III+', families: ['maj7'],                func: 'tonica',       mode: 'ionian-sharp5' },
    { degree: 'iv',   families: ['m7'],                  func: 'subdominante', mode: 'dorian-sharp4' },
    { degree: 'V',    families: ['7'],                   func: 'dominante',    mode: 'phrygian-dominant' },
    { degree: 'VI',   families: ['maj7'],                func: 'subdominante', mode: 'lydian-sharp2' },
    { degree: 'vii°', families: ['dim7'],                func: 'dominante',    mode: 'locrian' },
  ];

  var MINOR_DEGREE_SEMITONES = [0, 2, 3, 5, 7, 8, 11]; // menor armónica

  /**
   * Detecta el centro tonal más probable de una progresión de acordes.
   * Prueba las 12 tonalidades mayores y 12 menores, scoring cada una.
   *
   * @param {string[]} chordNames - nombres de acordes ["Gm7", "Cm7", "F7"]
   * @returns {{ rootPc: number, rootName: string, mode: string, score: number,
   *             analysis: Array<{chord, degree, func, suggestedMode}> }}
   */
  function detectKeyCenter(chordNames) {
    var Parser = window.ChordParser;
    var MT = window.MusicTheory;
    if (!Parser || !MT) return null;

    // Parsear todos los acordes
    var parsedChords = [];
    for (var i = 0; i < chordNames.length; i++) {
      var p = Parser.parseChord(chordNames[i]);
      if (p) {
        parsedChords.push({ name: chordNames[i], rootPc: p.rootPc, quality: p.quality, family: qualityFamily(p.quality), pitchClasses: p.pitchClasses });
      } else {
        parsedChords.push({ name: chordNames[i], rootPc: -1, quality: '', family: '', pitchClasses: [] });
      }
    }

    var bestResult = null;
    var bestScore = -1;

    // Probar las 12 tonalidades mayores
    for (var root = 0; root < 12; root++) {
      var result = scoreKey(root, 'major', parsedChords, MT);
      if (result.score > bestScore) {
        bestScore = result.score;
        bestResult = result;
      }
    }

    // Probar las 12 tonalidades menores (armónica)
    for (var root = 0; root < 12; root++) {
      var result = scoreKey(root, 'minor', parsedChords, MT);
      if (result.score > bestScore) {
        bestScore = result.score;
        bestResult = result;
      }
    }

    return bestResult;
  }

  /**
   * Puntúa qué tan bien una tonalidad explica una progresión de acordes.
   */
  function scoreKey(keyRoot, keyMode, parsedChords, MT) {
    var degrees = keyMode === 'major' ? DIATONIC_DEGREES : HARMONIC_MINOR_DEGREES;
    var semitones = keyMode === 'major' ? MAJOR_DEGREE_SEMITONES : MINOR_DEGREE_SEMITONES;
    var scalePCs = MT.getScalePCs(keyRoot, keyMode === 'major' ? 'major' : 'harmonic-minor');

    var totalScore = 0;
    var analysis = [];

    for (var i = 0; i < parsedChords.length; i++) {
      var chord = parsedChords[i];
      if (chord.rootPc < 0) {
        analysis.push({ chord: chord.name, degree: '?', func: 'tonica', suggestedMode: 'major', score: 0 });
        continue;
      }

      // ¿La raíz del acorde es un grado diatónico?
      var interval = ((chord.rootPc - keyRoot) + 12) % 12;
      var degreeIdx = semitones.indexOf(interval);

      if (degreeIdx >= 0) {
        var degreeInfo = degrees[degreeIdx];
        var chordScore = 3; // Raíz es diatónica

        // ¿La calidad del acorde coincide con lo esperado?
        if (degreeInfo.families.indexOf(chord.family) >= 0) {
          chordScore += 5; // Calidad diatónica correcta
        } else if (isSecondaryDominant(chord, degreeIdx, keyRoot, semitones)) {
          // Dominante secundario (V7/X)
          chordScore += 3;
          analysis.push({
            chord: chord.name,
            degree: 'V/' + degrees[(degreeIdx + 1) % 7].degree,
            func: 'secundario',
            suggestedMode: getSuggestedModeForSecondary(chord),
            score: chordScore,
          });
          totalScore += chordScore;
          continue;
        } else {
          chordScore += 1; // Raíz diatónica pero calidad inesperada (intercambio modal, etc.)
        }

        // Bonus: ¿las notas del acorde encajan en la escala?
        var notesInScale = 0;
        for (var n = 0; n < chord.pitchClasses.length; n++) {
          if (scalePCs.indexOf(chord.pitchClasses[n]) >= 0) notesInScale++;
        }
        chordScore += notesInScale;

        // Bonus peso posicional: primer y último acorde pesan más
        if (i === 0 || i === parsedChords.length - 1) chordScore += 2;

        // Bonus: si el acorde es I o i en esta tonalidad
        if (degreeIdx === 0) chordScore += 2;

        // Bonus: progresión ii-V o iv-V
        if (i > 0) {
          var prevChord = parsedChords[i - 1];
          var prevInterval = ((prevChord.rootPc - keyRoot) + 12) % 12;
          var prevDegreeIdx = semitones.indexOf(prevInterval);
          // ii → V o iv → V
          if (degreeIdx === 4 && (prevDegreeIdx === 1 || prevDegreeIdx === 3)) chordScore += 3;
          // V → I
          if (degreeIdx === 0 && prevDegreeIdx === 4) chordScore += 3;
        }

        analysis.push({
          chord: chord.name,
          degree: degreeInfo.degree,
          func: degreeInfo.func,
          suggestedMode: degreeInfo.mode,
          score: chordScore,
        });
        totalScore += chordScore;
      } else {
        // Raíz no diatónica — acorde cromático o de intercambio modal
        var chromaticScore = 0;
        // Aún así puede tener notas en la escala
        for (var n = 0; n < chord.pitchClasses.length; n++) {
          if (scalePCs.indexOf(chord.pitchClasses[n]) >= 0) chromaticScore++;
        }
        // Detectar bVII, bIII, bVI (intercambio modal común)
        var modalInfo = detectModalInterchange(interval, chord, keyMode);
        analysis.push({
          chord: chord.name,
          degree: modalInfo ? modalInfo.degree : 'N/A',
          func: modalInfo ? modalInfo.func : 'modal',
          suggestedMode: modalInfo ? modalInfo.suggestedMode : getBestModeForQuality(chord.family),
          score: chromaticScore,
        });
        totalScore += chromaticScore;
      }
    }

    return {
      rootPc: keyRoot,
      rootName: MT.pcToName(keyRoot),
      mode: keyMode,
      score: totalScore,
      analysis: analysis,
    };
  }

  /**
   * Detecta si un acorde es dominante secundario (V7 de algún grado).
   */
  function isSecondaryDominant(chord, degreeIdx, keyRoot, semitones) {
    // Un dominante secundario es un acorde de tipo 7 cuya raíz está
    // una 5ta justa arriba de algún grado diatónico
    if (chord.family !== '7' && chord.family !== '7alt') return false;
    // El siguiente grado (destino de resolución)
    var targetDegreeIdx = (degreeIdx) % 7;
    // No contar V/I como secundario — es el V primario
    if (targetDegreeIdx === 0 && degreeIdx === 4) return false;
    return true;
  }

  function getSuggestedModeForSecondary(chord) {
    if (chord.family === '7alt') return 'altered';
    if (chord.family === '7') return 'mixolydian';
    return 'mixolydian';
  }

  /**
   * Detecta acordes de intercambio modal comunes.
   */
  function detectModalInterchange(interval, chord, keyMode) {
    if (keyMode === 'major') {
      // bVII7 (10 semitonos) — del modo mixolydian/aeolian
      if (interval === 10 && (chord.family === '7' || chord.family === 'maj7')) {
        return { degree: 'bVII', func: 'subdominante', suggestedMode: 'mixolydian' };
      }
      // bIII (3 semitonos) — del modo aeolian
      if (interval === 3 && chord.family === 'maj7') {
        return { degree: 'bIII', func: 'tonica', suggestedMode: 'lydian' };
      }
      // bVI (8 semitonos) — del modo aeolian
      if (interval === 8 && chord.family === 'maj7') {
        return { degree: 'bVI', func: 'subdominante', suggestedMode: 'lydian' };
      }
      // iv menor (5 semitonos, m7) — intercambio modal clásico
      if (interval === 5 && (chord.family === 'm7' || chord.family === 'm6')) {
        return { degree: 'iv', func: 'subdominante', suggestedMode: 'dorian' };
      }
    }
    return null;
  }

  /**
   * Modo por defecto cuando no podemos determinar función.
   */
  function getBestModeForQuality(family) {
    var defaults = {
      'maj7': 'lydian', 'm7': 'dorian', '7': 'mixolydian', '7alt': 'altered',
      'm7b5': 'locrian-nat2', 'dim7': 'half-whole-dim', 'mMaj7': 'melodic-minor',
      '6': 'major', 'm6': 'dorian', '7sus4': 'mixolydian',
    };
    return defaults[family] || 'major';
  }

  /**
   * Sugiere la mejor escala para cada acorde de una progresión,
   * usando análisis armónico contextual.
   *
   * @param {string[]} chordNames - ["Gm7", "Cm7", "F7"]
   * @returns {{ key: {rootPc, rootName, mode}, chordScales: Array<{rootPc, scaleKey, degree, func}> }}
   */
  function suggestScalesForProgression(chordNames) {
    var Parser = window.ChordParser;
    var keyInfo = detectKeyCenter(chordNames);

    if (!keyInfo || keyInfo.score <= 0) {
      // Fallback: sugerencia sin contexto
      return {
        key: null,
        chordScales: chordNames.map(function (ch) {
          var parsed = Parser ? Parser.parseChord(ch) : null;
          var family = parsed ? qualityFamily(parsed.quality) : 'maj7';
          return {
            rootPc: parsed ? parsed.rootPc : 0,
            scaleKey: getBestModeForQuality(family),
            degree: '?',
            func: 'tonica',
          };
        }),
      };
    }

    var chordScales = keyInfo.analysis.map(function (a) {
      var parsed = Parser ? Parser.parseChord(a.chord) : null;
      var rootPc = parsed ? parsed.rootPc : 0;
      var family = parsed ? qualityFamily(parsed.quality) : 'maj7';

      // Usar el modo sugerido por el análisis diatónico
      var scaleKey = a.suggestedMode;

      // Refinar: si la función armónica tiene mejores opciones en FUNCTION_SCALE_MAP
      var funcMap = FUNCTION_SCALE_MAP[a.func];
      if (funcMap && funcMap[family]) {
        var recommended = funcMap[a.func === 'dominante' ? family : family];
        if (funcMap[family]) {
          // Verificar que el modo sugerido está en las recomendaciones
          var recList = funcMap[family].recommended;
          if (recList.indexOf(scaleKey) < 0 && recList.length > 0) {
            // El modo diatónico puro no está en las recomendaciones:
            // priorizar el modo diatónico igualmente (es la opción más "inside")
            // pero solo si es una escala válida
            var MT = window.MusicTheory;
            if (MT && MT.SCALE_FORMULAS && !MT.SCALE_FORMULAS[scaleKey]) {
              scaleKey = recList[0]; // fallback si el modo no existe
            }
          }
        }
      }

      return {
        rootPc: rootPc,
        scaleKey: scaleKey,
        degree: a.degree,
        func: a.func,
      };
    });

    return {
      key: { rootPc: keyInfo.rootPc, rootName: keyInfo.rootName, mode: keyInfo.mode },
      chordScales: chordScales,
    };
  }

  window.HarmonicContext = {
    categorizeByFunction,
    FUNCTION_SCALE_MAP,
    qualityFamily,
    detectKeyCenter,
    suggestScalesForProgression,
    DIATONIC_DEGREES,
  };
})();
