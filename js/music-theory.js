// ============================================================
// music-theory.js  –  Notas, intervalos y fórmulas de acordes
// ============================================================

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Mapa de nombre de nota → pitch class (0-11)
const NOTE_TO_PC = {};
const ENHARMONIC = {
  'Cb': 'B', 'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#',
  'Ab': 'G#', 'Bb': 'A#', 'B#': 'C', 'E#': 'F',
};
NOTE_NAMES.forEach((n, i) => { NOTE_TO_PC[n] = i; });
Object.entries(ENHARMONIC).forEach(([k, v]) => { NOTE_TO_PC[k] = NOTE_TO_PC[v]; });

// Mapa de intervalo → semitonos
const INTERVAL_SEMITONES = {
  '1': 0, 'b2': 1, '2': 2, '#2': 3,
  'b3': 3, '3': 4, '#3': 5,
  'b4': 4, '4': 5, '#4': 6,
  'b5': 6, '5': 7, '#5': 8,
  'b6': 8, '6': 9, '#6': 10,
  'bb7': 9, 'b7': 10, '7': 11,
  'b9': 13, '9': 14, '#9': 15,
  '11': 17, '#11': 18,
  'b13': 20, '13': 21,
};

// Fórmulas de acordes – cada entrada es un array de intervalos
const CHORD_FORMULAS = {
  // Triadas
  'maj':    ['1', '3', '5'],
  'm':      ['1', 'b3', '5'],
  'dim':    ['1', 'b3', 'b5'],
  'aug':    ['1', '3', '#5'],
  'sus2':   ['1', '2', '5'],
  'sus4':   ['1', '4', '5'],

  // Séptimas
  '7':      ['1', '3', '5', 'b7'],
  'maj7':   ['1', '3', '5', '7'],
  'm7':     ['1', 'b3', '5', 'b7'],
  'mMaj7':  ['1', 'b3', '5', '7'],
  'dim7':   ['1', 'b3', 'b5', 'bb7'],
  'm7b5':   ['1', 'b3', 'b5', 'b7'],
  'aug7':   ['1', '3', '#5', 'b7'],
  '7sus4':  ['1', '4', '5', 'b7'],
  '7sus2':  ['1', '2', '5', 'b7'],

  // Sextas
  '6':      ['1', '3', '5', '6'],
  'm6':     ['1', 'b3', '5', '6'],

  // Novenas
  '9':      ['1', '3', '5', 'b7', '9'],
  'maj9':   ['1', '3', '5', '7', '9'],
  'm9':     ['1', 'b3', '5', 'b7', '9'],
  'add9':   ['1', '3', '5', '9'],
  'madd9':  ['1', 'b3', '5', '9'],

  // Oncenas
  '11':     ['1', '3', '5', 'b7', '9', '11'],
  'maj11':  ['1', '3', '5', '7', '9', '11'],
  'm11':    ['1', 'b3', '5', 'b7', '9', '11'],

  // Trecenas
  '13':     ['1', '3', '5', 'b7', '9', '13'],
  'maj13':  ['1', '3', '5', '7', '9', '13'],
  'm13':    ['1', 'b3', '5', 'b7', '9', '13'],

  // Alterados
  '7alt':   ['1', '3', 'b7', '#9', 'b13'],
  'alt':    ['1', '3', 'b7', '#9', 'b13'],
  '7b5':    ['1', '3', 'b5', 'b7'],
  '7#5':    ['1', '3', '#5', 'b7'],
  '7b9':    ['1', '3', '5', 'b7', 'b9'],
  '7#9':    ['1', '3', '5', 'b7', '#9'],
  '7#11':   ['1', '3', '5', 'b7', '#11'],
  '7b13':   ['1', '3', '5', 'b7', 'b13'],
  '7b9b5':  ['1', '3', 'b5', 'b7', 'b9'],
  '7#9#5':  ['1', '3', '#5', 'b7', '#9'],

  // Power chord
  '5':      ['1', '5'],
};

// Fórmulas de escalas – intervalos que las componen
const SCALE_FORMULAS = {
  // ── Modos diatónicos (escala mayor) ──
  'major':              ['1','2','3','4','5','6','7'],
  'dorian':             ['1','2','b3','4','5','6','b7'],
  'phrygian':           ['1','b2','b3','4','5','b6','b7'],
  'lydian':             ['1','2','3','#4','5','6','7'],
  'mixolydian':         ['1','2','3','4','5','6','b7'],
  'aeolian':            ['1','2','b3','4','5','b6','b7'],
  'locrian':            ['1','b2','b3','4','b5','b6','b7'],

  // ── Menor melódica y sus modos ──
  'melodic-minor':      ['1','2','b3','4','5','6','7'],
  'dorian-b2':          ['1','b2','b3','4','5','6','b7'],
  'lydian-augmented':   ['1','2','3','#4','#5','6','7'],
  'lydian-dominant':    ['1','2','3','#4','5','6','b7'],
  'mixolydian-b6':      ['1','2','3','4','5','b6','b7'],
  'locrian-nat2':       ['1','2','b3','4','b5','b6','b7'],
  'altered':            ['1','b2','b3','3','b5','b6','b7'],

  // ── Menor armónica y sus modos ──
  'harmonic-minor':     ['1','2','b3','4','5','b6','7'],
  'locrian-nat6':       ['1','b2','b3','4','b5','6','b7'],
  'ionian-sharp5':      ['1','2','3','4','#5','6','7'],
  'dorian-sharp4':      ['1','2','b3','#4','5','6','b7'],
  'phrygian-dominant':  ['1','b2','3','4','5','b6','b7'],
  'lydian-sharp2':      ['1','#2','3','#4','5','6','7'],

  // ── Armónica mayor ──
  'harmonic-major':     ['1','2','3','4','5','b6','7'],

  // ── Pentatónicas y blues ──
  'pentatonic-major':   ['1','2','3','5','6'],
  'pentatonic-minor':   ['1','b3','4','5','b7'],
  'blues':              ['1','b3','4','b5','5','b7'],
  'blues-major':        ['1','2','b3','3','5','6'],

  // ── Escalas simétricas ──
  'whole-tone':         ['1','2','3','#4','#5','b7'],
  'diminished':         ['1','2','b3','4','b5','b6','6','7'],
  'half-whole-dim':     ['1','b2','b3','3','b5','5','6','b7'],
  'augmented':          ['1','#2','3','5','#5','7'],

  // ── Bebop (8 notas – nota cromática de paso) ──
  'bebop-dominant':     ['1','2','3','4','5','6','b7','7'],
  'bebop-major':        ['1','2','3','4','5','#5','6','7'],
  'bebop-dorian':       ['1','2','b3','3','4','5','6','b7'],
  'bebop-melodic-minor':['1','2','b3','4','5','#5','6','7'],

  // ── Otras escalas de jazz ──
  'double-harmonic':    ['1','b2','3','4','5','b6','7'],
  'in-sen':             ['1','b2','4','5','b7'],
  'hirajoshi':          ['1','2','b3','5','b6'],
};

/**
 * Devuelve las pitch classes de una escala dada raíz y clave de escala.
 */
function getScalePCs(rootPc, scaleKey) {
  const formula = SCALE_FORMULAS[scaleKey];
  if (!formula) return [];
  return intervalsToPC(rootPc, formula);
}

/**
 * Dada una nota raíz y un array de intervalos, devuelve las pitch classes.
 * @param {number} rootPc  – pitch class de la raíz (0-11)
 * @param {string[]} intervals – ej. ['1','b3','5','b7']
 * @returns {number[]} pitch classes (0-11)
 */
function intervalsToPC(rootPc, intervals) {
  return intervals.map(iv => (rootPc + (INTERVAL_SEMITONES[iv] || 0)) % 12);
}

/**
 * Devuelve el nombre de nota para un pitch class dado.
 */
function pcToName(pc) {
  return NOTE_NAMES[((pc % 12) + 12) % 12];
}

// Afinación estándar – notas MIDI de cada cuerda al aire (6ª a 1ª)
const STANDARD_TUNING = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4
const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];

/**
 * Pitch class de una cuerda en un traste dado.
 */
function fretToPC(stringIndex, fret) {
  return (STANDARD_TUNING[stringIndex] + fret) % 12;
}

// ── Nota característica modal ──────────────────────────────

/**
 * Mapa de escala → escala de referencia para calcular nota característica.
 * null = es la referencia misma o no aplica (escalas simétricas, pentatónicas, etc.)
 */
const MODE_REFERENCE = {
  // Modos diatónicos mayores → referencia: major (jónico)
  'major': null,
  'lydian': 'major',
  'mixolydian': 'major',
  'ionian-sharp5': 'major',

  // Modos diatónicos menores → referencia: aeolian (eólico)
  'aeolian': null,
  'dorian': 'aeolian',
  'phrygian': 'aeolian',
  'locrian': 'aeolian',

  // Menor melódica y modos → referencia: aeolian
  'melodic-minor': 'aeolian',
  'dorian-b2': 'aeolian',
  'dorian-sharp4': 'aeolian',
  'locrian-nat2': 'aeolian',

  // Menor armónica y modos → referencia: aeolian
  'harmonic-minor': 'aeolian',
  'locrian-nat6': 'aeolian',

  // Modos con sonoridad mayor derivada → referencia: major
  'lydian-augmented': 'major',
  'lydian-dominant': 'major',
  'lydian-sharp2': 'major',
  'harmonic-major': 'major',
  'double-harmonic': 'major',

  // Modos dominantes alterados → referencia: mixolydian
  'phrygian-dominant': 'mixolydian',
  'altered': 'mixolydian',
  'mixolydian-b6': 'mixolydian',
  'half-whole-dim': 'mixolydian',

  // Escalas sin referencia modal → null
  'whole-tone': null,
  'diminished': null,
  'augmented': null,
  'pentatonic-major': null,
  'pentatonic-minor': null,
  'blues': null,
  'blues-major': null,
  'bebop-dominant': null,
  'bebop-major': null,
  'bebop-dorian': null,
  'bebop-melodic-minor': null,
  'in-sen': null,
  'hirajoshi': null,
};

/**
 * Calcula las pitch classes de las notas características modales.
 * Compara la escala dada con su escala de referencia y devuelve
 * las notas que están en el modo pero NO en la referencia.
 *
 * @param {number} rootPc – pitch class de la raíz (0-11)
 * @param {string} scaleKey – clave de SCALE_FORMULAS
 * @returns {number[]} pitch classes de las notas características
 */
function getModalCharacteristicPCs(rootPc, scaleKey) {
  const ref = MODE_REFERENCE[scaleKey];
  if (ref === null || ref === undefined) return [];

  const modeFormula = SCALE_FORMULAS[scaleKey];
  const refFormula = SCALE_FORMULAS[ref];
  if (!modeFormula || !refFormula) return [];

  // Convertir a sets de semitonos relativos a la raíz
  const refSemitones = new Set(refFormula.map(iv => INTERVAL_SEMITONES[iv] || 0));

  const result = [];
  for (const iv of modeFormula) {
    const semi = INTERVAL_SEMITONES[iv] || 0;
    if (!refSemitones.has(semi)) {
      result.push((rootPc + semi) % 12);
    }
  }
  return result;
}

// Exportar como global (vanilla JS)
window.MusicTheory = {
  NOTE_NAMES, NOTE_TO_PC, ENHARMONIC, INTERVAL_SEMITONES,
  CHORD_FORMULAS, SCALE_FORMULAS, STANDARD_TUNING, STRING_NAMES,
  MODE_REFERENCE,
  intervalsToPC, pcToName, fretToPC, getScalePCs, getModalCharacteristicPCs,
};
